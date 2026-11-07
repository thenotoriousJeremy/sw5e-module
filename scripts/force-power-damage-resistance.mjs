import { classifyPowercastingType } from "./power-point-cost.mjs";

/**
 * Identify if an item/activity is a Force power.
 * @param {Item5e|object|null|undefined} item
 * @param {Activity|object|null|undefined} [activity]
 * @returns {boolean}
 */
export function isForcePower(item, activity = null) {
	if ( !item ) return false;
	const school = item?.system?.school;
	if ( ["lgt", "drk", "uni"].includes(school) ) return true;
	return classifyPowercastingType(item, activity) === "force";
}

/**
 * Identify if an item/activity is a Tech power.
 * @param {Item5e|object|null|undefined} item
 * @param {Activity|object|null|undefined} [activity]
 * @returns {boolean}
 */
export function isTechPower(item, activity = null) {
	if ( !item ) return false;
	const school = item?.system?.school;
	if ( school === "tec" ) return true;
	return classifyPowercastingType(item, activity) === "tech";
}

/**
 * Check if the actor has Force damage resistance (e.g. dr.custom, or sw5e flag).
 * @param {Actor5e|object|null|undefined} actor
 * @returns {boolean}
 */
export function actorHasForceDamageResistance(actor) {
	if ( !actor ) return false;

	const flag = globalThis.foundry?.utils?.getProperty?.(actor, "flags.sw5e.dr.force")
		?? globalThis.foundry?.utils?.getProperty?.(actor, "flags.sw5e.damageResistance.force")
		?? actor?.flags?.sw5e?.dr?.force
		?? actor?.flags?.sw5e?.damageResistance?.force;
	if ( flag ) return true;

	const drCustom = actor.system?.traits?.dr?.custom ?? "";
	if ( typeof drCustom === "string" && drCustom ) {
		const tokens = drCustom.split(";").map(s => s.trim().toLowerCase());
		if ( tokens.includes("force") || tokens.includes("forcepower") || tokens.includes("force-power") ) return true;
	}

	if ( actor.system?.traits?.dr?.midi?.force || actor.system?.traits?.dr?.midi?.forcePower ) return true;

	return false;
}

/**
 * Resolve originating item from damage context.
 * @param {object[]} damages
 * @param {object} options
 * @returns {Item5e|object|null}
 */
export function resolveOriginatingItem(damages, options) {
	if ( options?.item ) return options.item;
	if ( options?.activity?.item ) return options.activity.item;

	const msg = options?.originatingMessage;
	if ( msg ) {
		const fromMsg = msg.getAssociatedItem?.() ?? msg.getAssociatedActivity?.()?.item;
		if ( fromMsg ) return fromMsg;
	}

	const cardUuid = options?.midi?.itemCardUuid;
	if ( cardUuid ) {
		const card = globalThis.fromUuidSync?.(cardUuid);
		const fromCard = card?.getAssociatedItem?.() ?? card?.getAssociatedActivity?.()?.item;
		if ( fromCard ) return fromCard;
		const workflow = globalThis.MidiQOL?.Workflow?.getWorkflow?.(cardUuid);
		if ( workflow?.item ) return workflow.item;
	}

	if ( options?.workflow?.item ) return options.workflow.item;

	return null;
}

/**
 * Check whether damage originated from a Force power.
 * @param {object[]} damages
 * @param {object} options
 * @returns {boolean}
 */
export function isDamageFromForcePower(damages, options) {
	if ( Array.isArray(damages) ) {
		for ( const d of damages ) {
			if ( d?.properties?.has?.("forcePower") || d?.properties?.has?.("force") ) return true;
		}
	}
	if ( options?.sw5e?.isForcePower === true ) return true;

	const item = resolveOriginatingItem(damages, options);
	if ( item && isForcePower(item, options?.activity) ) return true;

	return false;
}

/**
 * Check whether damage originated from a Tech power.
 * @param {object[]} damages
 * @param {object} options
 * @returns {boolean}
 */
export function isDamageFromTechPower(damages, options) {
	if ( Array.isArray(damages) ) {
		for ( const d of damages ) {
			if ( d?.properties?.has?.("techPower") || d?.properties?.has?.("tech") ) return true;
		}
	}
	if ( options?.sw5e?.isTechPower === true ) return true;

	const item = resolveOriginatingItem(damages, options);
	if ( item && isTechPower(item, options?.activity) ) return true;

	return false;
}

/**
 * Hook on dnd5e.rollDamage to tag rolls with forcePower or techPower properties.
 * @param {DamageRoll[]} rolls
 * @param {object} data
 */
function onRollDamage(rolls, data = {}) {
	const activity = data?.subject;
	const item = activity?.item;
	if ( !item || !Array.isArray(rolls) ) return;

	if ( isForcePower(item, activity) ) {
		for ( const roll of rolls ) {
			roll.options ??= {};
			roll.options.properties ??= [];
			if ( !roll.options.properties.includes("forcePower") ) roll.options.properties.push("forcePower");
			if ( !roll.options.properties.includes("force") ) roll.options.properties.push("force");
		}
	} else if ( isTechPower(item, activity) ) {
		for ( const roll of rolls ) {
			roll.options ??= {};
			roll.options.properties ??= [];
			if ( !roll.options.properties.includes("techPower") ) roll.options.properties.push("techPower");
			if ( !roll.options.properties.includes("tech") ) roll.options.properties.push("tech");
		}
	}
}

/**
 * Hook on dnd5e.calculateDamage to halve damage from Force powers on actors with Force resistance.
 * Does NOT halve damage from Tech powers.
 * @param {Actor5e} actor
 * @param {object[]} damages
 * @param {object} options
 */
export function onCalculateDamage(actor, damages, options) {
	if ( !actor || !Array.isArray(damages) || !damages.length ) return;
	if ( options?.ignore === true ) return;
	if ( options?.only === "healing" ) return;

	if ( !actorHasForceDamageResistance(actor) ) return;

	// Never resist Tech powers
	if ( isDamageFromTechPower(damages, options) ) return;

	// Must be a Force power
	if ( !isDamageFromForcePower(damages, options) ) return;

	let changed = false;
	for ( const d of damages ) {
		if ( !d || d.type === "midi-none" || d.type === "temphp" || d.type === "healing" ) continue;
		if ( Number(d.value) <= 0 ) continue;
		if ( d.active?.resistance || d.active?.sw5eForceResistance ) continue;

		const halved = Math.trunc(Number(d.value) * 0.5);
		d.value = halved;
		d.damage = halved;
		d.active ??= {};
		d.active.resistance = true;
		d.active.sw5eForceResistance = true;
		d.active.multiplier = (d.active.multiplier ?? 1) * 0.5;
		changed = true;
	}

	if ( changed ) {
		let amount = 0;
		for ( const d of damages ) {
			if ( d.active?.inlined || d.type === "temphp" || d.type === "maximum" || d.type === "midi-none" ) continue;
			amount += Number(d.value) || 0;
		}
		damages.amount = Math.max(0, Math.trunc(amount));
	}
}

/**
 * Populate Force/Tech power flags onto damage-tray target options.
 * @param {object} chatMessage
 * @param {object} options
 * @returns {object}
 */
export function applyForcePowerTargetOptions(chatMessage, options) {
	if ( !options || typeof options !== "object" ) return options;
	const item = chatMessage?.getAssociatedItem?.() ?? chatMessage?.getAssociatedActivity?.()?.item;
	if ( item ) {
		const isForce = isForcePower(item);
		const isTech = isTechPower(item);
		options.sw5e = globalThis.foundry?.utils?.mergeObject
			? globalThis.foundry.utils.mergeObject(options.sw5e ?? {}, { isForcePower: isForce, isTechPower: isTech }, { inplace: false })
			: Object.assign({}, options.sw5e ?? {}, { isForcePower: isForce, isTechPower: isTech });
	}
	return options;
}

/**
 * Wrap DamageApplicationElement.prototype.getTargetOptions for chat card preview context.
 * @param {Function} wrapped
 * @param {string} uuid
 * @returns {object}
 */
function wrapDamageApplicationGetTargetOptions(wrapped, uuid) {
	const options = wrapped.call(this, uuid) ?? { multiplier: 1 };
	return applyForcePowerTargetOptions(this.chatMessage, options);
}

function registerDamageApplicationContextWrapper() {
	const classes = [
		globalThis.dnd5e?.applications?.components?.DamageApplicationElement,
		customElements.get?.("damage-application"),
		customElements.get?.("midi-damage-application"),
		globalThis.MidiQOL?.ChatClasses?.DamageApplicationElementMidi
	].filter(Boolean);

	for ( const cls of classes ) {
		const proto = cls?.prototype;
		if ( !proto ) continue;

		if ( typeof proto.getTargetOptions === "function" && !proto.getTargetOptions._sw5eForcePowerPatched ) {
			const original = proto.getTargetOptions;
			proto.getTargetOptions = function(...args) {
				return wrapDamageApplicationGetTargetOptions.call(this, original.bind(this), ...args);
			};
			proto.getTargetOptions._sw5eForcePowerPatched = true;
		}
	}
}

/**
 * Register Force power damage resistance hooks and wrappers.
 */
export function registerForcePowerDamageResistanceHooks() {
	Hooks.on("dnd5e.rollDamage", onRollDamage);
	Hooks.on("dnd5e.calculateDamage", onCalculateDamage);

	const register = () => registerDamageApplicationContextWrapper();
	register();
	Hooks.once("setup", register);
	Hooks.once("ready", register);
	if ( globalThis.libWrapper ) {
		if ( libWrapper.ready ) register();
		else Hooks.once("libWrapper.Ready", register);
	}
}

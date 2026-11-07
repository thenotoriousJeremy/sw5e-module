import { applyConditionEffects } from "../../utils/power-conditions.mjs";

const POWER_TYPES = new Set(["spell", "sw5e-module.maneuver", "sw5e.maneuver"]);
const POWER_PACK = "sw5e-module.powers-maneuvers";

/** Compendium powers by id and by name, so the synchronous preCreate hooks can repair imported NPC powers (GM only). */
const powerCache = { byId: new Map(), byName: new Map(), ready: false };

async function loadPowerCache() {
	const pack = game.packs.get(POWER_PACK);
	if ( !pack ) return;
	for ( const doc of await pack.getDocuments() ) {
		if ( !POWER_TYPES.has(doc.type) ) continue;
		const src = doc.toObject();
		powerCache.byId.set(doc.id, src);
		if ( !powerCache.byName.has(doc.name) ) powerCache.byName.set(doc.name, src);
	}
	powerCache.ready = true;
}

function compendiumPowerFor(src) {
	if ( !powerCache.ready ) return null;
	const sourceId = src._stats?.compendiumSource ?? src.flags?.dnd5e?.sourceId ?? src.flags?.core?.sourceId ?? "";
	return powerCache.byId.get(sourceId.split(".").pop()) ?? powerCache.byName.get(src.name) ?? null;
}

/**
 * Some NPC copies of SW5E powers (in the adventure and NPC compendiums) lost the attack or save activity the power
 * needs and keep only a bare damage or utility activity, so they can't attack or force a save. Replace their
 * activities with the compendium power's, along with the effects those activities apply.
 * @param {object} src        Item source data (mutated in place).
 * @param {object} [packSrc]  The matching compendium power's source data.
 * @returns {boolean}         Whether the activities were replaced.
 */
export function repairPowerActivities(src, packSrc = compendiumPowerFor(src)) {
	if ( !packSrc || !POWER_TYPES.has(src?.type) ) return false;
	// Only copies with neither an attack nor a save are broken; a copy with a different roll is a deliberate variant
	const rolls = acts => Object.values(acts ?? {}).some(a => ["attack", "save"].includes(a?.type));
	if ( rolls(src.system?.activities) || !rolls(packSrc.system?.activities) ) return false;
	src.system.activities = foundry.utils.deepClone(packSrc.system.activities);
	const linked = new Set(Object.values(packSrc.system.activities).flatMap(a => (a?.effects ?? []).map(e => e?._id)));
	const existing = new Set((src.effects ?? []).map(e => e?._id));
	src.effects = [
		...(src.effects ?? []),
		...(packSrc.effects ?? []).filter(e => linked.has(e._id) && !existing.has(e._id)).map(e => foundry.utils.deepClone(e))
	];
	return true;
}

/**
 * Repair a power's activities if needed, then add derived condition effects unless it already carries them.
 * @param {object} src  Item source data (mutated in place).
 * @returns {boolean}   Whether anything changed.
 */
export function preparePowerSource(src) {
	if ( !POWER_TYPES.has(src?.type) ) return false;
	const repaired = repairPowerActivities(src);
	if ( (src.effects ?? []).some(e => e?.flags?.["sw5e-module"]?.derivedCondition) ) return repaired;
	return (applyConditionEffects(src).length > 0) || repaired;
}

function replacement(value) {
	return foundry.data?.operators?.ForcedReplacement?.create?.(value) ?? value;
}

/**
 * Runtime support for condition effects derived from power/maneuver text (see utils/power-conditions.mjs).
 *
 * 1. Their midi-qol OverTime repeat save writes the DC as a roll-data reference to the caster's DC, e.g.
 *    `saveDC=@powercasting.force.schools.lgt.dc`. midi-qol evaluates OverTime against the actor that has the effect
 *    (the target), so the reference is resolved from the caster when the effect is applied to an actor.
 * 2. SW5E Slowed is a levelled condition. DAE mirrors any "slowed" status as the standard Slowed status effect at
 *    level 1, so raise that status effect to the highest level granted by active derived effects.
 * 3. Powers and NPCs entering the world (compendium imports, drag and drop, adventure imports) get the same derived
 *    conditions as the SW5E powers compendium, and NPC power copies missing their attack/save activity are repaired
 *    from it, so the NPC compendiums don't need their embedded powers rewritten.
 */
export function patchDerivedConditions() {
	Hooks.once("ready", () => {
		if ( game.user.isGM ) loadPowerCache().catch(err => console.warn("SW5E | Could not cache SW5E powers:", err));
	});
	Hooks.on("preCreateItem", (item, data, options) => {
		if ( options?.sw5eSkipDerivedConditions ) return;
		const src = item.toObject();
		if ( !preparePowerSource(src) ) return;
		item.updateSource({ effects: src.effects, "system.activities": replacement(src.system.activities) });
	});
	Hooks.on("preCreateActor", (actor, data, options) => {
		if ( options?.sw5eSkipDerivedConditions ) return;
		const src = actor.toObject();
		let changed = false;
		for ( const it of src.items ?? [] ) if ( preparePowerSource(it) ) changed = true;
		// Replace rather than merge, so a repaired power drops its old damage/utility-only activity
		if ( changed ) actor.updateSource({ items: replacement(src.items) });
	});
	Hooks.on("preCreateActiveEffect", effect => {
		if ( !(effect.parent instanceof Actor) ) return;
		if ( !effect.flags?.["sw5e-module"]?.derivedCondition ) return;
		resolveOverTimeDc(effect);
	});
	Hooks.on("createActiveEffect", (effect, options, userId) => {
		if ( (userId === game.user.id) && (effect.parent instanceof Actor) ) syncSlowedLevel(effect.parent);
	});
	Hooks.on("updateActiveEffect", (effect, changes, options, userId) => {
		if ( (userId === game.user.id) && (effect.parent instanceof Actor) && ("disabled" in changes) ) syncSlowedLevel(effect.parent);
	});
}

function resolveOverTimeDc(effect) {
	const changes = foundry.utils.deepClone(effect._source.system?.changes ?? []);
	if ( !changes.some(c => (c.key === "flags.midi-qol.OverTime") && /saveDC=@/.test(String(c.value))) ) return;
	const caster = findCaster(effect);
	if ( !caster ) return;
	const rollData = caster.getRollData();
	let dirty = false;
	for ( const change of changes ) {
		if ( (change.key !== "flags.midi-qol.OverTime") || (typeof change.value !== "string") ) continue;
		change.value = change.value.replace(/saveDC=@([\w.-]+)/, (match, path) => {
			const dc = Number(foundry.utils.getProperty(rollData, path));
			if ( !Number.isFinite(dc) || (dc <= 0) ) return match;
			dirty = true;
			return `saveDC=${dc}`;
		});
	}
	if ( dirty ) effect.updateSource({ "system.changes": changes });
}

function findCaster(effect) {
	const itemUuid = effect.flags?.dae?.itemUuid ?? effect.flags?.["midi-qol"]?.castData?.itemUuid;
	const item = itemUuid ? fromUuidSync(itemUuid) : null;
	if ( item?.actor ) return item.actor;
	const origin = effect.origin ? fromUuidSync(effect.origin) : null;
	if ( origin instanceof Actor ) return origin;
	return origin?.actor ?? origin?.parent?.actor ?? null;
}

async function syncSlowedLevel(actor) {
	const wanted = actor.effects.reduce((max, e) => {
		const level = Number(e.flags?.["sw5e-module"]?.slowedLevel) || 0;
		return (e.active && level > max) ? level : max;
	}, 0);
	if ( !wanted ) return;
	const statusId = CONFIG.statusEffects.find(s => s.id === "slowed")?._id;
	const status = statusId ? actor.effects.get(statusId) : null;
	if ( !status ) return;
	const current = Number(status.system?.level) || 1;
	const target = status.flags?.dae?.autoCreated ? wanted : Math.max(current, wanted);
	// Pass originalLevel like dnd5e's own increase/decrease: without it dnd5e 6.0.6's ConditionData#_onUpdate throws
	if ( current !== target ) await status.update({ "system.level": target }, { dnd5e: { originalLevel: current } });
}

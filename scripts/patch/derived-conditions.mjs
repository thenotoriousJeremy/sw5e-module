/**
 * Runtime support for condition effects derived from power/maneuver text (see utils/power-conditions.mjs).
 *
 * 1. Their midi-qol OverTime repeat save writes the DC as a roll-data reference to the caster's DC, e.g.
 *    `saveDC=@powercasting.force.schools.lgt.dc`. midi-qol evaluates OverTime against the actor that has the effect
 *    (the target), so the reference is resolved from the caster when the effect is applied to an actor.
 * 2. SW5E Slowed is a levelled condition. DAE mirrors any "slowed" status as the standard Slowed status effect at
 *    level 1, so raise that status effect to the highest level granted by active derived effects.
 */
export function patchDerivedConditions() {
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
	if ( current !== target ) await status.update({ "system.level": target });
}

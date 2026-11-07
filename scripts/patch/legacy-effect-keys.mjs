/**
 * Legacy Active Effect key repair for SW5E content running on dnd5e 6 / midi-qol 14.
 *
 * midi-qol 13.0.49+ removed `flags.midi-qol.(dis)advantage.ability.(save|check).<ability>` (and DAE no longer
 * remaps them), and only evaluates `flags.midi-qol.magicResistance.all|<ability>`. SW5E content also uses
 * `flags.sw5e.advantage.ability.save.(tech|force).<ability>`, which nothing consumes. Effects using those keys
 * silently do nothing. `macro.CUB` (Combat Utility Belt) is no longer handled by DAE either.
 *
 * This rewrites such effects to working equivalents:
 *  - `flags.midi-qol.(dis)advantage.ability.(save|check).X`  -> `flags.midi-qol.(dis)advantage.(save|check).X`
 *  - `flags.midi-qol.magicResistance.save.all`                 -> `flags.midi-qol.magicResistance.all`
 *  - `flags.sw5e.advantage.ability.save.tech.<abl>`            -> `flags.midi-qol.advantage.save.<abl>` when the
 *     save comes from a tech power (school "tec"); `.force.<abl>` likewise for force powers (lgt/uni/drk).
 *     `.force.all` / `.tech.all` become `flags.midi-qol.advantage.save.school.<school>`.
 *  - A "Tech Resistance" feature's plain advantage keys get the same tech-power condition.
 *  - `macro.CUB` condition names become real status effects on the effect.
 *
 * World data: run `sw5e.migrateLegacyEffectKeys({ dryRun: true })` as GM to preview, then without dryRun to apply.
 * New documents (compendium imports etc.) are rewritten automatically in preCreate hooks.
 */

const TECH_SCHOOLS = ["tec"];
const FORCE_SCHOOLS = ["lgt", "uni", "drk"];

/** Combat Utility Belt condition names -> dnd5e / SW5E status ids. */
const CUB_STATUS_MAP = {
	blind: "blinded", blinded: "blinded",
	charmed: "charmed",
	deafened: "deafened", deaf: "deafened",
	fear: "frightened", frightened: "frightened",
	grappled: "grappled",
	incapacitated: "incapacitated",
	invisible: "invisible",
	paralyzed: "paralyzed",
	petrified: "petrified",
	poison: "poisoned", poisoned: "poisoned",
	prone: "prone",
	restrained: "restrained",
	stunned: "stunned",
	unconscious: "unconscious",
	shocked: "shocked",
	slowed: "slowed",
	weakened: "weakened",
	corroded: "corroded",
	ignited: "ignited"
};

const schoolCondition = schools => (schools.length === 1)
	? `item?.school === "${schools[0]}"`
	: `${JSON.stringify(schools)}.includes(item?.school)`;

const newChangeId = () => foundry.utils.randomID(16);

/**
 * Rewrite one effect's changes/statuses.
 * @param {object} effectData            Effect source data (plain object).
 * @param {object} [options]
 * @param {string} [options.itemName]    Name of the item that holds the effect (used for "Tech Resistance").
 * @returns {{changes: object[], statuses: string[]}|null}  Replacement values, or null when nothing changes.
 */
export function rewriteLegacyEffect(effectData, { itemName="" }={}) {
	const changes = effectData?.system?.changes ?? effectData?.changes;
	if ( !Array.isArray(changes) || !changes.length ) return null;

	const keys = new Set(changes.map(c => c?.key));
	const statuses = new Set(effectData.statuses ?? []);
	const hasForceAll = keys.has("flags.sw5e.advantage.ability.save.force.all");
	const isTechResistance = /^tech resistance$/i.test(String(itemName).trim())
		|| /^tech resistance$/i.test(String(effectData.name ?? "").trim());
	const out = [];
	let changed = false;

	const add = (base, data) => {
		if ( keys.has(data.key) && (data.key !== base.key) && !data.allowDuplicate ) return;
		delete data.allowDuplicate;
		out.push({ ...base, ...data });
		keys.add(data.key);
	};

	for ( const c of changes ) {
		const key = c?.key ?? "";
		let m;

		// SW5E "advantage on saves against tech/force powers"
		if ( (m = key.match(/^flags\.sw5e\.advantage\.ability\.save\.(tech|force)\.(\w+)$/)) ) {
			const schools = m[1] === "tech" ? TECH_SCHOOLS : FORCE_SCHOOLS;
			if ( m[2] === "all" ) {
				for ( const s of schools ) {
					add(c, { _id: newChangeId(), key: `flags.midi-qol.advantage.save.school.${s}`, type: "custom", value: "1" });
				}
			} else {
				add(c, { key: `flags.midi-qol.advantage.save.${m[2]}`, type: "custom", value: schoolCondition(schools),
					allowDuplicate: true });
			}
			changed = true;
			continue;
		}

		// Generic magic resistance is superseded when the effect is specifically about force powers.
		if ( hasForceAll && /^flags\.midi-qol\.magicResistance\.(all|save\.all)$/.test(key) ) {
			changed = true;
			continue;
		}
		if ( key === "flags.midi-qol.magicResistance.save.all" ) {
			add(c, { key: "flags.midi-qol.magicResistance.all" });
			changed = true;
			continue;
		}

		// Removed midi-qol ".ability." advantage/disadvantage keys
		if ( (m = key.match(/^flags\.midi-qol\.(advantage|disadvantage)\.ability\.(save|check)\.(\w+)$/)) ) {
			const nk = `flags.midi-qol.${m[1]}.${m[2]}.${m[3]}`;
			if ( isTechResistance && (m[1] === "advantage") && (m[2] === "save") ) {
				add(c, { key: nk, type: "custom", value: schoolCondition(TECH_SCHOOLS), allowDuplicate: true });
			} else {
				add(c, { key: nk });
			}
			changed = true;
			continue;
		}

		// Combat Utility Belt conditions -> statuses
		if ( key === "macro.CUB" ) {
			for ( const name of String(c.value ?? "").split(",") ) {
				const id = CUB_STATUS_MAP[name.trim().toLowerCase()];
				if ( id && CONFIG.statusEffects?.some(s => s.id === id) ) statuses.add(id);
			}
			changed = true;
			continue;
		}

		out.push(c);
	}

	if ( !changed ) return null;
	return { changes: out, statuses: Array.from(statuses) };
}

/**
 * Apply rewriteLegacyEffect to every effect in an item's or actor's source data, in place.
 * @param {object} data  Item or Actor source data.
 * @returns {boolean}    Whether anything changed.
 */
function rewriteEmbeddedEffectSources(data) {
	let dirty = false;
	for ( const effect of data.effects ?? [] ) {
		const result = rewriteLegacyEffect(effect, { itemName: data.name });
		if ( !result ) continue;
		if ( effect.system ) effect.system.changes = result.changes;
		else effect.changes = result.changes;
		effect.statuses = result.statuses;
		dirty = true;
	}
	for ( const item of data.items ?? [] ) dirty = rewriteEmbeddedEffectSources(item) || dirty;
	return dirty;
}

/**
 * Migrate effect keys across the world (actors, their items, world items, unlinked token deltas).
 * @param {object} [options]
 * @param {boolean} [options.dryRun=true]  Only report what would change.
 * @returns {Promise<string[]>}            A line per changed effect.
 */
export async function migrateLegacyEffectKeys({ dryRun=true }={}) {
	if ( !game.user?.isGM ) throw new Error("GM only");
	const report = [];

	const migrateCollection = async (parent, label, onlyIds=null) => {
		const updates = [];
		for ( const effect of parent.effects ) {
			if ( onlyIds && !onlyIds.has(effect.id) ) continue;
			const result = rewriteLegacyEffect(effect.toObject(), { itemName: parent.documentName === "Item" ? parent.name : "" });
			if ( !result ) continue;
			updates.push({ _id: effect.id, "system.changes": result.changes, statuses: result.statuses });
			report.push(`${label} > ${effect.name}: ${result.changes.map(c => `${c.key}=${c.value}`).join("; ")}`
				+ (result.statuses.length ? ` | statuses: ${result.statuses.join(",")}` : ""));
		}
		if ( updates.length && !dryRun ) await parent.updateEmbeddedDocuments("ActiveEffect", updates);
	};

	for ( const actor of game.actors ) {
		await migrateCollection(actor, actor.name);
		for ( const item of actor.items ) await migrateCollection(item, `${actor.name} > ${item.name}`);
	}
	for ( const item of game.items ) await migrateCollection(item, `[world item] ${item.name}`);
	for ( const scene of game.scenes ) {
		for ( const token of scene.tokens ) {
			if ( token.actorLink || !token.actor || !token.delta ) continue;
			const label = `[${scene.name}] token ${token.name}`;
			const deltaEffectIds = new Set((token.delta.effects ?? []).map(e => e.id));
			if ( deltaEffectIds.size ) await migrateCollection(token.actor, label, deltaEffectIds);
			for ( const item of token.delta.items ?? [] ) {
				const synthetic = token.actor.items.get(item.id);
				if ( synthetic?.effects?.size ) await migrateCollection(synthetic, `${label} > ${item.name}`);
			}
		}
	}
	console.log(`SW5E | Legacy effect key migration (${dryRun ? "dry run" : "applied"}): ${report.length} effects`, report);
	return report;
}

export function patchLegacyEffectKeys() {
	// Newly created items/actors (e.g. dragged from a compendium) get working keys automatically.
	Hooks.on("preCreateItem", (item, data) => {
		const source = item.toObject();
		if ( rewriteEmbeddedEffectSources(source) ) item.updateSource({ effects: source.effects });
	});
	Hooks.on("preCreateActor", (actor, data) => {
		const source = actor.toObject();
		if ( rewriteEmbeddedEffectSources(source) ) actor.updateSource({ effects: source.effects, items: source.items });
	});
	Hooks.on("preCreateActiveEffect", (effect, data) => {
		const result = rewriteLegacyEffect(effect.toObject(), { itemName: effect.parent?.documentName === "Item" ? effect.parent.name : "" });
		if ( result ) effect.updateSource({ "system.changes": result.changes, statuses: result.statuses });
	});
}

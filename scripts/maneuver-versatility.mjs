/**
 * Maneuver Versatility (Fighter — Tactical Specialist, 3rd level).
 *
 * "Choose two maneuvers you know. The chosen maneuvers count as general maneuvers for you. You can
 * choose another maneuver at 5th, 9th, 13th, and 17th level. Whenever you gain a level in this class,
 * you can replace one of these maneuvers with another maneuver you know."
 *
 * The choices live on the feature Item as `flags.sw5e.maneuverVersatility.maneuvers` (maneuver Item ids,
 * in the order they were chosen). A chosen maneuver's effective superiority type is "general", so its
 * save DC and maneuver ability come from the actor's General maneuver ability (any ability, picked in
 * Configure Superiority) instead of its printed type.
 *
 * Pure helpers only: this file must stay import-safe outside Foundry so it can be tested offline.
 */
import { isModuleType } from "./module-support.mjs";

/** Stable `system.identifier` of the feature in the sw5e-module packs. */
export const MANEUVER_VERSATILITY_IDENTIFIER = "maneuver-versatility";

/** Pack document id of the feature (character-classes pack). */
export const MANEUVER_VERSATILITY_PACK_ID = "TpLT8MuI3KKsljxa";

/** Prefix of the importer uid carried by imported copies of the feature. */
export const MANEUVER_VERSATILITY_IMPORTER_UID_PREFIX = "Feature.name-maneuver_versatility";

/** Key under `flags.sw5e` on the feature Item that stores the chosen maneuver ids. */
export const MANEUVER_VERSATILITY_FLAG = "maneuverVersatility";

/** Choices granted when the feature is gained. */
export const MANEUVER_VERSATILITY_BASE_CHOICES = 2;

/** Class level at which the feature is gained. */
export const MANEUVER_VERSATILITY_FEATURE_LEVEL = 3;

/** Class levels that each grant one more choice. */
export const MANEUVER_VERSATILITY_EXTRA_LEVELS = Object.freeze([5, 9, 13, 17]);

/** Tactical Specialist is a fighter archetype; used when the owning class cannot be resolved otherwise. */
export const MANEUVER_VERSATILITY_DEFAULT_CLASS = "fighter";

/* -------------------------------------------- */

function listItems(actor) {
	const items = actor?.items;
	if ( !items ) return [];
	if ( Array.isArray(items) ) return items;
	if ( typeof items.values === "function" ) return Array.from(items.values());
	return Object.values(items);
}

function itemId(item) {
	return item?.id ?? item?._id ?? null;
}

function getItemById(actor, id) {
	if ( !id ) return null;
	const items = actor?.items;
	if ( typeof items?.get === "function" ) return items.get(id) ?? null;
	return listItems(actor).find(item => itemId(item) === id) ?? null;
}

function slugify(text) {
	return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function nativeManeuverType(item) {
	return item?.system?.type?.value || "general";
}

function classLevelOf(item) {
	const levels = Number(item?.system?.levels);
	return Number.isFinite(levels) ? levels : null;
}

/* -------------------------------------------- */

/**
 * Whether an Item is the Maneuver Versatility feature. Matches the stable identifier, the importer uid,
 * the pack id, or (for hand-made copies with no identifier) a name that slugs to the identifier.
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function isManeuverVersatilityItem(item) {
	if ( !item || (item.type !== "feat") ) return false;
	const identifier = item.system?.identifier;
	if ( identifier ) return identifier === MANEUVER_VERSATILITY_IDENTIFIER;
	const uid = String(item.flags?.["sw5e-importer"]?.uid ?? "");
	if ( uid.startsWith(MANEUVER_VERSATILITY_IMPORTER_UID_PREFIX) ) return true;
	const source = String(item._stats?.compendiumSource ?? "");
	if ( source.endsWith(`.${MANEUVER_VERSATILITY_PACK_ID}`) ) return true;
	return slugify(item.name) === MANEUVER_VERSATILITY_IDENTIFIER;
}

/**
 * The actor's Maneuver Versatility feature, if it has one.
 * @param {object|null|undefined} actor
 * @returns {object|null}
 */
export function getManeuverVersatilityItem(actor) {
	return listItems(actor).find(isManeuverVersatilityItem) ?? null;
}

/**
 * How many maneuvers can count as general at a class level: 2, plus one each at 5th, 9th, 13th and 17th.
 * @param {unknown} classLevel
 * @returns {number}
 */
export function getManeuverVersatilityLimit(classLevel) {
	const level = Number(classLevel);
	if ( !Number.isFinite(level) ) return MANEUVER_VERSATILITY_BASE_CHOICES;
	return MANEUVER_VERSATILITY_BASE_CHOICES + MANEUVER_VERSATILITY_EXTRA_LEVELS.filter(l => l <= level).length;
}

/**
 * The next class level that grants another choice, or null when none remain.
 * @param {unknown} classLevel
 * @returns {number|null}
 */
export function getNextManeuverVersatilityLevel(classLevel) {
	const level = Number(classLevel);
	if ( !Number.isFinite(level) ) return MANEUVER_VERSATILITY_EXTRA_LEVELS[0];
	return MANEUVER_VERSATILITY_EXTRA_LEVELS.find(l => l > level) ?? null;
}

/**
 * Chosen maneuver ids stored on the feature (trimmed, de-duplicated, in choice order).
 * @param {object|null|undefined} feature
 * @returns {string[]}
 */
export function getStoredManeuverVersatilityIds(feature) {
	const raw = feature?.flags?.sw5e?.[MANEUVER_VERSATILITY_FLAG]?.maneuvers;
	if ( !Array.isArray(raw) ) return [];
	const ids = [];
	for ( const value of raw ) {
		const id = (typeof value === "string") ? value.trim() : "";
		if ( id && !ids.includes(id) ) ids.push(id);
	}
	return ids;
}

/**
 * The chosen ids that are in effect: still a maneuver the actor knows that is not already general,
 * capped at the limit (earlier choices win).
 * @param {string[]} storedIds
 * @param {string[]} eligibleIds
 * @param {number} limit
 * @returns {string[]}
 */
export function resolveActiveManeuverVersatilityIds(storedIds, eligibleIds, limit) {
	const eligible = new Set(eligibleIds ?? []);
	const max = Math.max(0, Number(limit) || 0);
	const active = [];
	for ( const id of storedIds ?? [] ) {
		if ( active.length >= max ) break;
		if ( eligible.has(id) && !active.includes(id) ) active.push(id);
	}
	return active;
}

/**
 * Add or remove one maneuver from the stored choices.
 * Adding is refused (`blocked`) when every choice is already in use.
 * @param {string[]} storedIds
 * @param {string} id
 * @param {boolean} enable
 * @param {number} limit
 * @param {string[]} eligibleIds
 * @returns {{ids: string[], changed: boolean, blocked: boolean}}
 */
export function toggleManeuverVersatilityId(storedIds, id, enable, limit, eligibleIds) {
	const active = resolveActiveManeuverVersatilityIds(storedIds, eligibleIds, limit);
	if ( enable ) {
		if ( active.includes(id) ) return { ids: active, changed: false, blocked: false };
		if ( !(eligibleIds ?? []).includes(id) ) return { ids: active, changed: false, blocked: true };
		if ( active.length >= Math.max(0, Number(limit) || 0) ) return { ids: active, changed: false, blocked: true };
		return { ids: [...active, id], changed: true, blocked: false };
	}
	if ( !active.includes(id) ) return { ids: active, changed: false, blocked: false };
	return { ids: active.filter(other => other !== id), changed: true, blocked: false };
}

/**
 * The class whose levels drive the feature: the class behind the feature's advancement origin, then the
 * class named in its requirements ("Fighter (Tactical Specialist) 3"), then the fighter class.
 * @param {object|null|undefined} actor
 * @param {object|null|undefined} feature
 * @returns {object|null}
 */
export function getManeuverVersatilityClass(actor, feature) {
	const classes = listItems(actor).filter(item => item?.type === "class");
	if ( !classes.length ) return null;

	const origin = String(feature?.flags?.dnd5e?.advancementOrigin ?? "");
	const originItem = getItemById(actor, origin.split(".")[0]);
	if ( originItem?.type === "class" ) return originItem;
	if ( originItem?.type === "subclass" ) {
		const owner = classes.find(cls => cls.system?.identifier === originItem.system?.classIdentifier);
		if ( owner ) return owner;
	}

	const requirement = String(feature?.system?.requirements ?? "").split("(")[0].replace(/\d+/g, "").trim();
	if ( requirement ) {
		const named = classes.find(cls => (slugify(cls.name) === slugify(requirement))
			|| (cls.system?.identifier === slugify(requirement)));
		if ( named ) return named;
	}

	return classes.find(cls => cls.system?.identifier === MANEUVER_VERSATILITY_DEFAULT_CLASS) ?? null;
}

/**
 * Everything the sheet, the chooser and the alerts need about an actor's Maneuver Versatility.
 * Returns null when the actor does not have the feature.
 * @param {object|null|undefined} actor
 * @returns {object|null}
 */
export function getManeuverVersatilityState(actor) {
	const feature = getManeuverVersatilityItem(actor);
	if ( !feature ) return null;

	const classItem = getManeuverVersatilityClass(actor, feature);
	const classLevel = classLevelOf(classItem);
	const limit = getManeuverVersatilityLimit(classLevel ?? MANEUVER_VERSATILITY_FEATURE_LEVEL);
	const maneuvers = listItems(actor).filter(item => isModuleType(item?.type, "maneuver"));
	const eligibleIds = maneuvers.filter(item => nativeManeuverType(item) !== "general").map(itemId);
	const storedIds = getStoredManeuverVersatilityIds(feature);
	const activeIds = resolveActiveManeuverVersatilityIds(storedIds, eligibleIds, limit);
	const validStored = storedIds.filter(id => eligibleIds.includes(id));

	return {
		feature,
		classItem,
		classLevel,
		limit,
		nextLevel: getNextManeuverVersatilityLevel(classLevel),
		storedIds,
		eligibleIds,
		activeIds: new Set(activeIds),
		activeCount: activeIds.length,
		pending: Math.max(0, Math.min(limit, eligibleIds.length) - activeIds.length),
		overLimit: Math.max(0, validStored.length - limit)
	};
}

/**
 * Whether a maneuver on an actor currently counts as general through Maneuver Versatility.
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function isManeuverVersatile(item) {
	const actor = item?.actor ?? null;
	if ( !actor || (nativeManeuverType(item) === "general") ) return false;
	return getManeuverVersatilityState(actor)?.activeIds.has(itemId(item)) ?? false;
}

/**
 * The superiority type a maneuver is used as: "general" when chosen for Maneuver Versatility,
 * otherwise its printed type.
 * @param {object|null|undefined} item
 * @returns {string}
 */
export function getEffectiveManeuverType(item) {
	const native = nativeManeuverType(item);
	if ( native === "general" ) return native;
	return isManeuverVersatile(item) ? "general" : native;
}

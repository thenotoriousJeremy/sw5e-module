const LEGACY_MODULE_ID = "sw5e";
const TEST_MODULE_ID = "sw5e-module-test";
export const CANONICAL_MODULE_ID = "sw5e-module";
export const HOOKS_NAMESPACE = LEGACY_MODULE_ID;
export const LEGACY_SETTINGS_NAMESPACE = LEGACY_MODULE_ID;
export const SETTINGS_NAMESPACE = CANONICAL_MODULE_ID;
const MODULE_ID_CANDIDATES = [CANONICAL_MODULE_ID, LEGACY_MODULE_ID];
const COMPENDIUM_MODULE_ID_CANDIDATES = [CANONICAL_MODULE_ID, LEGACY_MODULE_ID, TEST_MODULE_ID];

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cloneData(data) {
	if ( data === undefined ) return undefined;
	if ( typeof globalThis.structuredClone === "function" ) return globalThis.structuredClone(data);
	return JSON.parse(JSON.stringify(data));
}

function getGame() {
	return globalThis.game ?? null;
}

function getWorldSettingsStorage() {
	return getGame()?.settings?.storage?.get?.("world") ?? null;
}

export function hasStoredWorldSetting(namespace, key) {
	return Boolean(getWorldSettingsStorage()?.get(`${namespace}.${key}`));
}

export function getModuleSettingValue(key, fallback) {
	const game = getGame();
	if ( !game?.settings ) return cloneData(fallback);
	const namespaces = Array.from(new Set([SETTINGS_NAMESPACE, LEGACY_SETTINGS_NAMESPACE]));
	for ( const namespace of namespaces ) {
		if ( !hasStoredWorldSetting(namespace, key) ) continue;
		try {
			return cloneData(game.settings.get(namespace, key));
		} catch {
			const value = getWorldSettingsStorage()?.get(`${namespace}.${key}`)?.value;
			return value ?? cloneData(fallback);
		}
	}

	try {
		return cloneData(game.settings.get(SETTINGS_NAMESPACE, key));
	} catch {
		return cloneData(fallback);
	}
}

export function localizeOrFallback(key, fallback = key) {
	const localized = getGame()?.i18n?.localize?.(key);
	return (!localized || localized === key) ? fallback : localized;
}

export const localizeOr = localizeOrFallback;

const registeredWrappers = new Set();

export function safeRegisterWrapper(target, callback, mode = "WRAPPER") {
	if ( typeof globalThis.libWrapper?.register !== "function" ) return false;
	const key = `${target}::${mode}`;
	if ( registeredWrappers.has(key) ) return true;
	try {
		globalThis.libWrapper.register(getModuleId(), target, callback, mode);
		registeredWrappers.add(key);
		return true;
	} catch (_) {
		return false;
	}
}

export function getModuleId() {
	const fromUrl = import.meta.url.match(/\/modules\/([^/]+)\//)?.[1];
	if ( fromUrl ) return fromUrl;
	const game = getGame();
	const module = game?.modules?.find?.(m => MODULE_ID_CANDIDATES.includes(m.id) || m.title === "SW5E");
	return module?.id ?? MODULE_ID_CANDIDATES[0];
}

export function getModule() {
	const game = getGame();
	const moduleId = getModuleId();
	return game?.modules?.get?.(moduleId)
		?? MODULE_ID_CANDIDATES.map(id => game?.modules?.get?.(id)).find(Boolean)
		?? null;
}

export function getModulePath(path="") {
	const basePath = `modules/${getModuleId()}`;
	return path ? `${basePath}/${path}` : basePath;
}

export function getModuleType(subtype) {
	return `${getModuleId()}.${subtype}`;
}

export function getLegacyModuleType(subtype) {
	return `${LEGACY_MODULE_ID}.${subtype}`;
}

export function getModuleTypeCandidates(subtype) {
	return Array.from(new Set([
		getModuleType(subtype),
		getLegacyModuleType(subtype)
	]));
}

export function isModuleType(type, subtype) {
	return getModuleTypeCandidates(subtype).includes(type);
}

export function normalizeModuleType(type, subtype) {
	if ( !isModuleType(type, subtype) ) return type;
	return getModuleType(subtype);
}

export const LEGACY_PACK_NAME_MAP = Object.freeze({
	invocations: "character-classes",
	archetypefeatures: "character-classes",
	archetypes: "character-classes",
	classfeatures: "character-classes",
	classes: "character-classes",
	speciesfeatures: "species",
	backgroundfeatures: "backgrounds",
	techpowers: "powers-maneuvers",
	forcepowers: "powers-maneuvers",
	maneuvers: "powers-maneuvers",
	fightingstyles: "customization-options",
	fightingmasteries: "customization-options",
	lightsaberforms: "customization-options",
	weaponfocuses: "customization-options",
	weaponsupremacies: "customization-options",
	multiclassimprovements: "customization-options",
	splashclassimprovements: "customization-options",
	blasters: "equipment",
	vibroweapons: "equipment",
	lightweapons: "equipment",
	exoticblasters: "equipment",
	exoticvibroweapons: "equipment",
	exoticlightweapons: "equipment",
	armor: "equipment",
	adventuringgear: "equipment",
	ammunition: "equipment",
	consumables: "equipment",
	gamingsets: "equipment",
	musicalinstruments: "equipment",
	artisansimplements: "equipment",
	implements: "equipment",
	kits: "equipment",
	shields: "equipment",
	tools: "equipment",
	treasure: "equipment",
	droidcustomization: "equipment",
	modification: "equipment",
	ventures: "deployments",
	deploymentfeatures: "deployments",
	starshipactions: "starships",
	starshiparmor: "starships",
	starshipequipment: "starships",
	starshipfeatures: "starships",
	starshipmodifications: "starships",
	starshipsizes: "starships",
	starshipweapons: "starships"
});

export function normalizeCompendiumUuid(uuid, { moduleId=getModuleId(), documentType="Item" }={}) {
	if ( typeof uuid !== "string" ) return uuid;
	const moduleIds = COMPENDIUM_MODULE_ID_CANDIDATES.map(escapeRegex).join("|");
	let res = uuid.replace(new RegExp(`^Compendium\\.(${moduleIds})\\.`), `Compendium.${moduleId}.`);
	// Old SW5E pack names only apply to this module's packs (dnd5e has its own "classes"/"classfeatures" packs)
	const renamePack = (scope, pack) => (scope === moduleId ? (LEGACY_PACK_NAME_MAP[pack] ?? pack) : pack);
	const m3 = res.match(/^Compendium\.([^.]+)\.([^.]+)\.([^.]+)$/);
	if ( m3 ) return `Compendium.${m3[1]}.${renamePack(m3[1], m3[2])}.${documentType}.${m3[3]}`;
	const m4 = res.match(/^Compendium\.([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)$/);
	if ( m4 ) return `Compendium.${m4[1]}.${renamePack(m4[1], m4[2])}.${m4[3]}.${m4[4]}`;
	return res;
}

export function normalizeCompendiumReferences(text, { moduleId=getModuleId() }={}) {
	if ( typeof text !== "string" ) return text;
	const moduleIds = COMPENDIUM_MODULE_ID_CANDIDATES.map(escapeRegex).join("|");
	let res = text.replace(new RegExp(`Compendium\\.(${moduleIds})\\.`, "g"), `Compendium.${moduleId}.`);
	for ( const [oldPack, newPack] of Object.entries(LEGACY_PACK_NAME_MAP) ) {
		res = res.replaceAll(`Compendium.${moduleId}.${oldPack}.`, `Compendium.${moduleId}.${newPack}.`);
	}
	return res;
}

import { LEGACY_PACK_NAME_MAP } from "../module-support.mjs";

const CURRENT_SW5E_PACKS = [
	"armorproperties",
	"backgrounds",
	"character-classes",
	"conditions",
	"customization-options",
	"deployments",
	"drakes-shipyard",
	"enhanceditems",
	"equipment",
	"feats",
	"fistoscodex",
	"hgttgspecies",
	"mandaloriancodexitems",
	"mandaloriancodexjournals",
	"mandaloriancodexnpcs",
	"monsters",
	"snv-monsters",
	"veshs-galactic-holodex",
	"monstertraits",
	"powers-maneuvers",
	"species",
	"starships",
	"tables",
	"weaponproperties",
	"phb-journals",
	"expanded-content-journals",
	"wretched-hives-journals"
];

/**
 * Register Foundry compendium UUID redirects so references to the old SW5E pack names (e.g.
 * `Compendium.sw5e-module.classfeatures.Item.x`, `Compendium.sw5e.forcepowers.Item.y`) resolve to the current packs.
 * Must run during init, before core builds its redirect tree.
 */
export function registerCompendiumRedirects() {
	if ( !globalThis.CONFIG ) return;
	CONFIG.compendium ??= {};
	CONFIG.compendium.uuidRedirects ??= {};
	const redirects = CONFIG.compendium.uuidRedirects;

	// Legacy pack names, under both the current and the legacy module id
	for ( const [oldPack, newPack] of Object.entries(LEGACY_PACK_NAME_MAP) ) {
		for ( const scope of ["sw5e-module", "sw5e"] ) {
			redirects[`Compendium.${scope}.${oldPack}`] = `Compendium.sw5e-module.${newPack}`;
		}
	}

	// Legacy module id "sw5e" for the current pack names
	for ( const pack of CURRENT_SW5E_PACKS ) {
		redirects[`Compendium.sw5e.${pack}`] = `Compendium.sw5e-module.${pack}`;
	}
}

export function patchPacks(strict=true) {
	if (strict) {
		game.packs.filter(p => p.metadata.packageName === "dnd5e").forEach(p => {
			foundry.utils.setProperty(p.metadata.flags, "dnd5e.types", ["nope"]);
		});
	}
}

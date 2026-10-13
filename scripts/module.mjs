import { addHooks } from "./patch/addHooks.mjs";
import { patchConfig } from "./patch/config.mjs";
import { patchDataModels } from "./patch/dataModels.mjs";
import { patchPacks } from "./patch/packs.mjs";
import { patchManeuver } from "./patch/maneuver.mjs";
import { patchItemChoiceAdvancement } from "./patch/item-choice-advancement.mjs";
import { patchMedpac } from "./patch/medpac.mjs";
import { patchBlasterReload } from "./patch/blaster-reload.mjs";
import { patchBlasterAmmoUx } from "./patch/blaster-ammo-ux.mjs";
import { patchChassisItemSheet } from "./patch/chassis-item-sheet.mjs";
import { patchPowercasting } from "./patch/powercasting.mjs";
import { patchForceRecovery } from "./patch/force-recovery.mjs";
import { patchIdealOfTheTranquil } from "./patch/ideal-of-the-tranquil.mjs";
import { patchProficiencyInit, patchProficiencyReady } from "./patch/proficiency.mjs";
import { patchProperties } from "./patch/properties.mjs";
import { patchEquippableAttunement } from "./patch/equippable-attunement.mjs";
import { patchStarshipCreate } from "./patch/starship-create.mjs";
import { patchStarshipPrepare } from "./patch/starship-prepare.mjs";
import { patchStarshipArmorClassConfig } from "./patch/starship-armor-class-config.mjs";
import { registerStarshipMovementReadyHooks } from "./patch/starship-movement.mjs";
import { registerStarshipFoodSchemaHooks } from "./patch/starship-food-schema.mjs";
import { patchStarshipMovementSensesConfig } from "./starship-movement-config.mjs";
import { patchStarshipSheet } from "./patch/starship-sheet.mjs";
import { patchStarshipFeatureRecoveryLabels } from "./patch/starship-feature-recovery-labels.mjs";
import { patchStarshipActivityConfigUi } from "./patch/starship-activity.mjs";
import { registerStarshipSystemDamageRollHooks } from "./starship-system-damage.mjs";
import { registerStarshipSavePilotPbHooks } from "./starship-data.mjs";
import { registerStarshipDamageReductionHooks } from "./starship-damage-reduction.mjs";
import { registerStarshipWeaponRollHooks } from "./starship-weapon-rolls.mjs";
import { registerStarshipLauncherAmmoBridgeHooks } from "./starship-launcher-ammo.mjs";
import { registerSw5eActivityTriggerHooks } from "./sw5e-activity-trigger.mjs";
import { registerStarshipDestructionSaveHooks } from "./starship-destruction-saves.mjs";
import { registerStarshipTokenResourceHooks } from "./starship-token-resources.mjs";
import { patchAugmentationsSheet } from "./patch/augmentations-sheet.mjs";
import { patchDroidCustomizationsSheet } from "./patch/droid-customizations-sheet.mjs";
import * as migrations from "./migration.mjs";
import { handleTemplates } from "./templates.mjs";
import { chassisApi } from "./chassis.mjs";
import {
	getInstalledChassisModEffectChanges,
	getInstalledModBonus,
	isChassisHostItemActive,
	INSTALLED_MOD_SUPPORTED_BONUS_KEYS,
	prefetchInstalledModEffectsForActor,
	prefetchInstalledModEffectsForHost
} from "./installed-mod-effects.mjs";
import { augmentationsApi } from "./augmentations.mjs";
import { droidCustomizationsApi } from "./droid-customizations.mjs";
import { DroidCustomizationsApp } from "./droid-customizations-app.mjs";
import { AugmentationsApp } from "./augmentations-app.mjs";
import { registerModuleSettings } from "./settings.mjs";
import { patchVariantRules } from "./patch/variantRules.mjs";
import { patchCharacterDeploymentSheet } from "./patch/character-deployment-sheet.mjs";
import { patchCharacterSheetTabNavigation } from "./patch/character-sheet-tab-navigation.mjs";
import { patchSpecialTraitsSheet } from "./patch/special-traits-sheet.mjs";
import { patchSpecies } from "./patch/species.mjs";
import { patchStealth } from "./patch/stealth.mjs";
import { patchStarshipWeaponFacing } from "./patch/starship-weapon-facing.mjs";
import { registerSneakAttackAutoBridge } from "./patch/sneak-attack-auto.mjs";
import { getCharacterDeploymentSummary } from "./character-deployments.mjs";
import { registerCharacterFeaturesDiagnostics } from "./dev/character-features-diagnostics.mjs";
import { characterImporterApi, registerCharacterImporterHooks } from "./character-importer.mjs";

globalThis.sw5e = {
	migrations,
	chassis: chassisApi,
	installedModEffects: {
		getInstalledChassisModEffectChanges,
		getInstalledModBonus,
		isChassisHostItemActive,
		prefetchInstalledModEffectsForActor,
		prefetchInstalledModEffectsForHost,
		INSTALLED_MOD_SUPPORTED_BONUS_KEYS
	},
	augmentations: {
		...augmentationsApi,
		openManager: actor => AugmentationsApp.openForActor(actor)
	},
	droidCustomizations: {
		...droidCustomizationsApi,
		openManager: actor => DroidCustomizationsApp.openForActor(actor)
	},
	deployments: {
		getCharacterDeploymentSummary
	},
	characterImporter: {
		...characterImporterApi
	}
};

const strict = true;

Hooks.once('init', async function() {
	// Register Module Settings
	registerModuleSettings();
	// Register lib-wrapper hooks
	addHooks();
	// Pre-load templates
	handleTemplates();
	registerCharacterImporterHooks();

	patchConfig(CONFIG.DND5E, strict);
	patchDataModels();

	patchManeuver();
	// After dnd5e system init has registered advancementTypes; mutates shared VALID_TYPES Set.
	patchItemChoiceAdvancement();
	patchMedpac();
	patchBlasterReload();
	patchBlasterAmmoUx();
	patchPowercasting();
	patchForceRecovery();
	patchIdealOfTheTranquil();
	patchProficiencyInit();
	patchProperties();
	patchEquippableAttunement();
	patchChassisItemSheet();
	patchStarshipCreate();
	patchStarshipPrepare();
	patchStarshipArmorClassConfig();
	patchStarshipActivityConfigUi();
	registerStarshipMovementReadyHooks();
	registerStarshipFoodSchemaHooks();
	patchStarshipMovementSensesConfig();
	registerStarshipSystemDamageRollHooks();
	registerStarshipSavePilotPbHooks();
	registerStarshipDamageReductionHooks();
	registerStarshipWeaponRollHooks();
	registerSw5eActivityTriggerHooks();
	registerStarshipLauncherAmmoBridgeHooks();
	registerStarshipDestructionSaveHooks();
	registerStarshipTokenResourceHooks();
	patchStarshipSheet();
	patchStarshipFeatureRecoveryLabels();
	patchAugmentationsSheet();
	patchDroidCustomizationsSheet();
	patchVariantRules();
	patchCharacterDeploymentSheet();
	patchCharacterSheetTabNavigation();
	patchSpecialTraitsSheet();
	patchSpecies();
	patchStealth();
	patchStarshipWeaponFacing();
	registerSneakAttackAutoBridge();
});

Hooks.once('ready', async function() {
	patchPacks(strict);
	patchProficiencyReady();
	registerCharacterFeaturesDiagnostics(globalThis.sw5e);

	// Perform module migration if it is required and feasible
	if (migrations.needsMigration()) await migrations.migrateWorld();

	// Ensure Lightbringer item exists on Kohaku and has separate activities
	try {
		const kohaku = game.actors?.getName("Kohaku");
		if (kohaku && (kohaku.isOwner || game.user?.isGM)) {
			const existing = kohaku.items.find(i => i.name === "Lightbringer");
			const hasCorrectActivities = existing?.system?.activities?.extraAberrUndead &&
				(existing?.system?.activities?.sw5e0attack00000?.otherActivityId === "none") &&
				(existing?.system?.activities?.extraAberrUndead?.midiProperties?.otherActivityCompatible === false);

			if (!existing || !hasCorrectActivities) {
				if (existing) await existing.delete();
				const pack = game.packs.get("sw5e-module.enhanceditems");
				const packItem = pack ? await pack.getDocument("WpK7nQv3eR1sM8tX") : null;
				let itemData = packItem ? packItem.toObject() : null;
				if (!itemData) {
					itemData = {
						name: "Lightbringer",
						type: "weapon",
						img: "modules/sw5e-module/icons/packs/Martial%20Lightweapons/MartialLightsaber.webp",
						system: {
							description: {
								value: "<h4>Weapon (Any lightweapon), legendary</h4>\n<p><em><strong>Requires attunement by force-caster</strong></em></p>\n<hr />\n<p>You gain a +3 bonus to attack and damage rolls made with this enhanced weapon. When you hit an aberration or an undead with it, that creature takes an extra [[/damage 2d10 energy]]{2d10 energy} damage.</p>\n<p>While you hold the drawn lightweapon, it creates an aura in a 10-foot radius around you. You and all creatures friendly to you in the aura have advantage on saving throws against force powers and their effects. If you have 17 or more levels in the guardian class, the radius of the aura increases to 30 feet.</p>\n<hr />\n<h2>Martial lightsaber</h2>\n<h3>Hidden</h3>\n<p>You have advantage on Dexterity (Sleight of Hand) checks made to conceal a weapon with this property.</p>\n<h3>Luminous</h3>\n<p>A weapon with this property sheds dim light in a 5-foot radius while activated. Additionally, Dexterity (Stealth) checks made while the weapon is activated have disadvantage.</p>\n<h3>Versatile ([[/damage 1d10 energy]])</h3>\n<p>A weapon with this property can be used with one or two hands. A damage value in parentheses appears with the property—the damage when the weapon is used with two hands to make a melee attack.</p>"
							},
							source: { custom: "WH" },
							quantity: 1,
							weight: { value: 3, units: "lb" },
							price: { value: 200000, denomination: "gc" },
							attunement: "required",
							equipped: true,
							attuned: true,
							rarity: "legendary",
							identified: true,
							activation: { type: "action", cost: 1 },
							properties: ["hidden", "luminous", "mgc", "ver"],
							type: { value: "martialLW", baseItem: "martiallightsaber" },
							magicalBonus: 3,
							damage: {
								parts: [["1d8 + @mod", "energy"]],
								base: { number: 1, denomination: 8, types: ["energy"] },
								versatile: { number: 1, denomination: 10, types: ["energy"] }
							},
							activities: {
								sw5e0attack00000: {
									_id: "sw5e0attack00000",
									type: "attack",
									name: "Attack",
									otherActivityId: "none",
									midiProperties: {
										otherActivityCompatible: false,
										triggeredActivityId: "none"
									},
									activation: { type: "action", value: 1 },
									attack: { type: { value: "melee", classification: "weapon" } },
									damage: { includeBase: true, parts: [] }
								},
								extraAberrUndead: {
									_id: "extraAberrUndead",
									type: "damage",
									name: "Aberration or Undead",
									otherActivityId: "none",
									midiProperties: {
										automationOnly: false,
										otherActivityCompatible: false,
										triggeredActivityId: "none"
									},
									activation: { type: "special", value: null },
									target: { affects: { count: "1", type: "any", special: "Aberration or undead" }, prompt: true },
									damage: {
										parts: [{ number: 2, denomination: 10, types: ["energy"] }]
									}
								}
							}
						},
						effects: [
							{
								name: "Lightbringer: Aura of Warding",
								img: "modules/sw5e-module/icons/packs/Martial%20Lightweapons/MartialLightsaber.webp",
								transfer: true,
								changes: [
									{ key: "flags.midi-qol.magicResistance.all", mode: 0, value: "1", priority: 20 },
									{ key: "flags.midi-qol.magicResistance.save.all", mode: 0, value: "1", priority: 20 },
									{ key: "flags.sw5e.advantage.ability.save.force.all", mode: 5, value: "1", priority: 20 }
								],
								description: "<p>While you hold the drawn lightweapon, it creates an aura in a 10-foot radius around you (30 feet if 17+ guardian levels). You and friendly creatures in the aura have advantage on saving throws against force powers and their effects.</p>"
							}
						]
					};
				} else {
					itemData.system.equipped = true;
					itemData.system.attuned = true;
				}
				await kohaku.createEmbeddedDocuments("Item", [itemData]);
				ui.notifications?.info?.("Lightbringer synced to Kohaku's inventory!");
			}
		}
	} catch (err) {
		console.error("sw5e-module | Could not sync Lightbringer:", err);
	}

	// Ensure Elite Stormtrooper Captain's Superior Aura of Command has working active effect
	try {
		if (game.user?.isGM) {
			const captain = game.actors?.getName("Elite Stormtrooper Captain")
				?? game.actors?.get("n7rMc4wT6NPnE4vM");
			if (captain) {
				const auraItem = captain.items?.find(i => i.name.toLowerCase().includes("aura of command"));
				const effect = auraItem?.effects?.contents?.[0] ?? auraItem?.effects?.[0];
				if (effect && (effect.changes?.some(c => c.mode === 0) || effect.changes?.length !== 12 || effect.name !== "Superior Aura of Command")) {
					const auraChanges = [
						{ key: "system.bonuses.mwak.attack", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.mwak.damage", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.rwak.attack", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.rwak.damage", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.msak.attack", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.msak.damage", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.rsak.attack", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.rsak.damage", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.mpak.attack", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.mpak.damage", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.rpak.attack", mode: 2, value: "2", priority: 20 },
						{ key: "system.bonuses.rpak.damage", mode: 2, value: "2", priority: 20 }
					];
					const updateData = {
						_id: effect.id,
						name: "Superior Aura of Command",
						img: "modules/sw5e-module/icons/packs/Monster%20Traits/Superior%20Aura%20of%20Command.webp",
						transfer: true,
						disabled: false,
						changes: auraChanges,
						"flags.ActiveAuras": {
							aura: "Allies",
							radius: 30,
							isAura: true,
							inactive: false,
							hidden: false,
							ignoreSelf: false,
							height: false,
							alignment: "",
							type: "",
							save: "",
							savedc: null,
							hostile: false,
							onlyOnce: false,
							time: "None"
						}
					};
					if (typeof auraItem.updateEmbeddedDocuments === "function") {
						await auraItem.updateEmbeddedDocuments("ActiveEffect", [updateData]);
					} else {
						await effect.update(updateData);
					}
					ui.notifications?.info?.("Superior Aura of Command updated on Elite Stormtrooper Captain!");
				}
			}
		}
	} catch (err) {
		console.warn("sw5e-module | Could not verify Elite Stormtrooper Captain Superior Aura of Command:", err);
	}
});

import "./patch/v14-compat.mjs";
import { addHooks } from "./patch/addHooks.mjs";
import { patchConfig } from "./patch/config.mjs";
import { patchDataModels } from "./patch/dataModels.mjs";
import { patchPacks, registerCompendiumRedirects } from "./patch/packs.mjs";
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
import { registerForcePowerDamageResistanceHooks } from "./force-power-damage-resistance.mjs";
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
import { patchArgonCombatHud } from "./patch/argon-combat-hud.mjs";
import { patchDaeIntegration } from "./patch/dae-integration.mjs";
import { patchCharacterFlags } from "./patch/character-flags.mjs";
import { migrateLegacyEffectKeys, patchLegacyEffectKeys } from "./patch/legacy-effect-keys.mjs";
import { patchDerivedConditions } from "./patch/derived-conditions.mjs";
import { patchSlowedMovement } from "./patch/slowed-movement.mjs";
import { openManeuverVersatility, patchManeuverVersatility } from "./patch/maneuver-versatility.mjs";
import { getManeuverVersatilityState } from "./maneuver-versatility.mjs";
import { patchAutoAnimationsPresets } from "./patch/autoanimations-presets.mjs";
import { patchAtlPresets } from "./patch/atl-presets.mjs";

globalThis.sw5e = {
	migrateLegacyEffectKeys,
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
	},
	maneuverVersatility: {
		open: openManeuverVersatility,
		getState: getManeuverVersatilityState
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
	registerCompendiumRedirects();
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
	registerForcePowerDamageResistanceHooks();
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
	patchArgonCombatHud();
	patchDaeIntegration();
	patchCharacterFlags();
	patchLegacyEffectKeys();
	patchDerivedConditions();
	patchSlowedMovement();
	patchManeuverVersatility();
	patchAutoAnimationsPresets();
	patchAtlPresets();
});

Hooks.once('ready', async function() {
	patchPacks(strict);
	patchProficiencyReady();
	registerCharacterFeaturesDiagnostics(globalThis.sw5e);

	// Perform module migration if it is required and feasible
	if (migrations.needsMigration()) await migrations.migrateWorld();
});


/**
 * DAE (Dynamic Active Effects) Integration for SW5E
 *
 * Exposes Star Wars 5e powercasting, superiority, and starship attributes
 * to DAE's autocomplete list and base values registry.
 * Ensures damage resistances and condition immunities are evaluated in "initial" phase.
 * Remaps legacy SW5e character flags to dnd5e 6 equivalents.
 */

export function patchDaeIntegration() {
	Hooks.on("dae.modifyBaseValues", (actorType, baseValues, _characterSpec) => {
		if (!baseValues) return;
		const fields = foundry?.data?.fields ?? {};
		const NumberField = fields.NumberField ?? class {};
		const BooleanField = fields.BooleanField ?? class {};

		if (actorType === "character" || actorType === "npc") {
			// Force Points & Attributes
			baseValues["system.powercasting.force.points.value"] = [new NumberField({ label: "Force Points (Current)" }), ""];
			baseValues["system.powercasting.force.points.max"] = [new NumberField({ label: "Force Points (Override Max)" }), ""];
			baseValues["system.powercasting.force.points.temp"] = [new NumberField({ label: "Force Points (Temp)" }), ""];
			baseValues["system.powercasting.force.points.tempmax"] = [new NumberField({ label: "Force Points (Temp Max)" }), ""];
			baseValues["system.powercasting.force.level"] = [new NumberField({ label: "Force Caster Level" }), ""];
			baseValues["system.powercasting.force.limit"] = [new NumberField({ label: "Force Power Limit" }), ""];
			baseValues["system.powercasting.force.maxPowerLevel"] = [new NumberField({ label: "Max Force Power Level" }), ""];
			baseValues["system.powercasting.force.schools.lgt.dc"] = [new NumberField({ label: "Force DC (Light)" }), ""];
			baseValues["system.powercasting.force.schools.uni.dc"] = [new NumberField({ label: "Force DC (Universal)" }), ""];
			baseValues["system.powercasting.force.schools.drk.dc"] = [new NumberField({ label: "Force DC (Dark)" }), ""];

			// Tech Points & Attributes
			baseValues["system.powercasting.tech.points.value"] = [new NumberField({ label: "Tech Points (Current)" }), ""];
			baseValues["system.powercasting.tech.points.max"] = [new NumberField({ label: "Tech Points (Override Max)" }), ""];
			baseValues["system.powercasting.tech.points.temp"] = [new NumberField({ label: "Tech Points (Temp)" }), ""];
			baseValues["system.powercasting.tech.points.tempmax"] = [new NumberField({ label: "Tech Points (Temp Max)" }), ""];
			baseValues["system.powercasting.tech.level"] = [new NumberField({ label: "Tech Caster Level" }), ""];
			baseValues["system.powercasting.tech.limit"] = [new NumberField({ label: "Tech Power Limit" }), ""];
			baseValues["system.powercasting.tech.maxPowerLevel"] = [new NumberField({ label: "Max Tech Power Level" }), ""];
			baseValues["system.powercasting.tech.schools.tec.dc"] = [new NumberField({ label: "Tech DC" }), ""];

			// Superiority Dice & Maneuvers
			baseValues["system.superiority.dice.value"] = [new NumberField({ label: "Superiority Dice (Current)" }), ""];
			baseValues["system.superiority.dice.max"] = [new NumberField({ label: "Superiority Dice (Override Max)" }), ""];
			baseValues["system.superiority.dice.temp"] = [new NumberField({ label: "Superiority Dice (Temp)" }), ""];
			baseValues["system.superiority.die"] = [new NumberField({ label: "Superiority Die Size" }), ""];
			baseValues["system.superiority.types.physical.dc"] = [new NumberField({ label: "Maneuver DC (Physical)" }), ""];
			baseValues["system.superiority.types.mental.dc"] = [new NumberField({ label: "Maneuver DC (Mental)" }), ""];
			baseValues["system.superiority.types.general.dc"] = [new NumberField({ label: "Maneuver DC (General)" }), ""];
		}

		if (actorType === "vehicle") {
			// Starship Vitals
			baseValues["system.attributes.hp.value"] = [new NumberField({ label: "Starship Hull Points (Current)" }), ""];
			baseValues["system.attributes.hp.max"] = [new NumberField({ label: "Starship Hull Points (Max)" }), ""];
			baseValues["system.attributes.hp.temp"] = [new NumberField({ label: "Starship Shield Points (Current)" }), ""];
			baseValues["system.attributes.hp.tempmax"] = [new NumberField({ label: "Starship Shield Points (Max)" }), ""];
			baseValues["system.attributes.shields.regeneration"] = [new NumberField({ label: "Shield Regeneration" }), ""];
			baseValues["system.attributes.shields.depleted"] = [new BooleanField({ label: "Shields Depleted" }), "override"];
			baseValues["system.attributes.damageReduction"] = [new NumberField({ label: "Damage Reduction" }), ""];
		}
	});

	// Ensure traits (dr, di, dv, ci) run during "initial" phase so prepareDerivedData sees them
	Hooks.on("dae.modifySpecials", (actorType, specials, _characterSpec) => {
		if (!specials) return;
		const fields = foundry?.data?.fields ?? {};
		const StringField = fields.StringField ?? class {};

		specials["system.traits.dr.value"] = [new StringField(), "", "initial"];
		specials["system.traits.di.value"] = [new StringField(), "", "initial"];
		specials["system.traits.dv.value"] = [new StringField(), "", "initial"];
		specials["system.traits.ci.value"] = [new StringField(), "", "initial"];
	});

	// Map legacy flags.sw5e.* to dnd5e 6 paths in DAE
	Hooks.on("dae.addFieldMappings", (fieldMappings) => {
		if (!fieldMappings) return;
		Object.assign(fieldMappings, {
			"flags.sw5e.meleeCriticalDamageDice": "flags.dnd5e.meleeCriticalDamageDice",
			"flags.sw5e.weaponCriticalThreshold": "flags.dnd5e.weaponCriticalThreshold",
			"flags.sw5e.powerCriticalThreshold": "flags.dnd5e.spellCriticalThreshold",
			"flags.sw5e.spellCriticalThreshold": "flags.dnd5e.spellCriticalThreshold",
			"flags.sw5e.dangerSense": { key: "system.abilities.dex.save.roll.mode", value: "1", type: "add" },
			"flags.sw5e.initiativeAdv": { key: "system.attributes.init.roll.mode", value: "1", type: "add" },
			"flags.sw5e.initiativeAlert": "flags.dnd5e.initiativeAlert",
			"flags.sw5e.powerfulBuild": "flags.dnd5e.powerfulBuild",
			"flags.sw5e.encumbranceMultiplier": "flags.dnd5e.powerfulBuild",
			"flags.sw5e.halveRangePenalty": "flags.dnd5e.sharpShooter",
			"flags.sw5e.savageAttacks": "flags.dnd5e.savageAttacks",
			"flags.sw5e.elvenAccuracy": "flags.dnd5e.elvenAccuracy",
			"flags.sw5e.halflingLucky": "flags.dnd5e.halflingLucky",
			"flags.sw5e.jackOfAllTrades": "flags.dnd5e.jackOfAllTrades",
			"flags.sw5e.observantFeat": "flags.dnd5e.observantFeat",
			"flags.sw5e.reliableTalent": "flags.dnd5e.reliableTalent",
			"flags.sw5e.remarkableAthlete": "flags.dnd5e.remarkableAthlete",
			"system.attributes.movement.walk": "system.attributes.movement.speeds.walk",
			"system.attributes.movement.fly": "system.attributes.movement.speeds.fly",
			"system.attributes.movement.climb": "system.attributes.movement.speeds.climb",
			"system.attributes.movement.swim": "system.attributes.movement.speeds.swim",
			"system.attributes.movement.burrow": "system.attributes.movement.speeds.burrow",
			"system.traits.armor.value": "system.traits.armorProf.value"
		});
	});

	// Map legacy flags in dnd5e core ActiveEffect5e.SHIM_FIELDS
	const shimFields = globalThis.dnd5e?.documents?.ActiveEffect5e?.SHIM_FIELDS;
	if (shimFields) {
		Object.assign(shimFields, {
			"flags.sw5e.meleeCriticalDamageDice": { key: "flags.dnd5e.meleeCriticalDamageDice" },
			"flags.sw5e.weaponCriticalThreshold": { key: "flags.dnd5e.weaponCriticalThreshold" },
			"flags.sw5e.powerCriticalThreshold": { key: "flags.dnd5e.spellCriticalThreshold" },
			"flags.sw5e.spellCriticalThreshold": { key: "flags.dnd5e.spellCriticalThreshold" },
			"flags.sw5e.dangerSense": { key: "system.abilities.dex.save.roll.mode", value: 1, type: "add" },
			"flags.sw5e.initiativeAdv": { key: "system.attributes.init.roll.mode", value: 1, type: "add" },
			"flags.sw5e.initiativeAlert": { key: "flags.dnd5e.initiativeAlert" },
			"flags.sw5e.powerfulBuild": { key: "flags.dnd5e.powerfulBuild" },
			"flags.sw5e.encumbranceMultiplier": { key: "flags.dnd5e.powerfulBuild" },
			"flags.sw5e.halveRangePenalty": { key: "flags.dnd5e.sharpShooter" },
			"flags.sw5e.savageAttacks": { key: "flags.dnd5e.savageAttacks" },
			"flags.sw5e.elvenAccuracy": { key: "flags.dnd5e.elvenAccuracy" },
			"flags.sw5e.halflingLucky": { key: "flags.dnd5e.halflingLucky" },
			"flags.sw5e.jackOfAllTrades": { key: "flags.dnd5e.jackOfAllTrades" },
			"flags.sw5e.observantFeat": { key: "flags.dnd5e.observantFeat" },
			"flags.sw5e.reliableTalent": { key: "flags.dnd5e.reliableTalent" },
			"flags.sw5e.remarkableAthlete": { key: "flags.dnd5e.remarkableAthlete" },
			"system.attributes.movement.walk": { key: "system.attributes.movement.speeds.walk" },
			"system.attributes.movement.fly": { key: "system.attributes.movement.speeds.fly" },
			"system.attributes.movement.climb": { key: "system.attributes.movement.speeds.climb" },
			"system.attributes.movement.swim": { key: "system.attributes.movement.speeds.swim" },
			"system.attributes.movement.burrow": { key: "system.attributes.movement.speeds.burrow" },
			"system.traits.armor.value": { key: "system.traits.armorProf.value" }
		});
	}

	Hooks.on("dae.addSpecialDurations", (specialDurations) => {
		if (!specialDurations) return;
		specialDurations["sw5e.isTurnStart"] = "SW5E: Start of Turn";
		specialDurations["sw5e.isTurnEnd"] = "SW5E: End of Turn";
	});
}

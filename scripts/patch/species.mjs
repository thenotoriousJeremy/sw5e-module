import { getModuleId } from "../module-support.mjs";
import { isActorDroidCustomizationHost } from "../droid-customizations.mjs";

export function patchSpecies() {
	// Droid Class IV Immunities & Droid Resistances
	libWrapper.register(getModuleId(), "dnd5e.documents.Actor5e.prototype.prepareDerivedData", function (wrapped, ...args) {
		wrapped(...args);

		if (isActorDroidCustomizationHost(this)) {
			// Ensure traits objects exist
			this.system.traits = this.system.traits || {};
			
			this.system.traits.di = this.system.traits.di || {};
			this.system.traits.di.value = this.system.traits.di.value || new Set();
			
			this.system.traits.dr = this.system.traits.dr || {};
			this.system.traits.dr.value = this.system.traits.dr.value || new Set();

			this.system.traits.ci = this.system.traits.ci || {};
			this.system.traits.ci.value = this.system.traits.ci.value || new Set();

			// Add immunities
			this.system.traits.di.value.add("poison");
			this.system.traits.ci.value.add("poisoned");
			this.system.traits.ci.value.add("diseased");
			this.system.traits.ci.value.add("sleep");

			// Add resistances
			this.system.traits.dr.value.add("necrotic");
			this.system.traits.dr.value.add("psychic");
		}
	}, "WRAPPER");

	// Undersized Property Disadvantage
	Hooks.on("dnd5e.preRollAttack", (item, rollConfig) => {
		if (item.type !== "weapon") return;
		const actor = item.actor;
		if (!actor) return;

		const isSmallOrTiny = ["sm", "tiny"].includes(actor.system.traits?.size);
		if (isSmallOrTiny) {
			const props = item.system.properties;
			const hasProp = (p) => {
				if (props instanceof Set) return props.has(p);
				if (Array.isArray(props)) return props.includes(p);
				if (props && typeof props === "object") return !!props[p];
				return false;
			};

			const isHeavy = hasProp("hvy");
			const isMartialOrExotic = item.system.type?.value?.startsWith("martial") || item.system.type?.value?.startsWith("exotic");
			const isLight = hasProp("lgt");

			if ((isHeavy || isMartialOrExotic) && !isLight) {
				rollConfig.disadvantage = true;
			}
		}
	});
}

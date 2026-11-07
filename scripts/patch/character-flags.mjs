import { safeRegisterWrapper } from "../module-support.mjs";

/**
 * SW5e Supreme Aptitude support: half proficiency (rounded up) on Str/Dex/Con/Int checks that don't already
 * include proficiency, implemented through dnd5e's Remarkable Athlete hook.
 */
export function patchCharacterFlags() {
	safeRegisterWrapper("dnd5e.documents.Actor5e.prototype._isRemarkableAthlete", function(wrapped, ability) {
		// Never call getFlag("sw5e", ...) here: "sw5e" is not an active package id (the module id is
		// "sw5e-module"), so Document#getFlag throws and aborts skill/HP preparation for every actor.
		// Read the flag scopes directly from the flags object instead.
		const isSupremeAptitude = this.flags?.dnd5e?.supremeAptitude
			|| this.flags?.sw5e?.supremeAptitude
			|| this.flags?.["sw5e-module"]?.supremeAptitude;
		const supremeAbilities = CONFIG.DND5E?.characterFlags?.supremeAptitude?.abilities ?? ["str", "dex", "con", "int"];
		if ( isSupremeAptitude && supremeAbilities.includes(ability) ) return true;

		// Remarkable Athlete keeps the stock dnd5e behaviour (legacy rules only).
		return wrapped(ability);
	}, "MIXED");
}

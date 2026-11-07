import { safeRegisterWrapper } from "../module-support.mjs";

/**
 * SW5E Slowed: level 1 reduces speed by 15 ft, level 2 by 25 ft, level 3 by 30 ft, and level 4 reduces speed to 0
 * with no benefit from speed bonuses.
 *
 * config.mjs defines Slowed as a 4-level condition with a per-level `speedReduction` table, but dnd5e only knows a
 * linear `reduction.speed` per level. For levels 1-3 the table value is handed to dnd5e's own condition speed
 * reduction for the duration of that actor's movement preparation, so it is applied exactly where dnd5e applies
 * condition penalties (before bonuses and multipliers, never below 0). Level 4 uses dnd5e's noMovement effect,
 * which also suppresses speed bonuses. Starships keep their own slowed handling (starship-conditions.mjs).
 */
export function patchSlowedMovement() {
	Hooks.once("setup", () => CONFIG.DND5E.conditionEffects?.noMovement?.add?.("slowed-4"));

	safeRegisterWrapper("dnd5e.dataModels.actor.AttributesFields.prepareMovement", function(wrapped, ...args) {
		const cfg = CONFIG.DND5E.conditionTypes?.slowed;
		const level = Number(this.conditions?.slowed) || 0;
		if ( !cfg || (level < 1) || (level >= 4) || !["character", "npc"].includes(this.parent?.type) ) return wrapped(...args);
		const ft = Number(cfg.speedReduction?.[level]?.ft) || 0;
		const hadOwn = Object.hasOwn(cfg, "reduction");
		const previous = cfg.reduction;
		cfg.reduction = { ...(previous ?? {}), speed: ft / level }; // dnd5e multiplies this by the condition level
		try {
			return wrapped(...args);
		} finally {
			if ( hadOwn ) cfg.reduction = previous;
			else delete cfg.reduction;
		}
	}, "WRAPPER");
}

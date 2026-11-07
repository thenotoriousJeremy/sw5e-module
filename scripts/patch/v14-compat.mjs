/**
 * Small Foundry v14 / dnd5e 6 compatibility fix.
 *
 * dnd5e's damage application card calls `getGroupingKey()` on every damage target. TokenDocument5e defines it,
 * but a target that resolves to an Actor (no token on the canvas) does not, which throws while the card renders.
 * Returning null makes dnd5e fall back to the target's UUID, exactly as it does for linked tokens.
 *
 * Earlier versions of this file also carried polyfills for other modules (TinyMCE, CombatTracker#getData,
 * array-style scene controls) and guards that hid Hit Point / Hit Dice preparation errors. None of the active
 * modules need those on Foundry 14.369 / dnd5e 6.0.6, so they were removed. The only third-party stub kept is
 * the Perceptive/Levels one below.
 */
function patchActorGroupingKey() {
	const ActorCls = globalThis.dnd5e?.documents?.Actor5e;
	if ( ActorCls?.prototype && (typeof ActorCls.prototype.getGroupingKey !== "function") ) {
		ActorCls.prototype.getGroupingKey = function() {
			return null;
		};
	}
}

Hooks.once("init", patchActorGroupingKey);

/**
 * Third-party conflict: Perceptive 6.0.9 wraps `CONFIG.Levels.handlers.SightHandler.shouldIgnoreWall` in its init
 * hook, but Levels 7 on Foundry 14 no longer provides a SightHandler. The failed registration throws and aborts the
 * rest of Perceptive's compatibility setup (including its Monk's Active Tiles triggers). Provide an inert stub only
 * when both modules are active. Levels itself never calls it, so it has no effect on vision.
 * Remove this once Perceptive supports Levels 7.
 */
function ensureLevelsSightHandlerStub(levels) {
	if ( !levels || (typeof levels !== "object") ) return levels;
	levels.handlers ??= {};
	levels.handlers.SightHandler ??= {
		shouldIgnoreWall: () => false,
		testCollision: () => null
	};
	return levels;
}

// Levels assigns `CONFIG.Levels = {...}` during its own setup, and Perceptive reads it during init, so the stub is
// injected lazily through an accessor (module data isn't available yet when this file is evaluated).
if ( globalThis.CONFIG && !Object.getOwnPropertyDescriptor(CONFIG, "Levels")?.get ) {
	let levelsConfig = CONFIG.Levels;
	try {
		Object.defineProperty(CONFIG, "Levels", {
			configurable: true,
			enumerable: true,
			get: () => (game.modules?.get?.("perceptive")?.active ? ensureLevelsSightHandlerStub(levelsConfig) : levelsConfig),
			set: value => { levelsConfig = value; }
		});
	} catch(err) {
		console.warn("SW5E | Could not install the Levels SightHandler stub for Perceptive", err);
	}
}

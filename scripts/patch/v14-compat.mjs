/**
 * Compatibility polyfills for legacy modules running on Foundry V14.
 * Shields the world from un-migrated third-party modules (Token Variant Art, Levels, Quick Insert, Monk's TokenBar).
 */
export function applyV14CompatPolyfills() {
	// 1. TinyMCE polyfill for quick-insert and monks-tokenbar
	if ( typeof globalThis.tinymce === "undefined" ) {
		const dummyTinyMCE = {
			PluginManager: {
				add: () => {},
				get: () => null
			},
			init: () => {},
			get: () => null,
			activeEditor: null
		};
		globalThis.tinymce = dummyTinyMCE;
		globalThis.tinyMCE = dummyTinyMCE;
	}

	// 2. CombatTracker.prototype.getData polyfill for token-variants libWrapper registration
	const ctProto = globalThis.CombatTracker?.prototype;
	if ( ctProto && typeof ctProto.getData !== "function" ) {
		ctProto.getData = async function(...args) {
			return typeof this._prepareContext === "function" ? await this._prepareContext(...args) : {};
		};
	}

	// 3. getSceneControlButtons Array-methods polyfill for levels and other legacy UI modules
	if ( typeof globalThis.Hooks?.callAll === "function" && !globalThis.Hooks.callAll._sw5eControlsPatched ) {
		const origCallAll = globalThis.Hooks.callAll;
		globalThis.Hooks.callAll = function(hook, ...args) {
			if ( hook === "getSceneControlButtons" && args[0] && typeof args[0] === "object" && !Array.isArray(args[0]) ) {
				const controls = args[0];
				const polyfills = {
					find: fn => Object.values(controls).find(fn),
					filter: fn => Object.values(controls).filter(fn),
					forEach: fn => Object.values(controls).forEach(fn),
					some: fn => Object.values(controls).some(fn),
					map: fn => Object.values(controls).map(fn)
				};
				for ( const [method, impl] of Object.entries(polyfills) ) {
					if ( typeof controls[method] !== "function" ) {
						try {
							Object.defineProperty(controls, method, {
								value: impl,
								enumerable: false,
								configurable: true
							});
						} catch (_) {}
					}
				}
			}
			return origCallAll.call(this, hook, ...args);
		};
		globalThis.Hooks.callAll._sw5eControlsPatched = true;
	}
}

// Execute immediately upon module script evaluation
applyV14CompatPolyfills();

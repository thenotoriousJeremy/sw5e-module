/**
 * Compatibility polyfills for legacy modules running on Foundry V14.
 * Shields the world from un-migrated third-party modules (Token Variant Art, Levels, Quick Insert, Monk's TokenBar, Perceptive).
 */

function ensureToolsArrayMethods(tools) {
	if ( !tools || typeof tools !== "object" ) return;

	const methods = {
		push: function(...items) {
			for ( const item of items ) {
				if ( !item || typeof item !== "object" ) continue;
				const key = item.name ?? item.id ?? foundry.utils?.randomID?.() ?? Math.random().toString(36).slice(2);
				this[key] = item;
			}
			return Object.keys(this).length;
		},
		find: function(fn) {
			return Object.values(this).find(fn);
		},
		filter: function(fn) {
			return Object.values(this).filter(fn);
		},
		forEach: function(fn) {
			return Object.values(this).forEach(fn);
		},
		some: function(fn) {
			return Object.values(this).some(fn);
		},
		map: function(fn) {
			return Object.values(this).map(fn);
		},
		includes: function(item) {
			return Object.values(this).includes(item);
		},
		indexOf: function(item) {
			return Object.values(this).indexOf(item);
		},
		findIndex: function(fn) {
			return Object.values(this).findIndex(fn);
		},
		splice: function(start, deleteCount, ...items) {
			const vals = Object.values(this);
			const removed = vals.splice(start, deleteCount, ...items);
			for ( const key of Object.keys(this) ) delete this[key];
			for ( const item of vals ) {
				const key = item.name ?? item.id ?? foundry.utils?.randomID?.() ?? Math.random().toString(36).slice(2);
				this[key] = item;
			}
			return removed;
		}
	};

	for ( const [method, impl] of Object.entries(methods) ) {
		if ( typeof tools[method] !== "function" ) {
			try {
				Object.defineProperty(tools, method, {
					value: impl,
					enumerable: false,
					configurable: true,
					writable: true
				});
			} catch (_) {}
		}
	}

	if ( typeof tools[Symbol.iterator] !== "function" ) {
		try {
			Object.defineProperty(tools, Symbol.iterator, {
				value: function*() {
					yield* Object.values(this);
				},
				enumerable: false,
				configurable: true,
				writable: true
			});
		} catch (_) {}
	}

	if ( !("length" in tools) ) {
		try {
			Object.defineProperty(tools, "length", {
				get: function() {
					return Object.keys(this).length;
				},
				enumerable: false,
				configurable: true
			});
		} catch (_) {}
	}
}

function ensureControlsCompat(controls) {
	if ( !controls || typeof controls !== "object" ) return;

	// 1. Normalize each existing control and its tools
	for ( const [key, control] of Object.entries(controls) ) {
		if ( !control || typeof control !== "object" ) continue;
		control.name ??= control.id ?? key;
		control.id ??= control.name ?? key;
		control.tools ??= {};
		ensureToolsArrayMethods(control.tools);
	}

	// 2. Add singular/plural aliases on controls (e.g. controls.token -> controls.tokens)
	const aliases = {
		token: "tokens",
		template: "templates",
		tile: "tiles",
		drawing: "drawings",
		wall: "walls",
		light: "lighting",
		sound: "sounds",
		note: "notes",
		region: "regions"
	};
	for ( const [singular, plural] of Object.entries(aliases) ) {
		if ( controls[plural] && !controls[singular] ) {
			try {
				Object.defineProperty(controls, singular, {
					get: () => controls[plural],
					set: v => { controls[plural] = v; },
					enumerable: false,
					configurable: true
				});
			} catch (_) {}
		} else if ( controls[singular] && !controls[plural] ) {
			try {
				Object.defineProperty(controls, plural, {
					get: () => controls[singular],
					set: v => { controls[singular] = v; },
					enumerable: false,
					configurable: true
				});
			} catch (_) {}
		}
	}

	// 3. Array methods on controls object
	const arrayMethods = {
		find: function(fn) {
			const values = Object.values(this);
			// Direct match
			let res = values.find(fn);
			if ( res ) return res;

			// Singular/plural alias match
			for ( const c of values ) {
				if ( !c || typeof c !== "object" ) continue;
				const name = c.name ?? c.id;
				if ( typeof name !== "string" ) continue;
				const variants = [];
				if ( name.endsWith("s") ) variants.push(name.slice(0, -1));
				else variants.push(name + "s");
				if ( name === "lighting" ) variants.push("light");
				if ( name === "drawings" ) variants.push("drawing");

				for ( const v of variants ) {
					const proxy = new Proxy(c, {
						get(target, prop, receiver) {
							if ( prop === "name" || prop === "id" ) return v;
							return Reflect.get(target, prop, receiver);
						}
					});
					try {
						if ( fn(proxy) ) return c;
					} catch (_) {}
				}
			}

			// Heuristic fallback for token controls
			try {
				const fnStr = fn?.toString?.() || "";
				if ( fnStr.includes("token") ) {
					res = this.tokens ?? this.token ?? values.find(c => (c.name ?? c.id)?.includes("token"));
					if ( res ) return res;
				}
			} catch (_) {}

			return undefined;
		},
		filter: function(fn) {
			return Object.values(this).filter(fn);
		},
		forEach: function(fn) {
			return Object.values(this).forEach(fn);
		},
		some: function(fn) {
			return Object.values(this).some(fn);
		},
		map: function(fn) {
			return Object.values(this).map(fn);
		},
		includes: function(item) {
			return Object.values(this).includes(item);
		},
		indexOf: function(item) {
			return Object.values(this).indexOf(item);
		},
		findIndex: function(fn) {
			return Object.values(this).findIndex(fn);
		},
		push: function(...items) {
			for ( const item of items ) {
				if ( !item || typeof item !== "object" ) continue;
				const key = item.name ?? item.id ?? foundry.utils?.randomID?.() ?? Math.random().toString(36).slice(2);
				item.tools ??= {};
				ensureToolsArrayMethods(item.tools);
				this[key] = item;
			}
			return Object.keys(this).length;
		}
	};

	for ( const [method, impl] of Object.entries(arrayMethods) ) {
		try {
			Object.defineProperty(controls, method, {
				value: impl,
				enumerable: false,
				configurable: true,
				writable: true
			});
		} catch (_) {}
	}

	if ( typeof controls[Symbol.iterator] !== "function" ) {
		try {
			Object.defineProperty(controls, Symbol.iterator, {
				value: function*() {
					yield* Object.values(this);
				},
				enumerable: false,
				configurable: true,
				writable: true
			});
		} catch (_) {}
	}

	if ( !("length" in controls) ) {
		try {
			Object.defineProperty(controls, "length", {
				get: function() {
					return Object.keys(this).length;
				},
				enumerable: false,
				configurable: true
			});
		} catch (_) {}
	}
}

const ensureLevelsSightHandler = levelsObj => {
	if ( !levelsObj || typeof levelsObj !== "object" ) return;
	levelsObj.handlers ??= {};
	levelsObj.handlers.SightHandler ??= {
		shouldIgnoreWall: function() {
			return false;
		}
	};
};

export function applyV14CompatPolyfills() {
	// 1. TinyMCE polyfill for quick-insert and monks-tokenbar
	const dummyTinyMCE = {
		PluginManager: {
			add: () => {},
			get: () => null
		},
		init: () => {},
		get: () => null,
		activeEditor: null,
		ui: {
			registry: {
				addButton: () => {},
				addMenuItem: () => {}
			}
		}
	};
	if ( typeof globalThis.tinymce === "undefined" ) globalThis.tinymce = dummyTinyMCE;
	if ( typeof globalThis.tinyMCE === "undefined" ) globalThis.tinyMCE = dummyTinyMCE;

	const ensureConfigTinyMCE = () => {
		if ( typeof globalThis.CONFIG !== "undefined" && globalThis.CONFIG ) {
			globalThis.CONFIG.TinyMCE ??= {
				plugins: "",
				toolbar: "",
				style_formats: []
			};
		}
	};

	if ( typeof globalThis.CONFIG === "undefined" ) {
		let _config = undefined;
		Object.defineProperty(globalThis, "CONFIG", {
			configurable: true,
			enumerable: true,
			get: () => _config,
			set: val => {
				_config = val;
				if ( _config && typeof _config === "object" ) {
					_config.TinyMCE ??= { plugins: "", toolbar: "", style_formats: [] };
				}
			}
		});
	} else {
		ensureConfigTinyMCE();
	}

	if ( globalThis.Hooks?.on ) {
		globalThis.Hooks.on("init", ensureConfigTinyMCE);
	}

	// 2. CombatTracker.prototype.getData polyfill for token-variants libWrapper registration
	// Access via namespaced path first to prevent deprecation warnings on globalThis.CombatTracker
	const CombatTrackerCls = globalThis.foundry?.applications?.sidebar?.tabs?.CombatTracker ?? globalThis.CombatTracker;
	const ctProto = CombatTrackerCls?.prototype;
	if ( ctProto && typeof ctProto.getData !== "function" ) {
		ctProto.getData = async function(...args) {
			return typeof this._prepareContext === "function" ? await this._prepareContext(...args) : {};
		};
	}

	// 3. CONFIG.Levels.handlers.SightHandler polyfill for Perceptive compatibility
	if ( globalThis.CONFIG ) {
		let _levels = globalThis.CONFIG.Levels;
		try {
			Object.defineProperty(globalThis.CONFIG, "Levels", {
				configurable: true,
				enumerable: true,
				get: () => {
					if ( !_levels ) _levels = { handlers: {} };
					ensureLevelsSightHandler(_levels);
					return _levels;
				},
				set: val => {
					_levels = val;
					ensureLevelsSightHandler(_levels);
				}
			});
		} catch (_) {}
		if ( _levels ) ensureLevelsSightHandler(_levels);
	}

	if ( globalThis.Hooks?.on ) {
		globalThis.Hooks.on("init", () => {
			if ( globalThis.CONFIG?.Levels ) {
				ensureLevelsSightHandler(globalThis.CONFIG.Levels);
			}
		});
	}

	// 4. Defensive guard for Item5e activities iteration and scaleValues
	const ItemCls = globalThis.dnd5e?.documents?.Item5e;
	if ( ItemCls?.prototype ) {
		const origItemPrep = ItemCls.prototype.prepareEmbeddedDocuments;
		if ( typeof origItemPrep === "function" && !origItemPrep._sw5eIterPatched ) {
			ItemCls.prototype.prepareEmbeddedDocuments = function(...args) {
				const activities = this.system?.activities;
				if ( activities && typeof activities === "object" && typeof activities[Symbol.iterator] !== "function" ) {
					try {
						Object.defineProperty(activities, Symbol.iterator, {
							value: function*() {
								yield* Object.values(this);
							},
							enumerable: false,
							configurable: true
						});
					} catch (_) {}
				}
				this.advancement ??= { byType: {} };
				this.advancement.byType ??= {};
				return origItemPrep.apply(this, args);
			};
			ItemCls.prototype.prepareEmbeddedDocuments._sw5eIterPatched = true;
		}

		const desc = Object.getOwnPropertyDescriptor(ItemCls.prototype, "scaleValues");
		if ( desc?.get && !desc.get._sw5eGuarded ) {
			const origGet = desc.get;
			Object.defineProperty(ItemCls.prototype, "scaleValues", {
				get: function() {
					this.advancement ??= { byType: {} };
					this.advancement.byType ??= {};
					try {
						return origGet.call(this);
					} catch (_) {
						return {};
					}
				},
				enumerable: desc.enumerable,
				configurable: desc.configurable
			});
			ItemCls.prototype.scaleValues._sw5eGuarded = true;
		}
	}

	// 5. getSceneControlButtons Array-methods polyfill for levels and other legacy UI modules
	if ( typeof globalThis.Hooks?.callAll === "function" && !globalThis.Hooks.callAll._sw5eControlsPatched ) {
		const origCallAll = globalThis.Hooks.callAll;
		globalThis.Hooks.callAll = function(hook, ...args) {
			if ( hook === "getSceneControlButtons" && args[0] && typeof args[0] === "object" && !Array.isArray(args[0]) ) {
				const controls = args[0];
				ensureControlsCompat(controls);

				const result = origCallAll.call(this, hook, ...args);

				// Post-hook cleanup: normalize any tools that legacy modules may have assigned as an Array
				for ( const [controlId, control] of Object.entries(controls) ) {
					if ( !control || typeof control !== "object" ) continue;
					if ( Array.isArray(control.tools) ) {
						const arr = control.tools;
						const toolsObj = {};
						for ( const tool of arr ) {
							if ( !tool || typeof tool !== "object" ) continue;
							const key = tool.name ?? tool.id ?? foundry.utils?.randomID?.() ?? Math.random().toString(36).slice(2);
							toolsObj[key] = tool;
						}
						ensureToolsArrayMethods(toolsObj);
						control.tools = toolsObj;
					}
				}

				return result;
			}
			return origCallAll.call(this, hook, ...args);
		};
		globalThis.Hooks.callAll._sw5eControlsPatched = true;
	}
}

// Execute immediately upon module script evaluation
applyV14CompatPolyfills();

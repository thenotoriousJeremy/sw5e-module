import { getModuleId, localizeOrFallback } from "../module-support.mjs";

/**
 * Patch Argon Combat HUD (enhancedcombathud-dnd5e) for SW5E:
 * 1. Support SW5E Force & Tech powers in prePrepareSpells() with Force & Tech points tracking
 * 2. Relabel 'Cast Spell' to 'Cast Power' and update icon to Holocron / SW5E Power icon
 * 3. Add Maneuver item types to feat/action panels and show Superiority counter
 * 4. Add starship / vehicle support to Argon portrait panel (Hull, Shields, AC)
 */
let capturedItemButtonClass = null;

export function patchArgonCombatHud() {
	// Register on config hook if enhancedcombathud-dnd5e is present
	Hooks.on("enhanced-combat-hud.dnd5e.initConfig", ({ actionTypes, itemTypes, ECHItems }) => {
		if ( ECHItems?.DND5eItemButton ) capturedItemButtonClass = ECHItems.DND5eItemButton;
		if ( !itemTypes ) return;
		itemTypes.feat ??= ["feat"];
		if ( !itemTypes.feat.includes("sw5e-module.maneuver") ) {
			itemTypes.feat.push("sw5e-module.maneuver");
		}
		if ( !itemTypes.feat.includes("maneuver") ) {
			itemTypes.feat.push("maneuver");
		}
		itemTypes.maneuver = ["sw5e-module.maneuver", "maneuver"];
	});

	// Hook into argonInit to wrap main panels and portrait panel
	Hooks.on("argonInit", (CoreHud) => {
		if ( game.system.id !== "dnd5e" ) return;

		// Support starships / vehicles in Argon HUD
		try {
			CoreHud.defineSupportedActorTypes?.(["vehicle"]);
		} catch (e) {
			console.warn("SW5E | Could not register vehicle type with CoreHud:", e);
		}

		// Intercept definePortraitPanel to display Hull/Shields on starships & Power Points on characters
		const origDefinePortraitPanel = CoreHud.definePortraitPanel;
		if ( typeof origDefinePortraitPanel === "function" ) {
			CoreHud.definePortraitPanel = function(PortraitClass) {
				patchPortraitPanel(PortraitClass);
				return origDefinePortraitPanel.call(this, PortraitClass);
			};
		}

		// Intercept defineMainPanels to patch DND5eButtonPanelButton & action panels
		const origDefineMainPanels = CoreHud.defineMainPanels;
		if ( typeof origDefineMainPanels === "function" ) {
			CoreHud.defineMainPanels = function(mainPanels) {
				patchMainPanels(mainPanels, CoreHud);
				return origDefineMainPanels.call(this, mainPanels);
			};
		}
	});
}

function patchPortraitPanel(PortraitClass) {
	if ( !PortraitClass?.prototype || PortraitClass._sw5ePatched ) return;
	PortraitClass._sw5ePatched = true;

	const origGetStatBlocks = PortraitClass.prototype.getStatBlocks;
	PortraitClass.prototype.getStatBlocks = async function() {
		const actor = this.actor;
		if ( !actor ) return origGetStatBlocks ? origGetStatBlocks.call(this) : [];

		const isStarship = actor.type === "vehicle" || actor.flags?.sw5e?.legacyStarshipActor?.type === "starship";

		// Starship custom stat blocks: Hull Points, Shields, AC
		if ( isStarship ) {
			const hull = actor.system?.attributes?.hullPoints ?? actor.system?.attributes?.hp ?? {};
			const shields = actor.system?.attributes?.shieldPoints ?? actor.system?.attributes?.shields ?? {};
			const ac = actor.system?.attributes?.ac?.value ?? "-";

			const hullVal = Number(hull.value ?? 0);
			const hullMax = Number(hull.max ?? 0);
			const shieldVal = Number(shields.value ?? 0);
			const shieldMax = Number(shields.max ?? 0);

			return [
				[
					{ text: `${hullVal}`, color: "#ff6644" },
					{ text: "/" },
					{ text: `${hullMax}`, color: "#ffffff" },
					{ text: " HULL" }
				],
				[
					{ text: `${shieldVal}`, color: "#44aaff" },
					{ text: "/" },
					{ text: `${shieldMax}`, color: "#ffffff" },
					{ text: " SHLD" }
				],
				[
					{ text: "AC" },
					{ text: `${ac}`, color: "var(--ech-movement-baseMovement-background)" }
				]
			];
		}

		// Ground characters / NPCs
		const statBlocks = origGetStatBlocks ? await origGetStatBlocks.call(this) : [];
		const powercasting = actor.system?.powercasting ?? {};
		const forcePoints = powercasting.force?.points;
		const techPoints = powercasting.tech?.points;
		const hasForce = Number.isFinite(Number(forcePoints?.max)) && forcePoints.max > 0;
		const hasTech = Number.isFinite(Number(techPoints?.max)) && techPoints.max > 0;

		// Replace or augment SpellDC block with Force/Tech points if available
		if ( hasForce || hasTech ) {
			// Find and remove the stock spell DC block (index 2)
			const filtered = statBlocks.slice(0, 2);
			if ( hasForce ) {
				filtered.push([
					{ text: `${forcePoints.value ?? 0}`, color: "#aa66ff" },
					{ text: "/" },
					{ text: `${forcePoints.max ?? 0}`, color: "#ffffff" },
					{ text: " FP" }
				]);
			}
			if ( hasTech ) {
				filtered.push([
					{ text: `${techPoints.value ?? 0}`, color: "#00ccff" },
					{ text: "/" },
					{ text: `${techPoints.max ?? 0}`, color: "#ffffff" },
					{ text: " TP" }
				]);
			}
			return filtered;
		}

		return statBlocks;
	};
}

function patchMainPanels(mainPanels, CoreHud) {
	for ( const panelClass of mainPanels ) {
		if ( !panelClass?.prototype?._getButtons || panelClass._sw5ePatched ) continue;
		panelClass._sw5ePatched = true;

		const origGetButtons = panelClass.prototype._getButtons;
		panelClass.prototype._getButtons = async function(...args) {
			const buttons = await origGetButtons.apply(this, args);

			// Extract button and item button constructors
			let ItemButtonClass = null;
			let ButtonPanelButtonClass = null;

			for ( const b of buttons ) {
				if ( !b ) continue;
				if ( b.constructor?.name === "DND5eItemButton" ) ItemButtonClass = b.constructor;
				else if ( b.constructor?.name === "DND5eButtonPanelButton" ) ButtonPanelButtonClass = b.constructor;
				else if ( b.firstButton?.constructor?.name === "DND5eItemButton" ) ItemButtonClass = b.firstButton.constructor;
			}

			if ( ButtonPanelButtonClass ) {
				patchDnd5eButtonPanelButton(ButtonPanelButtonClass, ItemButtonClass, CoreHud);
			}

			// Add Maneuvers button on Action panel if actor has maneuvers
			const actor = this.actor;
			if ( actor && ButtonPanelButtonClass && ItemButtonClass ) {
				const isActionPanel = this.constructor?.name === "DND5eActionActionPanel";
				if ( isActionPanel ) {
					const maneuverItems = actor.items.filter(i =>
						i.type === "sw5e-module.maneuver" ||
						i.system?.type?.value === "maneuver" ||
						(i.type === "feat" && i.name?.toLowerCase().includes("maneuver"))
					);
					const superiority = actor.system?.superiority ?? {};
					const maxDice = Number(superiority.dice?.max ?? 0);

					if ( maneuverItems.length > 0 || maxDice > 0 ) {
						const alreadyHasManeuverButton = buttons.some(b => b?.type === "maneuver");
						if ( !alreadyHasManeuverButton && maneuverItems.length > 0 ) {
							const maneuverButton = new ButtonPanelButtonClass({
								type: "maneuver",
								items: maneuverItems,
								color: 0
							});
							buttons.push(maneuverButton);
						}
					}
				}
			}

			return buttons;
		};
	}
}

function patchDnd5eButtonPanelButton(ButtonClass, ItemButtonClass, CoreHud) {
	if ( !ButtonClass?.prototype || ButtonClass._sw5ePatched ) return;
	ButtonClass._sw5ePatched = true;

	if ( ItemButtonClass ) {
		ButtonClass._itemButtonClass = ItemButtonClass;
	}
	if ( CoreHud ) {
		ButtonClass._coreHud = CoreHud;
	}

	// 1. Label getter override
	const origLabel = Object.getOwnPropertyDescriptor(ButtonClass.prototype, "label");
	Object.defineProperty(ButtonClass.prototype, "label", {
		get() {
			if ( this.type === "spell" ) {
				return localizeOrFallback("SW5E.Powercasting.CastPower", "Cast Power");
			}
			if ( this.type === "maneuver" ) {
				return localizeOrFallback("TYPES.Item.sw5e-module.maneuverPl", "Maneuvers");
			}
			return origLabel?.get?.call(this) ?? "";
		},
		configurable: true
	});

	// 2. Icon getter override
	const origIcon = Object.getOwnPropertyDescriptor(ButtonClass.prototype, "icon");
	Object.defineProperty(ButtonClass.prototype, "icon", {
		get() {
			if ( this.type === "spell" ) {
				return "modules/sw5e-module/icons/svg/schools/universal.svg";
			}
			if ( this.type === "maneuver" ) {
				return "modules/sw5e-module/icons/packs/Maneuvers/AssessTheSituation.webp";
			}
			return origIcon?.get?.call(this) ?? "";
		},
		configurable: true
	});

	// 3. showPreparedOnly getter override
	Object.defineProperty(ButtonClass.prototype, "showPreparedOnly", {
		get() {
			const preparedFlag = this.actor?.getFlag?.("enhancedcombathud-dnd5e", "showPrepared");
			if ( preparedFlag === "all" ) return false;
			return true;
		},
		configurable: true
	});

	// 4. prePrepareSpells override for SW5E Powercasting
	ButtonClass.prototype.prePrepareSpells = function() {
		if ( this.type !== "spell" ) return;

		const actor = this.actor;
		if ( !actor ) return [];

		const spellLevels = CONFIG.DND5E.spellLevels ?? {};
		const itemsToIgnore = [];
		const magicItems = new Map();

		// Handle cached items from item activities
		this.items.filter(item => item?.flags?.dnd5e?.cachedFor).forEach(is => {
			const activity = fromUuidSync(actor.documentName + "." + actor.id + is.flags.dnd5e.cachedFor);
			itemsToIgnore.push(is);
			if ( !activity?.displayInSpellbook ) return;
			const magicItem = activity.item;
			const current = magicItems.get(magicItem);
			current ? current.push(is) : magicItems.set(magicItem, [is]);
		});

		const ItemBtnClass = this.constructor._itemButtonClass
			|| capturedItemButtonClass
			|| CONFIG.ARGON?.DND5E?.ECHItems?.DND5eItemButton
			|| this.constructor._coreHud?.ARGON?.MAIN?.BUTTONS?.ItemButton
			|| CoreHud?.ARGON?.MAIN?.BUTTONS?.ItemButton
			|| globalThis.CONFIG?.ARGON?.MAIN?.BUTTONS?.ItemButton;

		for ( const [item, spells] of magicItems ) {
			this.itemsWithSpells.push({
				label: item.name,
				buttons: spells.map(spell => new ItemBtnClass({ item: spell })),
				uses: () => ({ max: item.system?.uses?.max, value: item.system?.uses?.value })
			});
		}

		let availableItems = this.items.filter(item => !itemsToIgnore.includes(item));

		// Filter prepared powers
		if ( this.showPreparedOnly ) {
			const allowIfNotPrepared = ["atwill", "innate", "pact"];
			availableItems = availableItems.filter(item => {
				const method = item.system?.method;
				if ( allowIfNotPrepared.includes(method) ) return true;
				if ( Number(item.system?.level ?? 0) === 0 ) return true;
				return Boolean(item.system?.preparation?.prepared ?? item.system?.prepared);
			});
		}

		// Separate into At-Will, Force Powers, Tech Powers, and generic/legacy spells
		const atWillPowers = [];
		const forcePowersByLevel = {};
		const techPowersByLevel = {};
		const genericSpellsByLevel = {};

		for ( const item of availableItems ) {
			const level = Number(item.system?.level ?? 0);
			const school = item.system?.school ?? "";
			const isForce = ["lgt", "drk", "uni"].includes(school);
			const isTech = school === "tec";
			const isPower = item.system?.method === "powerCasting" || isForce || isTech;

			if ( level === 0 || item.system?.method === "atwill" ) {
				atWillPowers.push(item);
			} else if ( isForce ) {
				forcePowersByLevel[level] ??= [];
				forcePowersByLevel[level].push(item);
			} else if ( isTech ) {
				techPowersByLevel[level] ??= [];
				techPowersByLevel[level].push(item);
			} else if ( isPower ) {
				// Leveled power with unspecified school defaults to Force
				forcePowersByLevel[level] ??= [];
				forcePowersByLevel[level].push(item);
			} else {
				genericSpellsByLevel[level] ??= [];
				genericSpellsByLevel[level].push(item);
			}
		}

		const makeButtons = items => {
			if ( !ItemBtnClass ) return [];
			return items.map(item => new ItemBtnClass({ item }));
		};

		const categories = [...this.itemsWithSpells];

		// 1. At-Will Powers Category
		if ( atWillPowers.length > 0 ) {
			categories.push({
				label: localizeOrFallback("SW5E.PowerCasting.AtWill", "At-Will Powers"),
				buttons: makeButtons(atWillPowers),
				uses: { max: Infinity, value: Infinity }
			});
		}

		// 2. Force Powers Categories (by Level)
		const forceData = actor.system?.powercasting?.force;
		const forceLimit = Number(forceData?.limit) || 6;
		const sortedForceLevels = Object.keys(forcePowersByLevel).map(Number).sort((a, b) => a - b);
		for ( const lvl of sortedForceLevels ) {
			const items = forcePowersByLevel[lvl];
			if ( !items?.length ) continue;
			const cost = lvl + 1; // SW5E standard point cost
			const lvlLabel = spellLevels[lvl] ? game.i18n.localize(spellLevels[lvl]) : `Level ${lvl}`;
			const isHighLevel = lvl >= forceLimit;
			categories.push({
				label: `Force: ${lvlLabel} (${cost} FP)`,
				buttons: makeButtons(items),
				...(isHighLevel ? {
					uses: () => {
						const fp = actor.system?.powercasting?.force?.points;
						const used = actor.system?.powercasting?.force?.used;
						const isUsed = used instanceof Set ? used.has(lvl) : (Array.isArray(used) && used.includes(lvl));
						const canAfford = (fp?.value ?? 0) >= cost;
						return { max: 1, value: isUsed || !canAfford ? 0 : 1 };
					}
				} : {})
			});
		}

		// 3. Tech Powers Categories (by Level)
		const techData = actor.system?.powercasting?.tech;
		const techLimit = Number(techData?.limit) || 6;
		const sortedTechLevels = Object.keys(techPowersByLevel).map(Number).sort((a, b) => a - b);
		for ( const lvl of sortedTechLevels ) {
			const items = techPowersByLevel[lvl];
			if ( !items?.length ) continue;
			const cost = lvl + 1; // SW5E standard point cost
			const lvlLabel = spellLevels[lvl] ? game.i18n.localize(spellLevels[lvl]) : `Level ${lvl}`;
			const isHighLevel = lvl >= techLimit;
			categories.push({
				label: `Tech: ${lvlLabel} (${cost} TP)`,
				buttons: makeButtons(items),
				...(isHighLevel ? {
					uses: () => {
						const tp = actor.system?.powercasting?.tech?.points;
						const used = actor.system?.powercasting?.tech?.used;
						const isUsed = used instanceof Set ? used.has(lvl) : (Array.isArray(used) && used.includes(lvl));
						const canAfford = (tp?.value ?? 0) >= cost;
						return { max: 1, value: isUsed || !canAfford ? 0 : 1 };
					}
				} : {})
			});
		}

		// 4. Generic / Legacy Spells (if any)
		for ( const [lvl, items] of Object.entries(genericSpellsByLevel) ) {
			if ( !items?.length ) continue;
			const lvlLabel = spellLevels[lvl] ? game.i18n.localize(spellLevels[lvl]) : `Level ${lvl}`;
			categories.push({
				label: lvlLabel,
				buttons: makeButtons(items),
				uses: () => actor.system?.spells?.[`spell${lvl}`] ?? { max: 0, value: 0 }
			});
		}

		return categories.filter(cat => cat.buttons?.length);
	};
}

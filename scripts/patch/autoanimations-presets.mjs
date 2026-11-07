/**
 * Automated Animations Presets for SW5E
 *
 * Bridges Star Wars 5e weapons, Force powers, and Tech powers to visual (VFX) and sound (SFX)
 * assets via Automated Animations, JB2A, Sequencer, and PSFX.
 * Intercepts AutomatedAnimations-WorkflowStart when no manual animation is assigned to an item,
 * assigning appropriate JB2A laser shots, plasma blades, and force/tech power visual effects
 * paired with synchronized audio effects.
 */

const SW5E_EXACT_POWER_MAP = Object.freeze({
	// Lightning & Electricity
	"force lightning": "Witch Bolt",
	"sustained lightning": "Witch Bolt",
	"shocking ray": "Witch Bolt",
	"chain lightning": "Chain Lightning",
	"lightning strike": "Lightning Bolt",
	"lightning storm": "Call Lightning",
	"force shock": "Shocking Grasp",
	"shock": "Shocking Grasp",
	"ionic bond": "Shocking Grasp",
	"electroshock": "Shocking Grasp",
	"short circuit": "Shocking Grasp",
	"charge": "Shocking Grasp",
	"electromesh": "Web",
	"electrical burst": "Shocking Grasp",

	// Force Push, Pull & Telekinesis
	"force push": "Gust of Wind",
	"force pull": "Gust of Wind",
	"force push/pull": "Gust of Wind",
	"force propel": "Gust of Wind",
	"force throw": "Gust of Wind",
	"propel": "Gust of Wind",
	"force wave": "Thunderwave",
	"force whirlwind": "Gust of Wind",
	"telekinesis": "Telekinesis",
	"telekinetic storm": "Call Lightning",
	"telekinetic wave": "Thunderwave",
	"telekinetic burst": "Thunderwave",
	"turbulence": "Gust of Wind",
	"tremor": "Thunderwave",
	"earthquake": "Earthquake",

	// Speed, Leap & Mobility
	"force jump": "Misty Step",
	"force leap": "Misty Step",
	"jump": "Misty Step",
	"jump jet": "Misty Step",
	"jet pack": "Misty Step",
	"phasestrike": "Misty Step",
	"phasewalk": "Misty Step",
	"translocate": "Misty Step",
	"instant translocation": "Misty Step",
	"greater translocate": "Dimension Door",
	"vertical maneuver": "Misty Step",
	"force speed": "Longstrider",
	"burst of speed": "Longstrider",
	"knight speed": "Haste",
	"master speed": "Haste",
	"slow": "Slow",
	"force slow": "Slow",
	"glide": "Feather Fall",

	// Healing, Kolto & Bacta
	"heal": "Cure Wounds",
	"force heal": "Cure Wounds",
	"greater heal": "Cure Wounds",
	"kolto infusion": "Cure Wounds",
	"kolto dispenser": "Cure Wounds",
	"kolto cloud": "Healing Word",
	"kolto pack": "Cure Wounds",
	"kolto vapor": "Healing Word",
	"kolto waves": "Mass Cure Wounds",
	"bacta spray": "Cure Wounds",
	"bacta pack": "Cure Wounds",
	"slow-release medpac": "Cure Wounds",
	"aid droid": "Cure Wounds",
	"repair droid": "Cure Wounds",
	"revitalize": "Revivify",
	"resuscitate": "Revivify",
	"restore": "Lesser Restoration",
	"restoration": "Greater Restoration",
	"defibrillate": "Cure Wounds",
	"vitality transfer": "Cure Wounds",

	// Fire, Thermal & Explosions
	"combustion": "Fire Bolt",
	"pyrokinesis": "Scorching Ray",
	"flame sweep": "Burning Hands",
	"burst of flame": "Burning Hands",
	"fire storm": "Fire Storm",
	"fireball": "Fireball",
	"combustive shot": "Fire Bolt",
	"delayed detonator": "Fireball",
	"thermal detonator": "Fireball",
	"explosion": "Fireball",
	"salvo": "Fireball",
	"incendiary": "Fire Bolt",
	"oil slick": "Grease",

	// Cryo & Cold
	"cryokinesis": "Ray of Frost",
	"cryogenic blast": "Ice Knife",
	"cryogenic blow": "Ray of Frost",
	"cryogenic wave": "Cone of Cold",
	"cryogenic storm": "Cone of Cold",
	"cryogenic spray": "Cone of Cold",
	"cryogenic burst": "Ice Knife",
	"cryogenic suspension": "Hold Person",
	"rime strike": "Ray of Frost",
	"rime shot": "Ray of Frost",

	// Acid, Poison & Radiation
	"radiation": "Acid Splash",
	"acid wind": "Acid Splash",
	"acid splash": "Acid Splash",
	"acid dart": "Acid Arrow",
	"acid arrow": "Acid Arrow",
	"corrosive sphere": "Acid Splash",
	"toxic cloud": "Stinking Cloud",
	"poison dart": "Poison Spray",
	"toxin scan": "Detect Thoughts",
	"truth serum": "Detect Thoughts",

	// Dark Side, Necrotic & Drain
	"dark side tendrils": "Arms of Hadar",
	"improved dark side tendrils": "Arms of Hadar",
	"armor of abeloth": "Armor of Agathys",
	"curse": "Bane",
	"denounce": "Vicious Mockery",
	"enfeeble": "Ray of Enfeeblement",
	"sap vitality": "Vampiric Touch",
	"drain life": "Vampiric Touch",
	"drain vitality": "Vampiric Touch",
	"siphon": "Vampiric Touch",
	"choke": "Arms of Hadar",
	"force choke": "Arms of Hadar",
	"crush": "Arms of Hadar",
	"wound": "Arms of Hadar",
	"plague": "Contagion",
	"affliction": "Bane",
	"kill": "Power Word Kill",
	"seethe": "Bless",

	// Mind, Control & Illusions
	"affect mind": "Charm Person",
	"cloud mind": "Charm Person",
	"mind trick": "Charm Person",
	"charm": "Charm Person",
	"suggest": "Suggestion",
	"dominate": "Dominate Person",
	"dominate beast": "Animal Friendship",
	"beast trick": "Animal Friendship",
	"feedback": "Dissonant Whispers",
	"improved feedback": "Dissonant Whispers",
	"psychic feedback": "Dissonant Whispers",
	"insanity": "Confusion",
	"confusion": "Confusion",
	"fear": "Fear",
	"horror": "Fear",
	"mislead": "Invisibility",
	"mirror image": "Mirror Image",
	"invisibility": "Invisibility",
	"invisibility to cameras": "Invisibility",
	"countermeasures": "Invisibility",
	"improved force camouflage": "Invisibility",
	"force camouflage": "Invisibility",
	"infiltrate": "Invisibility",

	// Stun, Droids & Barriers (Ontoken Sanctuary = Energy Field VFX + Sound)
	"stun droid": "Hold Monster",
	"shutdown": "Hold Monster",
	"holding cell": "Hold Person",
	"hold person": "Hold Person",
	"hold monster": "Hold Monster",
	"sever force": "Dispel Magic",
	"force breach": "Dispel Magic",
	"force immunity": "Sanctuary",
	"force barrier": "Sanctuary",
	"tactical barrier": "Sanctuary",
	"energy shield": "Sanctuary",
	"buffer": "Sanctuary",
	"security protocols": "Sanctuary",
	"magnetic field": "Sanctuary",
	"contingency": "Sanctuary",
	"capacity boost": "Heroism",
	"stack the deck": "Bless",
	"assess the situation": "True Strike",
	"tranquilizer": "Sleep",
	"paralyze humanoid": "Hold Person",

	// Detection, Analysis & Tech Protocols (Ontoken Divination = Rune VFX + Sound)
	"analyze": "Detect Thoughts",
	"greater analyze": "Detect Thoughts",
	"tactical advantage": "Detect Thoughts",
	"translation program": "Detect Thoughts",
	"darkvision": "Detect Thoughts",
	"detect enhancement": "Detect Thoughts",
	"detect invisibility": "Invisibility",
	"detect traps": "Detect Thoughts",
	"tracker droid interface": "Detect Thoughts",
	"scan area": "Detect Thoughts",
	"frequency scan": "Detect Thoughts",
	"sense emotion": "Detect Thoughts",
	"sense force": "Detect Thoughts",
	"danger sense": "Detect Thoughts",
	"heighten senses": "Detect Thoughts",
	"autonomous servant": "Sanctuary",
	"mending": "Cure Wounds",
	"spare the dying": "Cure Wounds",
	"force trance": "Bless",

	// Weapons, Combat & Miscellaneous
	"saber throw": "Lasersword",
	"saber assault": "Lasersword",
	"saber reflect": "Lasersword",
	"battle meditation": "Bless",
	"battle precognition": "Mage Armor",
	"battle insight": "Bless",
	"homing rockets": "Magic Missile",
	"tracer bolt": "Fire Bolt",
	"fabricate trap": "Alarm",
	"storming shot": "Witch Bolt",
	"jet of flame": "Burning Hands",
	"friendly fire": "Fire Bolt",
	"barrage": "Magic Missile",
	"overload": "Shatter",
	"break": "Shatter",
	"burst": "Thunderwave",
	"pheromone burst": "Thunderwave",
	"disintegrate": "Disintegrate",
	"alarm": "Alarm"
});

function itemHasProperty(item, prop) {
	const props = item?.system?.properties;
	if (!props) return false;
	if (props instanceof Set) return props.has(prop);
	if (Array.isArray(props)) return props.includes(prop);
	return Boolean(props[prop]);
}

function extractDamageTypes(item, activity) {
	const types = new Set();
	// Item damage parts
	const itemParts = item?.system?.damage?.parts;
	if (Array.isArray(itemParts)) {
		for (const part of itemParts) {
			const t = Array.isArray(part) ? part[1] : part?.type;
			if (t && typeof t === "string") types.add(t.toLowerCase().trim());
		}
	}
	// Activity damage parts
	const actParts = activity?.damage?.parts;
	if (Array.isArray(actParts)) {
		for (const part of actParts) {
			const tList = Array.isArray(part?.types) ? part.types : (part?.type ? [part.type] : []);
			for (const t of tList) {
				if (t && typeof t === "string") types.add(t.toLowerCase().trim());
			}
		}
	}
	return Array.from(types);
}

function resolvePowerOverride(item, activity) {
	const name = (item.name ?? item.label ?? "").toLowerCase().trim();

	// 1. Direct or partial match from curated SW5E map
	if (SW5E_EXACT_POWER_MAP[name]) {
		return [SW5E_EXACT_POWER_MAP[name]];
	}
	for (const [key, target] of Object.entries(SW5E_EXACT_POWER_MAP)) {
		if (name.includes(key)) {
			return [target];
		}
	}

	// 2. Keyword & Concept matching
	if (name.includes("lightning") || name.includes("shock") || name.includes("spark") || name.includes("electr")) {
		return ["Witch Bolt", "Shocking Grasp", "Lightning Bolt"];
	}
	if (name.includes("push") || name.includes("pull") || name.includes("propel") || name.includes("gust")) {
		return ["Gust of Wind", "Thunderwave"];
	}
	if (name.includes("wave") || name.includes("burst") || name.includes("quake") || name.includes("tremor") || name.includes("sweep")) {
		return ["Thunderwave", "Gust of Wind"];
	}
	if (name.includes("jump") || name.includes("leap") || name.includes("phase") || name.includes("teleport") || name.includes("step") || name.includes("translocat")) {
		return ["Misty Step", "Dimension Door"];
	}
	if (name.includes("speed") || name.includes("haste") || name.includes("dash") || name.includes("swift")) {
		return ["Longstrider", "Haste"];
	}
	if (name.includes("heal") || name.includes("kolto") || name.includes("bacta") || name.includes("cure") || name.includes("mend") || name.includes("repair") || name.includes("revit")) {
		return ["Cure Wounds", "Healing Word"];
	}
	if (name.includes("shield") || name.includes("barrier") || name.includes("armor") || name.includes("buffer") || name.includes("ward") || name.includes("deflect")) {
		return ["Sanctuary", "Mage Armor", "Shield"];
	}
	if (name.includes("fire") || name.includes("flame") || name.includes("combust") || name.includes("pyro") || name.includes("burn") || name.includes("scorch") || name.includes("incinerat")) {
		return ["Fire Bolt", "Burning Hands", "Fireball"];
	}
	if (name.includes("cryo") || name.includes("cold") || name.includes("frost") || name.includes("ice") || name.includes("chill")) {
		return ["Ray of Frost", "Ice Knife", "Cone of Cold"];
	}
	if (name.includes("acid") || name.includes("poison") || name.includes("corros") || name.includes("tox")) {
		return ["Acid Splash", "Acid Arrow"];
	}
	if (name.includes("mind") || name.includes("affect") || name.includes("psych") || name.includes("telepath") || name.includes("feedb") || name.includes("daze") || name.includes("confus")) {
		return ["Dissonant Whispers", "Mind Sliver"];
	}
	if (name.includes("charm") || name.includes("suggest") || name.includes("dominate") || name.includes("compel") || name.includes("trick")) {
		return ["Charm Person", "Suggestion"];
	}
	if (name.includes("stun") || name.includes("hold") || name.includes("paraly") || name.includes("stasis") || name.includes("bind")) {
		return ["Hold Person", "Hold Monster"];
	}
	if (name.includes("curse") || name.includes("bane") || name.includes("denounce") || name.includes("drain") || name.includes("choke") || name.includes("crush") || name.includes("tendril")) {
		return ["Bane", "Arms of Hadar", "Vampiric Touch"];
	}
	if (name.includes("bless") || name.includes("meditat") || name.includes("precognition") || name.includes("guid") || name.includes("insight") || name.includes("focus") || name.includes("seethe")) {
		return ["Bless"];
	}
	if (name.includes("grenade") || name.includes("detonat") || name.includes("bomb") || name.includes("explos") || name.includes("shatter") || name.includes("overload") || name.includes("blast")) {
		return ["Fireball", "Shatter"];
	}
	if (name.includes("missile") || name.includes("rocket") || name.includes("dart") || name.includes("barrage")) {
		return ["Magic Missile"];
	}
	if (name.includes("saber") || name.includes("blade") || name.includes("strike")) {
		return ["Lasersword", "Shortsword"];
	}
	if (name.includes("invisib") || name.includes("camou") || name.includes("cloak") || name.includes("shadow") || name.includes("veil")) {
		return ["Invisibility"];
	}
	if (name.includes("detect") || name.includes("sense") || name.includes("see") || name.includes("scan") || name.includes("tracker")) {
		return ["Detect Thoughts", "Divine Sense"];
	}

	// 3. Damage Type fallback
	const damages = extractDamageTypes(item, activity);
	if (damages.includes("lightning") || damages.includes("ion")) return ["Witch Bolt", "Shocking Grasp", "Lightning Bolt"];
	if (damages.includes("fire")) return ["Fire Bolt", "Burning Hands", "Fireball"];
	if (damages.includes("cold")) return ["Ray of Frost", "Ice Knife", "Cone of Cold"];
	if (damages.includes("acid") || damages.includes("poison")) return ["Acid Splash", "Acid Arrow"];
	if (damages.includes("necrotic")) return ["Arms of Hadar", "Chill Touch", "Vampiric Touch"];
	if (damages.includes("psychic")) return ["Mind Sliver", "Dissonant Whispers"];
	if (damages.includes("healing")) return ["Cure Wounds", "Healing Word"];
	if (damages.includes("sonic")) return ["Thunderwave", "Shatter"];
	if (damages.includes("force") || damages.includes("kinetic")) return ["Magic Missile", "Thunderwave", "Gust of Wind"];

	// 4. Power School fallback
	const school = item?.system?.school;
	const isTemplate = Boolean(activity?.target?.template?.type || item?.system?.target?.template?.type);
	const isSelfOrTouch = item?.system?.range?.units === "self" || item?.system?.range?.units === "touch" || activity?.type === "utility" || activity?.type === "heal";

	if (school === "tec") {
		if (isTemplate) return ["Fireball", "Acid Splash", "Shatter"];
		if (isSelfOrTouch) return ["Sanctuary", "Detect Thoughts", "Cure Wounds"];
		return ["Fire Bolt", "Shocking Grasp", "Magic Missile"];
	}
	if (school === "drk") {
		if (isTemplate) return ["Arms of Hadar", "Shatter"];
		if (isSelfOrTouch) return ["Bless", "Bane", "Arms of Hadar"];
		return ["Chill Touch", "Witch Bolt", "Arms of Hadar"];
	}
	if (school === "lgt") {
		if (isTemplate) return ["Gust of Wind", "Cone of Cold"];
		if (isSelfOrTouch) return ["Cure Wounds", "Bless", "Sanctuary"];
		return ["Guiding Bolt", "Bless", "Cure Wounds"];
	}
	if (isTemplate) return ["Gust of Wind", "Thunderwave", "Fireball"];
	if (isSelfOrTouch) return ["Sanctuary", "Bless", "Detect Thoughts"];
	return ["Thunderwave", "Gust of Wind", "Magic Missile"];
}

function resolveWeaponOverride(item) {
	const itemName = (item.name ?? item.label ?? "").toLowerCase().trim();
	const typeVal = String(item.system?.type?.value ?? "").toLowerCase();
	const isEne = itemHasProperty(item, "ene");
	const isAmm = itemHasProperty(item, "amm");

	// 1. Lightweapons & Lightsabers
	const isLightweapon = typeVal.endsWith("lw") || isEne ||
		itemName.includes("lightsaber") ||
		itemName.includes("lightfoil") ||
		itemName.includes("shoto") ||
		itemName.includes("saber") ||
		itemName.includes("sunsaber") ||
		itemName.includes("broadsaber");

	if (isLightweapon) {
		if (itemName.includes("whip")) return ["Whip", "Lasersword"];
		return ["Lasersword"];
	}

	// 2. Blasters & Ranged Weaponry
	const isBlaster = typeVal.endsWith("bl") || isAmm ||
		itemName.includes("blaster") ||
		itemName.includes("repeater") ||
		itemName.includes("pistol") ||
		itemName.includes("rifle") ||
		itemName.includes("cannon") ||
		itemName.includes("carbine") ||
		itemName.includes("slugthrower") ||
		itemName.includes("bowcaster");

	if (isBlaster) {
		if (itemName.includes("bow") || itemName.includes("bowcaster")) return ["Laser", "Crossbow", "Bow"];
		if (itemName.includes("sniper") || itemName.includes("anti-materiel") || itemName.includes("marksman")) return ["Antimatter Rifle", "Laser"];
		if (itemName.includes("shotgun") || itemName.includes("scatter") || itemName.includes("flechette")) return ["Shotgun", "Laser"];
		if (itemName.includes("slug") || itemName.includes("cycler") || itemName.includes("hunting") || itemName.includes("chaingun")) return ["Rifle", "Gun", "Laser"];
		if (itemName.includes("flame") || itemName.includes("incinerat")) return ["Burning Hands", "Fire Bolt"];
		if (itemName.includes("cryo")) return ["Ray of Frost", "Laser"];
		if (itemName.includes("ion") || itemName.includes("lightning") || itemName.includes("arc")) return ["Witch Bolt", "Laser"];
		if (itemName.includes("launcher") || itemName.includes("rocket") || itemName.includes("mortar") || itemName.includes("missile")) return ["Fireball", "Magic Missile"];
		return ["Laser"];
	}

	// 3. Vibroweapons & Melee Weaponry
	const isVibro = typeVal.endsWith("vw") || itemName.includes("vibro");
	if (isVibro || typeVal === "melee" || item.type === "weapon") {
		if (itemName.includes("whip")) return ["Whip"];
		if (itemName.includes("axe")) return ["Greataxe", "Handaxe"];
		if (itemName.includes("spear") || itemName.includes("pike") || itemName.includes("lance") || itemName.includes("pole") || itemName.includes("trident") || itemName.includes("staff")) return ["Spear"];
		if (itemName.includes("dagger") || itemName.includes("knife") || itemName.includes("shiv")) return ["Dagger", "Shortsword"];
		if (itemName.includes("mace") || itemName.includes("club") || itemName.includes("hammer") || itemName.includes("maul") || itemName.includes("baton") || itemName.includes("cesta")) return ["Mace", "Shortsword"];
		if (itemName.includes("greatsword") || itemName.includes("buster") || itemName.includes("claymore")) return ["Greatsword", "Shortsword"];
		return ["Shortsword"];
	}

	// 4. Natural & Unarmed Attacks
	if (typeVal === "natural") {
		if (itemName.includes("bite")) return ["Bite", "Unarmed Strike"];
		if (itemName.includes("claw")) return ["Claw", "Unarmed Strike"];
		return ["Unarmed Strike"];
	}

	// 5. Consumables / Grenades / Explosives
	if (item.type === "consumable" || item.type === "loot") {
		if (itemName.includes("grenade") || itemName.includes("detonator") || itemName.includes("bomb") || itemName.includes("mine")) {
			return ["Fireball"];
		}
	}

	return null;
}

export function patchAutoAnimationsPresets() {
	Hooks.on("AutomatedAnimations-WorkflowStart", (clonedData, animationData) => {
		const item = clonedData?.item;
		if (!item) return;

		// Fallback target for self/touch/utility powers so Automated Animations doesn't abort with NO TARGETS
		if ((!clonedData.targets || clonedData.targets.length === 0) && clonedData.token) {
			const isSelfOrTouch = item.system?.range?.units === "self" || item.system?.range?.units === "touch" || clonedData.activity?.type === "utility" || clonedData.activity?.type === "heal";
			if (isSelfOrTouch) {
				clonedData.targets = [clonedData.token];
			}
		}

		// If an animation is already matched or explicitly customized, don't override
		if (animationData) return;

		// Check Powers mapping
		if (item.type === "power" || item.type === "spell" || item.system?.method === "powerCasting") {
			const overrides = resolvePowerOverride(item, clonedData.activity);
			if (overrides?.length) {
				clonedData.overrideNames = overrides;
				clonedData.recheckAnimation = true;
				return;
			}
		}

		// Check Weapons mapping
		if (item.type === "weapon" || item.type === "consumable" || item.type === "loot") {
			const overrides = resolveWeaponOverride(item);
			if (overrides?.length) {
				clonedData.overrideNames = overrides;
				clonedData.recheckAnimation = true;
				return;
			}
		}
	});

	// Trigger template animations when MeasuredTemplates are placed on canvas in DnD5e v6
	Hooks.on("createMeasuredTemplate", async (templateDoc, data, userId) => {
		if (userId !== game.user?.id) return;
		try {
			const itemUuid = templateDoc.flags?.dnd5e?.item;
			const activityUuid = templateDoc.flags?.dnd5e?.origin;
			const item = itemUuid ? await fromUuid(itemUuid) : null;
			const activity = activityUuid ? await fromUuid(activityUuid) : null;
			if (!item) return;

			const sourceToken = item.parent?.token ?? (canvas.tokens?.placeables?.find(t => t.actor?.items?.has(item.id)) || _token);

			if (window.AutomatedAnimations?.playAnimation && sourceToken) {
				window.AutomatedAnimations.playAnimation(sourceToken, item, {
					activity,
					templateData: templateDoc,
					isTemplate: true
				});
			}
		} catch (err) {
			console.warn("SW5E | Measured template animation notice:", err);
		}
	});

	// Trigger heal animations on postUseActivity since AA v7 skips activity.type === "heal"
	Hooks.on("dnd5e.postUseActivity", async (activity, usageConfig, results) => {
		if (activity?.type !== "heal") return;
		const item = activity?.item;
		if (!item) return;
		if (item.type !== "power" && item.type !== "spell" && item.system?.method !== "powerCasting") return;

		const sourceToken = item.parent?.token ?? (canvas.tokens?.placeables?.find(t => t.actor?.items?.has(item.id)) || _token);
		if (!sourceToken) return;

		const targets = Array.from(game.user?.targets || []);
		const finalTargets = targets.length > 0 ? targets : [sourceToken];

		if (window.AutomatedAnimations?.playAnimation) {
			window.AutomatedAnimations.playAnimation(sourceToken, item, {
				activity,
				targets: finalTargets
			});
		}
	});

	// Seed the autorec menus from D&D5e Animations when they are nearly empty.
	// PSFX registers its own Sequencer database on "sequencer.ready".
	Hooks.once("ready", async () => {
		try {
			// Auto-sync Autorec presets from dnd5e-animations if AA is active and menu is sparse
			if (game.modules.get("autoanimations")?.active && game.user?.isGM) {
				const rangeMenu = game.settings.get("autoanimations", "aaAutorec-range") || [];
				if (Array.isArray(rangeMenu) && rangeMenu.length < 50 && game.modules.get("dnd5e-animations")?.active) {
					const resp = await fetch("modules/dnd5e-animations/module/autorec.json");
					if (resp.ok) {
						const autorecData = await resp.json();
						if (window.AutomatedAnimations?.AutorecManager?.mergeMenus) {
							await window.AutomatedAnimations.AutorecManager.mergeMenus(autorecData, { submitAll: true });
							console.log("SW5E | Merged D&D5e Animations presets into Automated Animations.");
						}
					}
				}
			}
		} catch (err) {
			console.warn("SW5E | AutoAnimations presets initialization notice:", err);
		}
	});
}

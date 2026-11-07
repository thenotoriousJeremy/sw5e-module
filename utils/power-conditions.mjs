/**
 * Derive condition-applying Active Effects for SW5E powers and maneuvers from their rules text.
 *
 * Most SW5E powers ship with save/attack/damage activities but no effects, so conditions like "paralyzed" had to
 * be applied by hand. This reads the description, finds sentences that actually apply a condition (as opposed to
 * immunities, cures, HP-threshold or choice-based riders), and builds effects that midi-qol applies through the
 * matching activity:
 *  - save-based conditions are linked to the save activity and apply on a failed save (onSave: false),
 *  - "on a hit" conditions are linked to the attack activity,
 *  - unconditional ones ("you become invisible") are linked to the utility activity.
 * Durations ("until the end of your next turn", "for 1 minute", "for the duration") become effect durations or DAE
 * special durations, and "repeat the saving throw at the end of each of its turns" becomes a midi-qol OverTime.
 * SW5E's levelled Slowed condition gets its own effect carrying `flags.sw5e-module.slowedLevel`; at runtime
 * scripts/patch/derived-conditions.mjs raises the Slowed status to that level and slowed-movement.mjs applies the speed
 * penalty.
 *
 * Pure data in/data out (no Foundry globals), so it runs in Node (pack sources) and in the browser (world data).
 */

/** Status ids by the words used in rules text. */
export const CONDITION_STATUS = {
	blinded: "blinded",
	charmed: "charmed",
	deafened: "deafened",
	frightened: "frightened",
	grappled: "grappled",
	incapacitated: "incapacitated",
	invisible: "invisible",
	paralyzed: "paralyzed",
	petrified: "petrified",
	poisoned: "poisoned",
	prone: "prone",
	restrained: "restrained",
	stunned: "stunned",
	unconscious: "unconscious",
	shocked: "shocked",
	slowed: "slowed",
	weakened: "weakened",
	corroded: "corroded",
	ignited: "ignited"
};

const SW5E_ICON_STATUSES = new Set(["shocked", "slowed", "weakened", "corroded", "ignited"]);

/** Icon for a status, matching what the token HUD shows. */
export function statusIcon(status) {
	return SW5E_ICON_STATUSES.has(status)
		? `modules/sw5e-module/icons/svg/conditions/${status}.svg`
		: `systems/dnd5e/icons/svg/statuses/${status}.svg`;
}

const LABELS = {
	blinded: "Blinded", charmed: "Charmed", deafened: "Deafened", frightened: "Frightened", grappled: "Grappled",
	incapacitated: "Incapacitated", invisible: "Invisible", paralyzed: "Paralyzed", petrified: "Petrified",
	poisoned: "Poisoned", prone: "Prone", restrained: "Restrained", stunned: "Stunned", unconscious: "Unconscious",
	shocked: "Shocked", slowed: "Slowed", weakened: "Weakened", corroded: "Corroded", ignited: "Ignited"
};

const ABILITIES = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" };
const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const CONDITION_RX = /\b(blinded|charmed|deafened|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious|shocked|slowed|weakened|corroded|ignited)\b/gi;

/** Sentences that mention a condition without applying it to the power's targets. */
const EXCLUDE_PATTERNS = [
	/\bimmun/i, /\bcan'?t be\b/i, /\bcannot be\b/i, /\bisn'?t\b/i, /\bis not\b/i, /\baren'?t\b/i, /\bare not\b/i,
	/against being/i, /advantage on saving throws against/i, /\bend(s|ing)?\b[^.]*\bcondition/i, /\bcures?\b/i,
	/\bremoves?\b/i, /\balready\b/i, /\bsuppress/i,
	/\bwhile (it|the target|the creature|they|you|that creature|the droid|charmed|poisoned|restrained|incapacitated)\b/i,
	/\bif (it|the target|the creature|they|you|a creature) (is|are)\b/i, /\bwho (is|are)\b/i, /\bthat (is|are) (\w+ )?(blinded|charmed|deafened|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious|shocked|slowed)\b/i,
	/\bthe condition (can|could) be\b/i, /\bcause (it|them|you) to be\b/i, /\bcan'?t (reduce|cause)\b/i,
	// Applied on a success, by HP threshold, by choice, by a contested check, by area/turn start, or conditionally
	/\bon a success(ful)?\b/i,
	/\bhit points (or fewer|or less)\b/i, /\blowest current hit points\b/i, /\bremaining hit points\b/i, /\bhit points are less than\b/i,
	/\beffects? of your choice\b/i, /\bone of the following\b/i, /\bchoose to either\b/i, /\beither knock\b/i, /\bdependent on\b/i, /\bchoose one\b/i,
	/\bif your check succeeds\b/i, /\bcontested\b/i,
	/\bstarts? its turn\b/i, /\benters? the (power's )?area\b/i, /\bfor the first time on a turn\b/i, /\bwhile in the area\b/i, /\bwithin the area\b/i,
	/\bif you score a critical hit\b/i, /\bif the target (becomes|ends|willingly|has)\b/i, /\bif the attack hits\b/i,
	/\bwhen (a|an|such a|that|the) [^,.]*\b(hits|can see|comes within|attacks)\b/i, /\bif there is a creature\b/i,
	/\bno longer\b/i
];

/** Powers whose conditions depend on a menu of options or a sequence of hits: leave those to the GM. */
const ITEM_SKIP_RX = /\bone of the following\b|\beffects? of your choice\b|\btypical commands\b|\b1st hit\b/i;

/** "While poisoned in this way, the target is paralyzed": a second condition riding on the first. */
const TIED_RX = /\bwhile (blinded|charmed|deafened|frightened|grappled|incapacitated|paralyzed|poisoned|restrained|stunned)\b[^.]*?\b(?:in this way|by (?:this|the) power)\b[^.]*?\b(?:is|are|becomes?) (blinded|charmed|deafened|frightened|grappled|incapacitated|paralyzed|poisoned|restrained|stunned|unconscious)\b(?:,? and (?:is )?(blinded|charmed|deafened|frightened|grappled|incapacitated|paralyzed|poisoned|restrained|stunned|unconscious)\b)?/i;

/** Phrases that actually apply a condition. */
const APPLY_RX = /\b(or (be|become|is|are|fall|falls|be knocked|is knocked)|on a failed save|fails? (the|its|their|a|this)?\s*(saving throw|save)|on a failure|on a hit|knocked prone|falls? (prone|unconscious)|(is|are|becomes?|be) (also )?(knocked )?(blinded|charmed|deafened|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious|shocked|slowed|weakened|corroded|ignited)|gains? (a|an|one|\d+) (level of slowed|slowed levels?)|(you|the target|it|they|the creature|each creature|that creature|a creature|the affected creature|those creatures|creatures) (turns?|become|becomes) invisible)\b/i;

const SAVE_RX = /\b(saving throw|save)\b/i;
const HIT_RX = /\bon a hit\b/i;
const SAVE_ABILITY_RX = /\b(strength|dexterity|constitution|intelligence|wisdom|charisma) (saving throw|save)\b/gi;

function stripHtml(html) {
	return String(html ?? "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;|&#160;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/\[\[[^\]]*\]\]\{([^}]*)\}/g, "$1")
		.replace(/\[\[\/\w+\s+([^\]]*)\]\]/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
}

function splitSentences(text) {
	return text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
}

/** Duration of the source item in effect terms. */
function itemDuration(item) {
	const d = item.system?.duration ?? {};
	const value = Number(d.value) || 0;
	switch ( d.units ) {
		case "round": return value ? { rounds: value } : {};
		case "turn": return value ? { turns: value } : {};
		case "minute": return value ? { seconds: value * 60 } : {};
		case "hour": return value ? { seconds: value * 3600 } : {};
		case "day": return value ? { seconds: value * 86400 } : {};
		default: return {};
	}
}

/** Work out the duration from a sentence. Returns null when it doesn't state one. */
function parseDuration(text, item) {
	let m;
	if ( /until the end of your next turn/i.test(text) ) return { duration: { rounds: 1 }, special: ["turnEndSource"] };
	if ( /until the start of your next turn/i.test(text) ) return { duration: { rounds: 1 }, special: ["turnStartSource"] };
	if ( /until the end of (its|their|the target's|the creature's|that creature's) next turn/i.test(text) ) return { duration: { rounds: 1 }, special: ["turnEnd"] };
	if ( /until the start of (its|their|the target's|the creature's|that creature's) next turn/i.test(text) ) return { duration: { rounds: 1 }, special: ["turnStart"] };
	if ( /until you move or take a hostile action/i.test(text) ) return { duration: {}, special: ["isMoved", "1Attack", "1Spell"] };
	if ( (m = text.match(/\bfor (\d+|one|two|three|four|five|six|seven|eight|nine|ten) (round|minute|hour)s?\b/i)) ) {
		const n = Number(m[1]) || NUMBERS[m[1].toLowerCase()] || 1;
		const unit = m[2].toLowerCase();
		if ( unit === "round" ) return { duration: { rounds: n }, special: [] };
		return { duration: { seconds: n * (unit === "minute" ? 60 : 3600) }, special: [] };
	}
	if ( /\b(for the (power's |maneuver's )?duration|until the (power|effect|maneuver) ends|for the duration of the power)\b/i.test(text) ) return { duration: itemDuration(item), special: [] };
	return null;
}

/** Repeat-save clause anywhere in the description. */
function parseRepeatSave(text, saveAbility) {
	let m = text.match(/\bat the (end|start) of each of (its|their|the target's|the creature's|that creature's|an affected creature's) turns,?\s*(?:[^.]*?)\b(?:make|repeat|makes|repeats)\s+(?:another|the|a|its)?\s*(?:(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+)?saving throw/i);
	if ( m ) {
		const ability = m[3] ? ABILITIES[m[3].toLowerCase()] : saveAbility;
		return ability ? { turn: m[1].toLowerCase(), ability } : null;
	}
	m = text.match(/\b(?:make|repeat)s?\s+(?:another|the|a)?\s*(?:(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+)?saving throw at the (end|start) of each of (?:its|their) turns/i);
	if ( m ) {
		const ability = m[1] ? ABILITIES[m[1].toLowerCase()] : saveAbility;
		return ability ? { turn: m[2].toLowerCase(), ability } : null;
	}
	return null;
}

/** Number of slowed levels a sentence grants. */
function parseSlowedLevel(sentence) {
	const m = sentence.match(/\bgains? (\d+|a|an|one|two|three|four) (?:slowed levels?|levels? of slowed)\b/i);
	if ( !m ) return 1;
	return Math.min(Number(m[1]) || NUMBERS[m[1].toLowerCase()] || 1, 4);
}

/** The save DC reference for OverTime, matching how the power itself computes its DC. */
function saveDcReference(item) {
	const school = item.system?.school;
	if ( ["lgt", "uni", "drk"].includes(school) ) return `@powercasting.force.schools.${school}.dc`;
	if ( school === "tec" ) return "@powercasting.tech.schools.tec.dc";
	const manType = item.system?.type?.value;
	if ( item.type?.endsWith("maneuver") && manType ) return `@superiority.types.${manType}.dc`;
	return "@attributes.spell.dc";
}

/** Small deterministic id so pack sources and the live compendium get identical effect ids. */
export function deterministicId(seed) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let h1 = 0x811c9dc5;
	let h2 = 0x01000193 ^ seed.length;
	let out = "";
	for ( let round = 0; out.length < 16; round++ ) {
		for ( let i = 0; i < seed.length; i++ ) {
			const c = seed.charCodeAt(i) + (round * 131);
			h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
			h2 = Math.imul(h2 ^ (c + h1), 2246822519) >>> 0;
		}
		out += chars[h1 % 62] + chars[h2 % 62] + chars[(h1 >>> 8) % 62] + chars[(h2 >>> 8) % 62];
	}
	return out.slice(0, 16);
}

function activityList(item) {
	const acts = item.system?.activities ?? {};
	return Object.entries(acts).map(([id, a]) => ({ ...a, id: a?._id ?? id }));
}

/**
 * Find the conditions a power/maneuver applies.
 * @param {object} item  Item source data (plain object).
 * @returns {object[]}   One entry per effect to create.
 */
export function deriveConditions(item) {
	if ( !["spell", "sw5e-module.maneuver", "sw5e.maneuver"].includes(item?.type) ) return [];
	const text = stripHtml(item.system?.description?.value);
	if ( !text || ITEM_SKIP_RX.test(text) ) return [];
	const acts = activityList(item);
	const saveAct = acts.find(a => a.type === "save");
	const attackAct = acts.find(a => a.type === "attack");
	const utilityAct = acts.find(a => a.type === "utility") ?? acts.find(a => !["save", "attack", "heal", "damage"].includes(a.type));
	const saveAbility = saveAct?.save?.ability ? [].concat(saveAct.save.ability)[0] : null;
	const sentences = splitSentences(text);
	const repeat = parseRepeatSave(text, saveAbility);

	const specs = [];
	sentences.forEach((sentence, i) => {
		const found = [...new Set([...sentence.matchAll(CONDITION_RX)].map(m => m[1].toLowerCase()))];
		if ( !found.length ) return;
		const prev = sentences[i - 1] ?? "";
		if ( EXCLUDE_PATTERNS.some(rx => rx.test(sentence)) ) return;
		if ( /\bhit points (or fewer|or less)\b|\blowest current hit points\b/i.test(prev) ) return;
		if ( !APPLY_RX.test(sentence) ) return;

		const mentionsSave = SAVE_RX.test(sentence) || /\bon a failed save\b|\bon a failure\b/i.test(sentence);
		const mentionsHit = HIT_RX.test(sentence);
		if ( mentionsHit && !attackAct ) return;                 // rider on a weapon attack the power doesn't make
		if ( mentionsSave && !saveAct ) return;                  // needs a save the power can't roll

		// A save named in this or the previous sentence must be the one the save activity rolls
		const named = [...(sentence + " " + prev).matchAll(SAVE_ABILITY_RX)].map(m => ABILITIES[m[1].toLowerCase()]);
		if ( saveAct && named.length && !named.includes(saveAbility) ) return;

		let trigger;
		if ( mentionsHit ) trigger = "attack";
		else if ( saveAct && (mentionsSave || SAVE_RX.test(prev)) ) trigger = "save";
		else if ( attackAct && !saveAct && !utilityAct ) trigger = "attack";
		else if ( utilityAct && !mentionsSave ) trigger = "utility";
		else if ( saveAct ) trigger = "save";
		else return;
		const activity = trigger === "save" ? saveAct : trigger === "attack" ? attackAct : utilityAct;
		if ( !activity ) return;

		const parsed = parseDuration(sentence, item) ?? parseDuration(sentences[i + 1] ?? "", item);
		for ( const word of found ) {
			const status = CONDITION_STATUS[word];
			if ( !status ) continue;
			specs.push({ status, trigger, activityId: activity.id, parsed, sentence,
				level: status === "slowed" ? parseSlowedLevel(sentence) : null });
		}
	});

	// Conditions that ride on another one ("while poisoned in this way, the target is paralyzed")
	for ( const sentence of sentences ) {
		const m = sentence.match(TIED_RX);
		if ( !m ) continue;
		const base = CONDITION_STATUS[m[1].toLowerCase()];
		const tied = [m[2], m[3]].filter(Boolean).map(w => CONDITION_STATUS[w.toLowerCase()]).filter(Boolean);
		for ( const spec of specs.filter(s => s.status === base) ) {
			for ( const status of tied ) {
				if ( specs.some(s => (s.status === status) && (s.activityId === spec.activityId)) ) continue;
				specs.push({ ...spec, status, sentence });
			}
		}
	}

	// Group statuses that share an activity and timing; prone and slowed always get their own effect
	const groups = new Map();
	for ( const s of specs ) {
		let duration = s.parsed?.duration ?? null;
		let special = s.parsed?.special ?? [];
		let useRepeat = false;
		if ( s.status === "prone" ) { duration = {}; special = []; }
		else {
			if ( !duration ) duration = itemDuration(item);
			useRepeat = (s.trigger === "save") && !!repeat && !special.length;
			// Never create a condition that can't end on its own
			const timed = Object.keys(duration).length || special.length || useRepeat;
			if ( !timed ) continue;
		}
		const separate = ["prone", "slowed"].includes(s.status);
		const key = [s.activityId, separate ? s.status : "shared", JSON.stringify(duration), special.join(","), useRepeat].join("|");
		const g = groups.get(key) ?? { activityId: s.activityId, trigger: s.trigger, statuses: [], duration, special,
			repeat: useRepeat ? repeat : null, level: null, sentences: [] };
		if ( !g.statuses.includes(s.status) ) g.statuses.push(s.status);
		if ( s.level ) g.level = Math.max(g.level ?? 0, s.level);
		if ( !g.sentences.includes(s.sentence) ) g.sentences.push(s.sentence);
		groups.set(key, g);
	}
	return [...groups.values()];
}

/**
 * Remove previously derived condition effects (and their activity links) from an item's source data in place.
 * @param {object} item  Item source data.
 * @returns {string[]}   Ids of the removed effects.
 */
export function removeDerivedEffects(item) {
	const ids = (item.effects ?? []).filter(e => e?.flags?.["sw5e-module"]?.derivedCondition).map(e => e._id);
	if ( !ids.length ) return [];
	item.effects = item.effects.filter(e => !ids.includes(e._id));
	for ( const act of Object.values(item.system?.activities ?? {}) ) {
		if ( Array.isArray(act?.effects) ) act.effects = act.effects.filter(r => !ids.includes(r?._id));
	}
	return ids;
}

/**
 * Add derived condition effects to an item's source data in place (skipping statuses the item already applies).
 * @param {object} item  Item source data; `effects` must be an array of effect source objects.
 * @returns {object[]}   The effects that were added.
 */
export function applyConditionEffects(item) {
	const derived = deriveConditions(item);
	if ( !derived.length ) return [];
	item.effects ??= [];
	const existing = new Set(item.effects.flatMap(e => [...(e.statuses ?? []), e.system?.type].filter(Boolean)));
	const added = [];
	for ( const c of derived ) {
		const statuses = c.statuses.filter(s => !existing.has(s));
		if ( !statuses.length ) continue;
		const id = deterministicId(`${item._id}|${c.activityId}|${statuses.join(",")}`);
		if ( item.effects.some(e => e._id === id) ) continue;
		const isSlowed = (statuses.length === 1) && (statuses[0] === "slowed");
		const label = isSlowed ? `Slowed (${c.level ?? 1})` : statuses.map(s => LABELS[s] ?? s).join(" & ");
		const changes = [];
		if ( c.repeat ) {
			changes.push({
				key: "flags.midi-qol.OverTime",
				type: "override",
				value: `turn=${c.repeat.turn}, saveAbility=${c.repeat.ability}, saveDC=${saveDcReference(item)}, saveCount=1-, label="${item.name}: ${label}"`,
				priority: 20
			});
		}
		const moduleFlags = { derivedCondition: true };
		if ( isSlowed ) moduleFlags.slowedLevel = c.level ?? 1;
		const effect = {
			_id: id,
			name: `${item.name}: ${label}`,
			img: isSlowed ? `modules/sw5e-module/icons/svg/conditions/slowed-${c.level ?? 1}.svg` : statusIcon(statuses[0]),
			type: "base",
			transfer: false,
			disabled: false,
			statuses,
			duration: { ...c.duration },
			description: `<p>${c.sentences.join(" ")}</p>`,
			flags: {
				dae: { specialDuration: c.special, stackable: "noneName" },
				"sw5e-module": moduleFlags
			},
			system: { changes }
		};
		item.effects.push(effect);
		const act = item.system.activities[c.activityId]
			?? Object.values(item.system.activities).find(a => a?._id === c.activityId);
		if ( act ) {
			act.effects ??= [];
			const link = { _id: id };
			if ( c.trigger === "save" ) link.onSave = false;
			act.effects.push(link);
		}
		statuses.forEach(s => existing.add(s));
		added.push({ effect, trigger: c.trigger, activityId: c.activityId });
	}
	return added;
}

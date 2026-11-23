/**
 * Offline tests for Maneuver Versatility (Tactical Specialist): limits, feature detection,
 * stored choices, toggling, owning class, actor state and the effective maneuver type.
 */
import assert from "node:assert/strict";
import {
	MANEUVER_VERSATILITY_FLAG,
	MANEUVER_VERSATILITY_IDENTIFIER,
	MANEUVER_VERSATILITY_PACK_ID,
	getEffectiveManeuverType,
	getManeuverVersatilityClass,
	getManeuverVersatilityLimit,
	getManeuverVersatilityState,
	getNextManeuverVersatilityLevel,
	getStoredManeuverVersatilityIds,
	isManeuverVersatile,
	isManeuverVersatilityItem,
	resolveActiveManeuverVersatilityIds,
	toggleManeuverVersatilityId
} from "../scripts/maneuver-versatility.mjs";

let passed = 0;
function check(name, fn) {
	fn();
	passed += 1;
	console.log(`ok - ${name}`);
}

const MANEUVER_TYPE = "sw5e-module.maneuver";

class Items {
	constructor(items) { this.map = new Map(items.map(item => [item.id, item])); }
	get(id) { return this.map.get(id); }
	values() { return this.map.values(); }
	[Symbol.iterator]() { return this.map.values(); }
}

function makeActor({ classLevel = 14, stored = [], featureOverrides = {}, classes, maneuvers } = {}) {
	const actor = {};
	const feature = {
		id: "feat1",
		type: "feat",
		name: "Maneuver Versatility",
		system: { identifier: MANEUVER_VERSATILITY_IDENTIFIER, requirements: "Fighter (Tactical Specialist) 3" },
		flags: { sw5e: { [MANEUVER_VERSATILITY_FLAG]: { maneuvers: stored } }, dnd5e: { advancementOrigin: "sub1.adv1" } },
		...featureOverrides
	};
	const classItems = classes ?? [
		{ id: "cls1", type: "class", name: "Fighter", system: { identifier: "fighter", levels: classLevel } },
		{ id: "sub1", type: "subclass", name: "Tactical Specialist", system: { identifier: "tactical-specialist", classIdentifier: "fighter" } }
	];
	const maneuverItems = (maneuvers ?? [
		["phys1", "Disarming Blow", "physical"],
		["phys2", "Rampage", "physical"],
		["ment1", "Menacing Attack", "mental"],
		["ment2", "Goading Attack", "mental"],
		["ment3", "Tyrannical Strike", "mental"],
		["gen1", "Inner Strength", "general"]
	]).map(([id, name, type]) => ({ id, name, type: MANEUVER_TYPE, system: { type: { value: type } }, actor }));
	actor.items = new Items([feature, ...classItems, ...maneuverItems]);
	return actor;
}

check("choice limit by class level", () => {
	assert.deepEqual([3, 4, 5, 8, 9, 12, 13, 14, 16, 17, 20].map(getManeuverVersatilityLimit), [2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6]);
	assert.equal(getManeuverVersatilityLimit(undefined), 2);
	assert.equal(getManeuverVersatilityLimit("abc"), 2);
});

check("next level with another choice", () => {
	assert.equal(getNextManeuverVersatilityLevel(3), 5);
	assert.equal(getNextManeuverVersatilityLevel(5), 9);
	assert.equal(getNextManeuverVersatilityLevel(14), 17);
	assert.equal(getNextManeuverVersatilityLevel(17), null);
	assert.equal(getNextManeuverVersatilityLevel(null), 5);
});

check("feature detection", () => {
	assert.equal(isManeuverVersatilityItem({ type: "feat", system: { identifier: MANEUVER_VERSATILITY_IDENTIFIER } }), true);
	assert.equal(isManeuverVersatilityItem({ type: "feat", system: { identifier: "maneuver-adept" }, name: "Maneuver Versatility" }), false);
	assert.equal(isManeuverVersatilityItem({ type: "feat", system: {}, flags: { "sw5e-importer": { uid: "Feature.name-maneuver_versatility.source-archetype" } } }), true);
	assert.equal(isManeuverVersatilityItem({ type: "feat", system: {}, _stats: { compendiumSource: `Compendium.sw5e-module.character-classes.Item.${MANEUVER_VERSATILITY_PACK_ID}` } }), true);
	assert.equal(isManeuverVersatilityItem({ type: "feat", system: {}, name: "Maneuver Versatility" }), true);
	assert.equal(isManeuverVersatilityItem({ type: "spell", system: { identifier: MANEUVER_VERSATILITY_IDENTIFIER } }), false);
	assert.equal(isManeuverVersatilityItem(null), false);
});

check("stored ids are trimmed, de-duplicated and kept in order", () => {
	const feature = { flags: { sw5e: { [MANEUVER_VERSATILITY_FLAG]: { maneuvers: [" a ", "b", "a", "", 5, null, "c"] } } } };
	assert.deepEqual(getStoredManeuverVersatilityIds(feature), ["a", "b", "c"]);
	assert.deepEqual(getStoredManeuverVersatilityIds({}), []);
	assert.deepEqual(getStoredManeuverVersatilityIds({ flags: { sw5e: { [MANEUVER_VERSATILITY_FLAG]: { maneuvers: "a" } } } }), []);
});

check("active ids skip unknown maneuvers and stop at the limit", () => {
	assert.deepEqual(resolveActiveManeuverVersatilityIds(["x", "a", "b", "c"], ["a", "b", "c"], 2), ["a", "b"]);
	assert.deepEqual(resolveActiveManeuverVersatilityIds(["a", "a", "b"], ["a", "b"], 5), ["a", "b"]);
	assert.deepEqual(resolveActiveManeuverVersatilityIds(["a"], ["a"], 0), []);
});

check("toggling a choice", () => {
	const eligible = ["a", "b", "c"];
	assert.deepEqual(toggleManeuverVersatilityId(["a"], "b", true, 2, eligible), { ids: ["a", "b"], changed: true, blocked: false });
	assert.deepEqual(toggleManeuverVersatilityId(["a", "b"], "c", true, 2, eligible), { ids: ["a", "b"], changed: false, blocked: true });
	assert.deepEqual(toggleManeuverVersatilityId(["a"], "z", true, 2, eligible), { ids: ["a"], changed: false, blocked: true });
	assert.deepEqual(toggleManeuverVersatilityId(["a", "b"], "a", false, 2, eligible), { ids: ["b"], changed: true, blocked: false });
	assert.deepEqual(toggleManeuverVersatilityId(["a"], "b", false, 2, eligible), { ids: ["a"], changed: false, blocked: false });
	assert.deepEqual(toggleManeuverVersatilityId(["a"], "a", true, 2, eligible), { ids: ["a"], changed: false, blocked: false });
});

check("owning class: advancement origin, then requirements, then fighter", () => {
	const actor = makeActor({ classLevel: 9 });
	const feature = actor.items.get("feat1");
	assert.equal(getManeuverVersatilityClass(actor, feature)?.id, "cls1");

	const byRequirement = makeActor({ featureOverrides: { flags: {} }, classes: [
		{ id: "w1", type: "class", name: "Warden", system: { identifier: "warden", levels: 20 } },
		{ id: "f1", type: "class", name: "Fighter", system: { identifier: "fighter", levels: 7 } }
	] });
	assert.equal(getManeuverVersatilityClass(byRequirement, byRequirement.items.get("feat1"))?.id, "f1");

	const byDefault = makeActor({ featureOverrides: { flags: {}, system: { identifier: MANEUVER_VERSATILITY_IDENTIFIER } }, classes: [
		{ id: "f2", type: "class", name: "Fighter", system: { identifier: "fighter", levels: 5 } }
	] });
	assert.equal(getManeuverVersatilityClass(byDefault, byDefault.items.get("feat1"))?.id, "f2");

	const noClass = makeActor({ classes: [] });
	assert.equal(getManeuverVersatilityClass(noClass, noClass.items.get("feat1")), null);
});

check("state for a Fighter 14 with two choices made", () => {
	const actor = makeActor({ classLevel: 14, stored: ["ment1", "gen1", "gone", "ment2"] });
	const state = getManeuverVersatilityState(actor);
	assert.equal(state.limit, 5);
	assert.equal(state.classLevel, 14);
	assert.equal(state.nextLevel, 17);
	assert.deepEqual([...state.activeIds], ["ment1", "ment2"]);
	assert.equal(state.activeCount, 2);
	assert.deepEqual(state.eligibleIds, ["phys1", "phys2", "ment1", "ment2", "ment3"]);
	assert.equal(state.pending, 3);
	assert.equal(state.overLimit, 0);
});

check("pending never exceeds the maneuvers that can be chosen", () => {
	const actor = makeActor({ classLevel: 17, maneuvers: [["m1", "One", "mental"], ["g1", "Gen", "general"]] });
	const state = getManeuverVersatilityState(actor);
	assert.equal(state.limit, 6);
	assert.equal(state.pending, 1);
});

check("losing a level keeps the earliest choices", () => {
	const actor = makeActor({ classLevel: 4, stored: ["phys1", "ment1", "ment2"] });
	const state = getManeuverVersatilityState(actor);
	assert.equal(state.limit, 2);
	assert.deepEqual([...state.activeIds], ["phys1", "ment1"]);
	assert.equal(state.overLimit, 1);
	assert.equal(state.pending, 0);
});

check("no feature means no state", () => {
	const actor = { items: new Items([{ id: "x", type: "feat", name: "Second Wind", system: { identifier: "second-wind" } }]) };
	assert.equal(getManeuverVersatilityState(actor), null);
});

check("effective type follows the choices", () => {
	const actor = makeActor({ classLevel: 14, stored: ["ment1", "phys2"] });
	assert.equal(getEffectiveManeuverType(actor.items.get("ment1")), "general");
	assert.equal(getEffectiveManeuverType(actor.items.get("phys2")), "general");
	assert.equal(getEffectiveManeuverType(actor.items.get("ment2")), "mental");
	assert.equal(getEffectiveManeuverType(actor.items.get("phys1")), "physical");
	assert.equal(getEffectiveManeuverType(actor.items.get("gen1")), "general");
	assert.equal(isManeuverVersatile(actor.items.get("ment1")), true);
	assert.equal(isManeuverVersatile(actor.items.get("gen1")), false);
	assert.equal(getEffectiveManeuverType({ system: { type: { value: "mental" } } }), "mental");
	assert.equal(getEffectiveManeuverType({ system: { type: { value: "" } } }), "general");
});

check("effective type ignores choices past the limit", () => {
	const actor = makeActor({ classLevel: 3, stored: ["ment1", "ment2", "ment3"] });
	assert.equal(getEffectiveManeuverType(actor.items.get("ment2")), "general");
	assert.equal(getEffectiveManeuverType(actor.items.get("ment3")), "mental");
});

console.log(`\n${passed} maneuver versatility checks passed.`);

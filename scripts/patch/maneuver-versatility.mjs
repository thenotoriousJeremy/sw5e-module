/**
 * Maneuver Versatility UI: the chooser dialog, the Powers-tab badge, item context-menu toggles, and the
 * reminders shown when a character has choices left. Rules and state live in ../maneuver-versatility.mjs.
 */
import { getModulePath, isModuleType, localizeOrFallback } from "../module-support.mjs";
import { openSuperiorityAbilityConfig } from "../superiority-ability-config.mjs";
import {
	MANEUVER_VERSATILITY_FLAG,
	getManeuverVersatilityState,
	isManeuverVersatilityItem,
	toggleManeuverVersatilityId
} from "../maneuver-versatility.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const I18N_PREFIX = "SW5E.Superiority.Versatility";
const STORAGE_PATH = `flags.sw5e.${MANEUVER_VERSATILITY_FLAG}.maneuvers`;
const ALERT_FLAG = "maneuverVersatilityAlert";
const ALERT_BUTTON_ATTR = "data-sw5e-action";
const ALERT_BUTTON_VALUE = "open-maneuver-versatility";
const BADGE_ACTION = "open-maneuver-versatility";
const TYPE_ORDER = ["physical", "mental", "general"];
const ALERT_DELAY_MS = 750;
const ICON = "fa-solid fa-shuffle";

/** Per-actor timers so one level-up (class update + granted feature) posts a single reminder. */
const pendingAlerts = new Map();

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

function escape(text) {
	return foundry.utils.escapeHTML(String(text ?? ""));
}

/**
 * Localize `SW5E.Superiority.Versatility.<key>`, falling back to English text with {placeholders}.
 * @param {string} key
 * @param {string} fallback
 * @param {object} [data]
 * @returns {string}
 */
function t(key, fallback, data) {
	const fullKey = `${I18N_PREFIX}.${key}`;
	if ( !data ) return localizeOrFallback(fullKey, fallback);
	const localized = game.i18n.format(fullKey, data);
	if ( localized && (localized !== fullKey) ) return localized;
	return String(fallback).replace(/\{(\w+)\}/g, (_, name) => data[name] ?? "");
}

function canManage(actor) {
	return !!actor?.isOwner;
}

function actorManeuvers(actor) {
	return Array.from(actor?.items ?? []).filter(item => isModuleType(item.type, "maneuver"));
}

/** The General maneuver ability (any ability; set in Configure Superiority) and its DC. */
function generalManeuverAbility(actor) {
	const general = actor?.system?.superiority?.types?.general ?? {};
	const config = general.attr ? CONFIG.DND5E.abilities[general.attr] : null;
	const label = config?.label ? game.i18n.localize(config.label) : t("BestAbility", "your best ability");
	const dc = Number(general.dc);
	return { label, dc: Number.isFinite(dc) ? dc : null };
}

async function saveChoices(feature, ids) {
	await feature.update({ [STORAGE_PATH]: ids });
}

/* -------------------------------------------- */
/*  Chooser dialog                              */
/* -------------------------------------------- */

/**
 * Pick which known maneuvers count as general maneuvers. Changes are saved to the feature Item.
 */
export class ManeuverVersatilityApp extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor({ actor, ...options } = {}) {
		super(options);
		this.actor = actor ?? null;
	}

	static DEFAULT_OPTIONS = {
		tag: "form",
		classes: ["sw5e-maneuver-versatility"],
		window: { icon: ICON, resizable: true, contentClasses: ["standard-form"] },
		position: { width: 460, height: "auto" },
		form: {
			handler: ManeuverVersatilityApp.#onSubmit,
			submitOnChange: false,
			closeOnSubmit: true
		},
		actions: {
			configureAbility: ManeuverVersatilityApp.#onConfigureAbility
		}
	};

	static PARTS = {
		form: { template: getModulePath("templates/apps/maneuver-versatility.hbs") }
	};

	/* -------------------------------------------- */

	/** @override */
	get title() {
		return `${t("Title", "Maneuver Versatility")}: ${this.actor?.name ?? ""}`;
	}

	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const actor = this.actor;
		const state = getManeuverVersatilityState(actor);
		if ( !state ) {
			return { missing: true, missingLabel: t("Missing", "This character does not have Maneuver Versatility.") };
		}

		const editable = canManage(actor);
		const ability = generalManeuverAbility(actor);
		const maneuvers = actorManeuvers(actor).sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
		const groups = TYPE_ORDER.map(type => {
			const list = maneuvers.filter(item => (item.system.type?.value || "general") === type);
			if ( !list.length ) return null;
			const general = type === "general";
			return {
				label: game.i18n.localize(CONFIG.DND5E.superiority.types[type]?.label ?? type),
				maneuvers: list.map(item => ({
					id: item.id,
					name: item.name,
					img: item.img,
					checked: state.activeIds.has(item.id),
					eligible: !general,
					disabled: general || !editable,
					note: general ? t("AlreadyGeneral", "already general") : ""
				}))
			};
		}).filter(Boolean);

		const className = state.classItem?.name ?? "";
		return {
			editable,
			limit: state.limit,
			intro: t("Intro", "Choose up to {max} maneuvers you know. They count as general maneuvers, so they use your general maneuver ability: {ability}{dc}.", {
				max: state.limit,
				ability: ability.label,
				dc: (ability.dc === null) ? "" : t("DcSuffix", " (DC {dc})", { dc: ability.dc })
			}),
			chosenLabel: t("Chosen", "Chosen: {count} / {max}", { count: state.activeCount, max: state.limit }),
			pending: state.pending > 0,
			nextLabel: state.nextLevel
				? t("NextChoice", "Another choice at {className} level {level}.", { className, level: state.nextLevel })
				: t("NoMoreChoices", "No more choices at higher levels."),
			overLabel: state.overLimit
				? t("OverLimit", "{count} earlier choice(s) are over the limit of {max} and no longer count.", { count: state.overLimit, max: state.limit })
				: "",
			replaceLabel: t("Replace", "Whenever you gain a level in this class, you can replace one of these maneuvers with another maneuver you know."),
			abilityButtonLabel: t("ChangeAbility", "Change Ability"),
			saveLabel: t("Save", "Save Choices"),
			emptyLabel: t("NoManeuvers", "This character doesn't know any maneuvers yet."),
			groups
		};
	}

	/* -------------------------------------------- */

	/** @override */
	_onFirstRender(context, options) {
		super._onFirstRender(context, options);
		// Re-render when the actor or its items change (another user, or a level-up).
		if ( this.actor ) this.actor.apps[this.id] = this;
	}

	/* -------------------------------------------- */

	/** @override */
	_onClose(options) {
		super._onClose(options);
		if ( this.actor ) delete this.actor.apps[this.id];
	}

	/* -------------------------------------------- */

	/** @override */
	_onRender(context, options) {
		super._onRender(context, options);
		const root = this.element;
		const limit = Number(context.limit) || 0;
		const boxes = Array.from(root.querySelectorAll('input[type="checkbox"][data-eligible="true"]'));
		const counter = root.querySelector("[data-sw5e-mv-counter]");
		const refresh = () => {
			const count = boxes.filter(box => box.checked).length;
			for ( const box of boxes ) box.disabled = !context.editable || (!box.checked && (count >= limit));
			if ( counter ) {
				counter.textContent = t("Chosen", "Chosen: {count} / {max}", { count, max: limit });
				counter.closest(".sw5e-mv-status")?.classList.toggle("pending", count < Math.min(limit, boxes.length));
			}
		};
		for ( const box of boxes ) box.addEventListener("change", refresh);
		refresh();
	}

	/* -------------------------------------------- */

	/**
	 * Save the ticked maneuvers, keeping earlier choices first so the order stays stable.
	 * @this {ManeuverVersatilityApp}
	 */
	static async #onSubmit(event, form, formData) {
		const actor = this.actor;
		const state = getManeuverVersatilityState(actor);
		if ( !state || !canManage(actor) ) return;
		const chosen = foundry.utils.expandObject(formData.object ?? {})?.chosen ?? {};
		const picked = Object.entries(chosen)
			.filter(([id, on]) => on && state.eligibleIds.includes(id))
			.map(([id]) => id);
		const ordered = [
			...state.storedIds.filter(id => picked.includes(id)),
			...picked.filter(id => !state.storedIds.includes(id))
		].slice(0, state.limit);
		await saveChoices(state.feature, ordered);
	}

	/* -------------------------------------------- */

	/** @this {ManeuverVersatilityApp} */
	static #onConfigureAbility() {
		openSuperiorityAbilityConfig(this.actor);
	}
}

/**
 * Open (or focus) the chooser for an actor.
 * @param {Actor} actor
 * @returns {ManeuverVersatilityApp|null}
 */
export function openManeuverVersatility(actor) {
	if ( !actor ) return null;
	const id = `sw5e-maneuver-versatility-${actor.id}`;
	const existing = foundry.applications.instances.get(id);
	if ( existing ) {
		existing.render({ force: true });
		existing.bringToFront?.();
		return existing;
	}
	const app = new ManeuverVersatilityApp({ actor, id });
	app.render({ force: true });
	return app;
}

/* -------------------------------------------- */
/*  Powers-tab badge                            */
/* -------------------------------------------- */

/**
 * HTML for the Superiority banner badge ("Versatile 3 / 5"), or "" when the actor lacks the feature.
 * The badge is highlighted while choices are left.
 * @param {Actor} actor
 * @returns {string}
 */
export function buildManeuverVersatilityBadge(actor) {
	const state = getManeuverVersatilityState(actor);
	if ( !state ) return "";
	const hint = state.pending
		? t("BadgePending", "Maneuver Versatility: {count} choice(s) left. Click to choose.", { count: state.pending })
		: t("BadgeHint", "Maneuver Versatility: maneuvers that count as general. Click to change.");
	const pendingClass = state.pending ? " sw5e-versatility--pending" : "";
	const extra = state.pending ? `<span class="sw5e-versatility-pending">+${state.pending}</span>` : "";
	return `<button type="button" class="sw5e-powers-known-badge sw5e-versatility-badge${pendingClass}"`
		+ ` data-action="${BADGE_ACTION}" data-tooltip="${escape(hint)}" aria-label="${escape(hint)}">`
		+ `<span class="sw5e-powers-known-label">${escape(t("Badge", "Versatile"))}</span>`
		+ `<span class="sw5e-powers-known-pair">${state.activeCount} / ${state.limit}</span>${extra}`
		+ `</button>`;
}

/**
 * Wire the badge's click handler inside a rendered banner.
 * @param {HTMLElement} root
 * @param {Actor} actor
 */
export function bindManeuverVersatilityBadge(root, actor) {
	root?.querySelectorAll(`[data-action="${BADGE_ACTION}"]`).forEach(button => {
		button.addEventListener("click", event => {
			event.preventDefault();
			event.stopPropagation();
			openManeuverVersatility(actor);
		});
	});
}

/* -------------------------------------------- */
/*  Context menus                               */
/* -------------------------------------------- */

async function setManeuverVersatile(actor, item, enable) {
	const state = getManeuverVersatilityState(actor);
	if ( !state ) return;
	const result = toggleManeuverVersatilityId(state.storedIds, item.id, enable, state.limit, state.eligibleIds);
	if ( result.blocked ) {
		ui.notifications.warn(t("NoChoicesLeft", "All {max} Maneuver Versatility choices are in use. Remove one first.", { max: state.limit }));
		return;
	}
	if ( result.changed ) await saveChoices(state.feature, result.ids);
}

function onGetItemContextOptions(item, menuItems) {
	const actor = item?.actor;
	if ( !actor || !Array.isArray(menuItems) ) return;

	if ( isManeuverVersatilityItem(item) ) {
		menuItems.push({
			name: t("Open", "Choose Versatile Maneuvers"),
			icon: `<i class="${ICON}"></i>`,
			callback: () => openManeuverVersatility(actor)
		});
		return;
	}

	if ( !isModuleType(item.type, "maneuver") || !canManage(actor) ) return;
	if ( (item.system?.type?.value || "general") === "general" ) return;
	const state = getManeuverVersatilityState(actor);
	if ( !state ) return;
	const active = state.activeIds.has(item.id);
	menuItems.push({
		name: active ? t("StopCounting", "Stop Counting as General") : t("CountAsGeneral", "Count as General (Maneuver Versatility)"),
		icon: `<i class="${ICON}"></i>`,
		callback: () => setManeuverVersatile(actor, item, !active)
	});
}

/* -------------------------------------------- */
/*  Reminders                                   */
/* -------------------------------------------- */

/**
 * Whisper the owners (and GMs) a card with a button when choices are left.
 * @param {Actor} actor
 */
async function postVersatilityReminder(actor) {
	const state = getManeuverVersatilityState(actor);
	if ( !state?.pending ) return;
	const whisper = game.users.filter(user => user.isGM || actor.testUserPermission(user, "OWNER")).map(user => user.id);
	const text = t("ChatPending", "{actor} can choose {count} more maneuver(s) to count as general maneuvers.", {
		actor: actor.name,
		count: state.pending
	});
	const content = `<div class="sw5e-mv-alert">`
		+ `<h3>${escape(t("Title", "Maneuver Versatility"))}</h3>`
		+ `<p>${escape(text)}</p>`
		+ `<button type="button" ${ALERT_BUTTON_ATTR}="${ALERT_BUTTON_VALUE}"><i class="${ICON}" inert></i> ${escape(t("Open", "Choose Versatile Maneuvers"))}</button>`
		+ `</div>`;
	await ChatMessage.implementation.create({
		content,
		whisper,
		speaker: ChatMessage.implementation.getSpeaker({ actor }),
		flags: { sw5e: { [ALERT_FLAG]: { actorUuid: actor.uuid } } }
	});
}

function scheduleReminder(actor) {
	if ( !actor?.id || (actor.type !== "character") ) return;
	clearTimeout(pendingAlerts.get(actor.id));
	pendingAlerts.set(actor.id, setTimeout(() => {
		pendingAlerts.delete(actor.id);
		postVersatilityReminder(actor).catch(err => console.error("SW5E | Maneuver Versatility reminder failed.", err));
	}, ALERT_DELAY_MS));
}

/** A class level changed (level-up or level removal) on this client. */
function onUpdateItem(item, changes, options, userId) {
	if ( userId !== game.user.id ) return;
	if ( (item?.type !== "class") || !foundry.utils.hasProperty(changes, "system.levels") ) return;
	if ( item.parent?.documentName !== "Actor" ) return;
	scheduleReminder(item.parent);
}

/** The feature itself was added (it arrives at class level 3). */
function onCreateItem(item, options, userId) {
	if ( userId !== game.user.id ) return;
	if ( item.parent?.documentName !== "Actor" ) return;
	if ( isManeuverVersatilityItem(item) ) scheduleReminder(item.parent);
}

function onRenderChatMessage(message, html) {
	const config = message?.flags?.sw5e?.[ALERT_FLAG];
	if ( !config?.actorUuid ) return;
	const root = (html instanceof HTMLElement) ? html : html?.[0];
	const button = root?.querySelector(`[${ALERT_BUTTON_ATTR}="${ALERT_BUTTON_VALUE}"]`);
	if ( !button || (button.dataset.sw5eBound === "true") ) return;
	button.dataset.sw5eBound = "true";
	button.addEventListener("click", async event => {
		event.preventDefault();
		const actor = await fromUuid(config.actorUuid);
		if ( !actor ) {
			ui.notifications.warn(t("ActorMissing", "That character no longer exists."));
			return;
		}
		openManeuverVersatility(actor);
	});
}

/** Players get a one-line reminder at login for each of their characters with choices left. */
function remindOnReady() {
	if ( game.user.isGM ) return;
	for ( const actor of game.actors ?? [] ) {
		if ( (actor.type !== "character") || !actor.isOwner ) continue;
		const state = getManeuverVersatilityState(actor);
		if ( !state?.pending ) continue;
		ui.notifications.info(t("LoginPending", "{actor} can choose {count} more maneuver(s) for Maneuver Versatility (Powers tab).", {
			actor: actor.name,
			count: state.pending
		}));
	}
}

/* -------------------------------------------- */

export function patchManeuverVersatility() {
	Hooks.on("updateItem", onUpdateItem);
	Hooks.on("createItem", onCreateItem);
	Hooks.on("renderChatMessageHTML", onRenderChatMessage);
	Hooks.on("dnd5e.getItemContextOptions", onGetItemContextOptions);
	Hooks.once("ready", remindOnReady);
}

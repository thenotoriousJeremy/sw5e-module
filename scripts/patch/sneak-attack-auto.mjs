import { safeRegisterWrapper } from "../module-support.mjs";

/**
 * Resolves Operative level for Sneak Attack calculation.
 */
function getOperativeDiceCount(actor) {
	const rollData = actor.getRollData();
	const operativeLevels = rollData.classes?.operative?.levels 
		|| rollData.classes?.rogue?.levels 
		|| actor.items?.find?.(i => i.type === "class" && (i.name.toLowerCase().includes("operative") || i.name.toLowerCase().includes("rogue")))?.system?.levels 
		|| 1;
	return Math.ceil(operativeLevels / 2);
}

/**
 * Asynchronously prompts the user for Sneak Attack before activity.rollDamage executes.
 */
async function promptSneakAttack(activity, config) {
	const item = activity.item ?? config?.subject?.item ?? config?.process?.subject?.item;
	const actor = item?.actor ?? activity.actor ?? config?.subject?.actor;
	if ( !actor || !item ) return;

	// Only apply to weapon attacks or attack activities
	const isWeapon = item.type === "weapon" 
		|| activity.type === "attack" 
		|| config?.subject?.type === "attack" 
		|| config?.process?.subject?.type === "attack"
		|| ["rwak", "mwak"].includes(activity.actionType ?? config?.subject?.actionType);

	if ( !isWeapon ) return;

	// Check if actor has Sneak Attack feature
	const sneakItem = actor.items?.find?.(i => i.type === "feat" && i.name.toLowerCase().includes("sneak attack"));
	if ( !sneakItem ) return;

	// Avoid duplicate prompts on the same roll configuration
	if ( config?._sw5eSneakAttackHandled ) return;
	if ( config ) config._sw5eSneakAttackHandled = true;

	// 1. Check Disadvantage (Disadvantage prevents Sneak Attack)
	const workflow = config?.workflow ?? globalThis.MidiQOL?.Workflow?.getWorkflow(config?.process?.id ?? config?.id);
	const attackRoll = workflow?.attackRoll ?? config?.attackRoll ?? config?.process?.attackRoll;
	
	const hasDisadvantage = !!(
		config?.disadvantage ||
		attackRoll?.hasDisadvantage ||
		attackRoll?.options?.disadvantage ||
		workflow?.hasDisadvantage ||
		workflow?.disadvantage ||
		workflow?.rollOptions?.disadvantage
	);

	if ( hasDisadvantage ) return;

	// 2. Check Advantage
	let isSneak = !!(
		config?.advantage ||
		attackRoll?.hasAdvantage ||
		attackRoll?.options?.advantage ||
		workflow?.hasAdvantage ||
		workflow?.advantage ||
		workflow?.rollOptions?.advantage
	);

	// 3. Check Adjacent Ally/Enemy of target (if not already Sneak via Advantage)
	let reasonText = isSneak ? "Attack has Advantage." : "";
	if ( !isSneak ) {
		const hitTargets = workflow?.hitTargets ?? workflow?.targets ?? Array.from(game.user?.targets ?? []);
		const targetToken = hitTargets ? (hitTargets.first?.() ?? hitTargets[0]) : null;
		const attackerToken = workflow?.token ?? canvas.tokens?.placeables.find(t => t.actor?.id === actor.id);

		if ( targetToken && attackerToken ) {
			const nearbyAlly = canvas.tokens?.placeables.filter(t => {
				if ( !t.actor || t.actor.id === actor.id || t.id === targetToken.id ) return false;
				const hp = t.actor.system?.attributes?.hp?.value;
				if ( hp !== undefined && hp <= 0 ) return false;
				const isEnemyOfTarget = t.document.disposition !== targetToken.document.disposition;
				if ( !isEnemyOfTarget ) return false;
				const distance = globalThis.MidiQOL?.getDistance ? globalThis.MidiQOL.getDistance(t, targetToken, false) : 5;
				return distance <= 5;
			});
			if ( nearbyAlly && nearbyAlly.length > 0 ) {
				isSneak = true;
				reasonText = `Ally adjacent to target (${nearbyAlly[0].name}).`;
			}
		}
	}

	if ( !isSneak ) return;

	// Await dialog user input
	const useSneak = await new Promise((resolve) => {
		new Dialog({
			title: "Sneak Attack",
			content: `<p>Apply <strong>Sneak Attack</strong> damage to this roll?</p><p><small><em>${reasonText}</em></small></p>`,
			buttons: {
				confirm: {
					icon: '<i class="fas fa-check"></i>',
					label: "Yes (Apply)",
					callback: () => resolve(true)
				},
				cancel: {
					icon: '<i class="fas fa-times"></i>',
					label: "No",
					callback: () => resolve(false)
				}
			},
			default: "confirm"
		}).render(true);
	});

	if ( !useSneak ) return;

	const diceCount = getOperativeDiceCount(actor);
	const sneakFormula = `${diceCount}d6`;

	// Append Sneak Attack damage roll configuration
	if ( config ) {
		config.rolls ??= [];
		config.rolls.push({
			parts: [sneakFormula],
			data: actor.getRollData(),
			options: { flavor: "Sneak Attack" }
		});
	}
}

let sneakAttackWrapperRegistered = false;

export function registerSneakAttackAutoBridge() {
	if ( sneakAttackWrapperRegistered ) return;
	sneakAttackWrapperRegistered = true;

	const applyWrapper = () => {
		const targetClass = globalThis.dnd5e?.documents?.activity?.AttackActivity;
		if ( !targetClass ) return;

		const targetPath = "dnd5e.documents.activity.AttackActivity.prototype.rollDamage";
		const registered = safeRegisterWrapper(targetPath, async function(wrapped, config = {}, dialogConfig = {}, messageConfig = {}) {
			await promptSneakAttack(this, config);
			return wrapped.call(this, config, dialogConfig, messageConfig);
		}, "WRAPPER");

		if ( !registered ) {
			const originalRollDamage = targetClass.prototype.rollDamage;
			targetClass.prototype.rollDamage = async function(config = {}, dialogConfig = {}, messageConfig = {}) {
				await promptSneakAttack(this, config);
				return originalRollDamage.call(this, config, dialogConfig, messageConfig);
			};
		}
	};

	if ( globalThis.game?.ready ) {
		applyWrapper();
	} else {
		Hooks.once("ready", applyWrapper);
	}
}

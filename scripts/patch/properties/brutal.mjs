import { safeRegisterWrapper } from "../../module-support.mjs";

export function patchBrutal() {
	function useBrutal(wrapped, damage, rollConfig, rollData, index = 0, options = {}) {
		const roll = wrapped(damage, rollConfig, rollData, index, options);
		if ( roll && index === 0 ) {
			const item = this.item ?? this.parent;
			const brutal = parseInt(item?.flags?.sw5e?.properties?.brutal ?? 0) || 0;
			if ( brutal > 0 ) {
				roll.options ??= {};
				roll.options.critical ??= {};
				roll.options.critical.bonusDice = (roll.options.critical.bonusDice ?? 0) + brutal;
			}
			const actionType = this.getActionType?.(rollConfig?.attackMode);
			if ( actionType === "rwak" ) {
				const rangedCritDice = parseInt(this.actor?.getFlag("dnd5e", "rangedCriticalDamageDice") ?? 0) || 0;
				if ( rangedCritDice > 0 ) {
					roll.options ??= {};
					roll.options.critical ??= {};
					roll.options.critical.bonusDice = (roll.options.critical.bonusDice ?? 0) + rangedCritDice;
				}
			}
		}
		return roll;
	}
	const target = 'dnd5e.dataModels.activity.AttackActivityData.prototype._processDamagePart';
	safeRegisterWrapper(target, useBrutal, 'MIXED');
}

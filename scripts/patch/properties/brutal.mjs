import { getModuleId } from "../../module-support.mjs";

export function patchBrutal() {
	function useBrutal(wrapped, damage, rollConfig, rollData, index = 0) {
		const roll = wrapped(damage, rollConfig, rollData, index);
		if ( roll && index === 0 ) {
			const item = this.item ?? this.parent;
			const brutal = parseInt(item?.flags?.sw5e?.properties?.brutal ?? 0) || 0;
			if ( brutal > 0 ) {
				roll.options.critical ??= {};
				roll.options.critical.bonusDice = (roll.options.critical.bonusDice ?? 0) + brutal;
			}
		}
		return roll;
	}
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.activity.AttackActivityData.prototype._processDamagePart', useBrutal, 'MIXED');
}

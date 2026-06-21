import { getModuleId } from "../../module-support.mjs";

export function patchHeavy() {
	function useHeavy(wrapped, config, process) {
		const item = process.subject?.item ?? process.subject?.parent;
		if ( item && item.type === "weapon" ) {
			const properties = item.system?.properties;
			const isHeavy = (properties instanceof Set) ? properties.has("hvy") : (Array.isArray(properties) ? properties.includes("hvy") : false);
			const abilityUsed = process.subject?.ability;
			if ( isHeavy && abilityUsed === "str" ) {
				const actor = item.actor ?? process.subject?.actor;
				const strMod = actor?.system?.abilities?.str?.mod ?? 0;
				const bonus = Math.max(1, Math.floor(strMod / 2));
				if ( bonus > 0 ) {
					config = foundry.utils.deepClone(config);
					config.parts ??= [];
					config.parts.push(String(bonus) + "[Heavy]");
				}
			}
		}
		return wrapped(config, process);
	}
	libWrapper.register(getModuleId(), 'CONFIG.Dice.DamageRoll.fromConfig', useHeavy, 'MIXED');
}

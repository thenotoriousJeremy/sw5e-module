import { getModuleId } from "../../module-support.mjs";

export function applyHeavyFromConfig(config, process) {
	if ( !config || !process ) return config;
	const item = process.subject?.item ?? process.subject?.parent ?? (process.item?.system ? process.item : null);
	if ( item && item.type === "weapon" ) {
		const properties = item.system?.properties;
		const isHeavy = (properties instanceof Set) ? properties.has("hvy") : (Array.isArray(properties) ? properties.includes("hvy") : false);
		const abilityUsed = process.subject?.ability ?? process.ability;
		if ( isHeavy && abilityUsed === "str" ) {
			const actor = item.actor ?? process.subject?.actor ?? process.actor;
			const strMod = actor?.system?.abilities?.str?.mod ?? 0;
			const bonus = Math.max(1, Math.floor(strMod / 2));
			if ( bonus > 0 ) {
				config = foundry.utils.deepClone(config);
				config.parts ??= [];
				config.parts.push(String(bonus) + "[Heavy]");
			}
		}
	}
	return config;
}

export function patchHeavy() {
	// Handled via DamageRoll.fromConfig wrapper in vicious.mjs
}

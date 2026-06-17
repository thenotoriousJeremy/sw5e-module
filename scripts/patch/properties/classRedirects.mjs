import { getModuleId } from "../../module-support.mjs";

export function patchClassRedirects() {
	function actorGetRollData(wrapped, ...args) {
		const data = wrapped(...args);
		if ( data && data.scale ) {
			const redirects = {
				barbarian: 'berserker',
				rogue: 'operative',
				paladin: 'guardian',
				ranger: 'scout',
				cleric: 'consular',
				druid: 'sentinel',
				bard: 'scholar',
				sorcerer: 'consular',
				warlock: 'sentinel',
				wizard: 'engineer'
			};
			for ( const [dndClass, swClass] of Object.entries(redirects) ) {
				if ( data.scale[swClass] && !data.scale[dndClass] ) {
					data.scale[dndClass] = data.scale[swClass];
				}
			}
		}
		return data;
	}
	libWrapper.register(getModuleId(), 'dnd5e.documents.Actor5e.prototype.getRollData', actorGetRollData, 'MIXED');
}

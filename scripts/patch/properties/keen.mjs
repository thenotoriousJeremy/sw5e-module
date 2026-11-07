import { safeRegisterWrapper } from "../../module-support.mjs";

export function patchKeen() {
	function useKeen(wrapped, ...args) {
		const keen = Number(this.parent?.flags?.sw5e?.properties?.keen) || 0;
		const result = wrapped(...args);
		if ( !keen || !this.properties?.has?.("keen") ) return result;
		const base = (Number.isFinite(result) && result > 0) ? result : 20;
		return Math.max(15, base - keen);
	}
	safeRegisterWrapper('dnd5e.dataModels.item.WeaponData.prototype.criticalThreshold', useKeen, 'MIXED');
	safeRegisterWrapper('dnd5e.dataModels.item.ActivitiesTemplate.prototype.criticalThreshold', useKeen, 'MIXED');
}

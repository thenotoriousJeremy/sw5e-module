import { getModuleId } from "../../module-support.mjs";

export function patchKeen() {
	function useKeen(wrapped, ...args) {
		const item = this.item ?? this.parent;
		const keen = parseInt(item?.flags?.sw5e?.properties?.keen ?? 0) || 0;
		const result = wrapped(...args);
		if ( !keen ) return result;
		return Math.max(15, result - keen);
	}
	libWrapper.register(getModuleId(), 'dnd5e.documents.activity.AttackActivity.prototype.criticalThreshold', useKeen, 'MIXED');
}

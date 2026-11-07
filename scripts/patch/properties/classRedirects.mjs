const CLASS_SCALE_REDIRECTS = Object.freeze({
	barbarian: "berserker",
	rogue: "operative",
	paladin: "guardian",
	ranger: "scout",
	cleric: "consular",
	druid: "sentinel",
	bard: "scholar",
	sorcerer: "consular",
	warlock: "sentinel",
	wizard: "engineer"
});

export function applyClassScaleRedirects(data) {
	if ( data && data.scale && typeof data.scale === "object" ) {
		for ( const [dndClass, swClass] of Object.entries(CLASS_SCALE_REDIRECTS) ) {
			if ( data.scale[swClass] && !data.scale[dndClass] ) {
				data.scale[dndClass] = data.scale[swClass];
			}
		}
	}
	return data;
}

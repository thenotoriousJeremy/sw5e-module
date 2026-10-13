import { safeRegisterWrapper } from "../../module-support.mjs";
import { applyHeavyFromConfig } from "./heavy.mjs";

function applyVicious(roll) {
	const vicious = roll?.options?.vicious;
	if ( !vicious || roll._viciousApplied ) return;

	const DiceTerm = globalThis.DiceTerm ?? globalThis.foundry?.dice?.terms?.DiceTerm;
	const OperatorTerm = globalThis.OperatorTerm ?? globalThis.foundry?.dice?.terms?.OperatorTerm;
	const NumericTerm = globalThis.NumericTerm ?? globalThis.foundry?.dice?.terms?.NumericTerm;
	if ( !DiceTerm || !OperatorTerm || !NumericTerm || !Array.isArray(roll?.terms) ) return;

	let maxRollsCount = 0;
	for ( const term of roll.terms ) {
		if ( term instanceof DiceTerm ) {
			for ( const res of term.results ?? [] ) {
				if ( res?.active && res?.result === term.faces ) {
					maxRollsCount++;
				}
			}
		}
	}

	if ( maxRollsCount > 0 ) {
		const bonus = vicious * maxRollsCount;

		const operator = new OperatorTerm({ operator: "+" });
		const term = new NumericTerm({
			number: bonus,
			options: { flavor: game.i18n?.localize?.("SW5E.Item.Property.Vicious") || "Vicious" }
		});

		operator._evaluated = true;
		term._evaluated = true;
		term._total = bonus;

		roll.terms.push(operator, term);
		roll._total = (roll._total ?? 0) + bonus;
		roll.resetFormula?.();
		roll._viciousApplied = true;
	}
}

export function applyViciousFromConfig(config, process) {
	if ( !config || !process ) return config;
	const item = process.subject?.item ?? process.subject?.parent ?? (process.item?.system ? process.item : null);
	const vicious = parseInt(item?.flags?.sw5e?.properties?.vicious ?? 0) || 0;
	if ( vicious > 0 ) {
		config = foundry.utils.deepClone(config);
		config.options ??= {};
		config.options.vicious = vicious;
	}
	return config;
}

export function patchVicious() {
	function fromConfig(wrapped, config, process) {
		config = applyHeavyFromConfig(config, process);
		config = applyViciousFromConfig(config, process);
		return wrapped(config, process);
	}

	async function evaluate(wrapped, options = {}) {
		const roll = await wrapped(options);
		applyVicious(roll);
		return roll;
	}

	function evaluateSync(wrapped, options = {}) {
		const roll = wrapped(options);
		applyVicious(roll);
		return roll;
	}

	safeRegisterWrapper('CONFIG.Dice.DamageRoll.fromConfig', fromConfig, 'MIXED');
	safeRegisterWrapper('CONFIG.Dice.DamageRoll.prototype.evaluate', evaluate, 'MIXED');
	safeRegisterWrapper('CONFIG.Dice.DamageRoll.prototype.evaluateSync', evaluateSync, 'MIXED');
}

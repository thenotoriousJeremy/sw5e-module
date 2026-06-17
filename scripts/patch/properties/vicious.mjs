import { getModuleId } from "../../module-support.mjs";

function applyVicious(roll) {
	const vicious = roll.options?.vicious;
	if ( !vicious || roll._viciousApplied ) return;

	let maxRollsCount = 0;
	for ( const term of roll.terms ) {
		if ( term instanceof DiceTerm ) {
			for ( const res of term.results ) {
				if ( res.active && res.result === term.faces ) {
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
			options: { flavor: game.i18n.localize("SW5E.Item.Property.Vicious") }
		});

		operator._evaluated = true;
		term._evaluated = true;
		term._total = bonus;

		roll.terms.push(operator, term);
		roll._total = (roll._total ?? 0) + bonus;
		roll.resetFormula();
		roll._viciousApplied = true;
	}
}

export function patchVicious() {
	function fromConfig(wrapped, config, process) {
		const item = process.subject?.item ?? process.subject?.parent;
		const vicious = parseInt(item?.flags?.sw5e?.properties?.vicious ?? 0) || 0;
		if ( vicious > 0 ) {
			config = foundry.utils.deepClone(config);
			config.options ??= {};
			config.options.vicious = vicious;
		}
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

	libWrapper.register(getModuleId(), 'CONFIG.Dice.DamageRoll.fromConfig', fromConfig, 'MIXED');
	libWrapper.register(getModuleId(), 'CONFIG.Dice.DamageRoll.prototype.evaluate', evaluate, 'MIXED');
	libWrapper.register(getModuleId(), 'CONFIG.Dice.DamageRoll.prototype.evaluateSync', evaluateSync, 'MIXED');
}

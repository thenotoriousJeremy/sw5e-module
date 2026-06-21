import { getModuleId } from "../../module-support.mjs";

function getAttackBonus(item, activity) {
	if (!item.actor) return 0;
	let bonus = 0;
	if (activity) {
		const ability = activity.ability || item.ability || item.system.ability;
		if (ability) {
			bonus += item.actor.system.abilities?.[ability]?.mod ?? 0;
		}
		if (item.actor.system.attributes?.prof) {
			const isProf = item.system.proficient ?? true;
			if (isProf) {
				bonus += item.actor.system.attributes.prof;
			}
		}
		bonus += item.system.attackBonus || 0;
	}
	return bonus;
}

export function patchRapid() {
	// Hook to flag chat messages from rapid weapon attacks
	Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
		const item = activity.item;
		if (item && item.type === "weapon") {
			const props = item.system.properties;
			const hasRapid = props instanceof Set ? props.has("rapid") : Array.isArray(props) ? props.includes("rapid") : false;
			if (hasRapid) {
				const val = item.flags?.sw5e?.properties?.rapid ?? 2;
				const message = results.message;
				const attackRoll = message?.rolls?.find(r => r.options?.target !== undefined) || message?.rolls?.[0];
				let attackBonus = 0;
				if (attackRoll) {
					const d20 = attackRoll.terms?.[0]?.results?.[0]?.result ?? 10;
					attackBonus = attackRoll.total - d20;
				} else {
					attackBonus = getAttackBonus(item, activity);
				}
				const dc = 8 + attackBonus;

				results.message?.setFlag("sw5e-module", "rapidAttack", {
					actorId: item.actor?.id,
					itemId: item.id,
					value: val,
					dc: dc
				});
			}
		}
	});

	// Append "Rapid Attack" button to the chat card
	Hooks.on("renderChatMessageHTML", (message, html) => {
		const flag = message.getFlag("sw5e-module", "rapidAttack");
		if (!flag) return;

		const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
		if (!root) return;

		const content = root.querySelector(".message-content") ?? root;
		if (content.querySelector(".rapid-attack-button")) return;

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "dnd5e chat-card";
		buttonContainer.style.marginTop = "8px";

		const button = document.createElement("button");
		button.className = "rapid-attack-button";
		button.innerHTML = `<i class="fas fa-crosshairs"></i> Rapid Attack (Use ${flag.value} Ammo, DC ${flag.dc})`;
		button.style.width = "100%";
		button.style.cursor = "pointer";
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			button.disabled = true;

			try {
				const actor = game.actors.get(flag.actorId) || message.actor;
				if (!actor) {
					ui.notifications.warn("Actor not found for Rapid Attack.");
					return;
				}
				const item = actor.items.get(flag.itemId);
				if (!item) {
					ui.notifications.warn("Weapon not found on the actor.");
					return;
				}

				const targets = Array.from(game.user.targets);
				if (!targets.length) {
					ui.notifications.warn("Please target a creature for Rapid Attack.");
					return;
				}

				// Deduct extra ammunition if weapon uses the reload system
				const additionalAmmo = Math.max(0, flag.value - 1);
				if (item.system.reload?.max > 0 && additionalAmmo > 0) {
					if (typeof item.system.canUseAmmo === "function" && typeof item.system.useAmmo === "function") {
						if (!item.system.canUseAmmo({ amount: additionalAmmo })) {
							ui.notifications.warn("Not enough ammunition for Rapid Attack.");
							return;
						}
						await item.system.useAmmo({ amount: additionalAmmo });
					}
				}

				// Trigger Dex save for the single target
				const target = targets[0];
				const targetActor = target.actor;
				if (targetActor) {
					const save = await targetActor.rollAbilitySave("dex", { chatMessage: true });
					if (save.total < flag.dc) {
						ui.notifications.info(`${targetActor.name} failed the saving throw against Rapid!`);
						const damageActivity = item.system.activities?.find(a => a.type === "damage") || item.system.activities?.find(a => a.type === "attack") || item;
						if (damageActivity && typeof damageActivity.use === "function") {
							// Trigger critical damage to double the damage dice
							await damageActivity.use({ critical: true });
						} else if (typeof item.use === "function") {
							await item.use({ critical: true });
						}
					} else {
						ui.notifications.info(`${targetActor.name} succeeded the saving throw against Rapid.`);
					}
				}
			} catch (err) {
				console.error("SW5e Module | Rapid Attack failed", err);
			} finally {
				button.disabled = false;
			}
		});

		buttonContainer.appendChild(button);
		content.appendChild(buttonContainer);
	});
}

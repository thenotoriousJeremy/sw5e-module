import { getModuleId } from "../../module-support.mjs";

export function patchPenetrating() {
	// Hook to flag chat messages from penetrating weapon attacks
	Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
		const item = activity.item;
		if (item && item.type === "weapon") {
			const props = item.system.properties;
			const hasPenetrating = props instanceof Set ? props.has("penetrating") : Array.isArray(props) ? props.includes("penetrating") : false;
			if (hasPenetrating) {
				const val = item.flags?.sw5e?.properties?.penetrating ?? 1;
				results.message?.setFlag("sw5e-module", "penetratingAttack", {
					actorId: item.actor?.id,
					itemId: item.id,
					value: val
				});
			}
		}
	});

	// Append "Penetrating Attack" button to the chat card
	Hooks.on("renderChatMessageHTML", (message, html) => {
		const flag = message.getFlag("sw5e-module", "penetratingAttack");
		if (!flag) return;

		const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
		if (!root) return;

		const content = root.querySelector(".message-content") ?? root;
		if (content.querySelector(".penetrating-attack-button")) return;

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "dnd5e chat-card";
		buttonContainer.style.marginTop = "8px";

		const button = document.createElement("button");
		button.className = "penetrating-attack-button";
		button.innerHTML = `<i class="fas fa-bullseye"></i> Penetrating Attack (Use ${flag.value} Ammo)`;
		button.style.width = "100%";
		button.style.cursor = "pointer";
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			button.disabled = true;

			try {
				const actor = game.actors.get(flag.actorId) || message.actor;
				if (!actor) {
					ui.notifications.warn("Actor not found for Penetrating Attack.");
					return;
				}
				const item = actor.items.get(flag.itemId);
				if (!item) {
					ui.notifications.warn("Weapon not found on the actor.");
					return;
				}

				const targets = Array.from(game.user.targets);
				if (!targets.length) {
					ui.notifications.warn("Please target the secondary creature behind your primary target.");
					return;
				}

				// Deduct extra ammunition if weapon uses the reload system
				const additionalAmmo = Math.max(0, flag.value - 1);
				if (item.system.reload?.max > 0 && additionalAmmo > 0) {
					if (typeof item.system.canUseAmmo === "function" && typeof item.system.useAmmo === "function") {
						if (!item.system.canUseAmmo({ amount: additionalAmmo })) {
							ui.notifications.warn("Not enough ammunition for Penetrating Attack.");
							return;
						}
						await item.system.useAmmo({ amount: additionalAmmo });
					}
				}

				// Check attack roll against the target's AC
				const attackRoll = message.rolls?.find(r => r.options?.target !== undefined) || message.rolls?.[0];
				const attackTotal = attackRoll ? attackRoll.total : null;
				const target = targets[0];

				if (target && attackTotal !== null) {
					const ac = target.actor?.system?.attributes?.ac?.value ?? 10;
					if (attackTotal >= ac) {
						ui.notifications.info(`${target.name} (AC ${ac}) is hit by the penetrating shot!`);
						// Roll damage activity
						const damageActivity = item.system.activities?.find(a => a.type === "damage") || item.system.activities?.find(a => a.type === "attack") || item;
						if (damageActivity && typeof damageActivity.use === "function") {
							await damageActivity.use();
						} else if (typeof item.use === "function") {
							await item.use();
						}
					} else {
						ui.notifications.info(`${target.name} (AC ${ac}) is missed by the penetrating shot.`);
					}
				} else {
					// Fallback to just rolling damage/use item
					const damageActivity = item.system.activities?.find(a => a.type === "damage") || item;
					if (damageActivity && typeof damageActivity.use === "function") {
						await damageActivity.use();
					} else if (typeof item.use === "function") {
						await item.use();
					}
				}
			} catch (err) {
				console.error("SW5e Module | Penetrating Attack failed", err);
			} finally {
				button.disabled = false;
			}
		});

		buttonContainer.appendChild(button);
		content.appendChild(buttonContainer);
	});
}

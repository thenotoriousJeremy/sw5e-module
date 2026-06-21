import { getModuleId } from "../../module-support.mjs";

export function patchShocking() {
	// Hook to flag chat messages from shocking weapon attacks
	Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
		const item = activity.item;
		if (item && item.type === "weapon") {
			const props = item.system.properties;
			const hasShocking = props instanceof Set ? props.has("shocking") : Array.isArray(props) ? props.includes("shocking") : false;
			if (hasShocking) {
				const dc = item.flags?.sw5e?.properties?.shocking ?? 10;
				results.message?.setFlag("sw5e-module", "shockingAttack", {
					actorId: item.actor?.id,
					itemId: item.id,
					dc: dc
				});
			}
		}
	});

	// Append "Trigger Shocking Save" button to the chat card
	Hooks.on("renderChatMessageHTML", (message, html) => {
		const flag = message.getFlag("sw5e-module", "shockingAttack");
		if (!flag) return;

		const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
		if (!root) return;

		const content = root.querySelector(".message-content") ?? root;
		if (content.querySelector(".shocking-save-button")) return;

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "dnd5e chat-card";
		buttonContainer.style.marginTop = "8px";

		const button = document.createElement("button");
		button.className = "shocking-save-button";
		button.innerHTML = `<i class="fas fa-bolt"></i> Trigger Shocking Save (DC ${flag.dc})`;
		button.style.width = "100%";
		button.style.cursor = "pointer";
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			button.disabled = true;

			try {
				const targets = Array.from(game.user.targets);
				if (!targets.length) {
					ui.notifications.warn("Please target at least one token to apply Shocking save.");
					return;
				}

				for (const target of targets) {
					const actor = target.actor;
					if (!actor) continue;

					// Roll Dexterity save
					const save = await actor.rollAbilitySave("dex", { chatMessage: true });
					if (save.total < flag.dc) {
						ui.notifications.info(`${actor.name} failed the saving throw!`);

						// Roll 1d4 lightning damage
						const damageRoll = await new Roll("1d4[lightning]").evaluate();
						await damageRoll.toMessage({
							flavor: `${actor.name} - Shocking Property Extra Damage`,
							speaker: ChatMessage.getSpeaker({ actor })
						});

						// Apply shocked condition
						if (typeof actor.toggleStatusEffect === "function") {
							await actor.toggleStatusEffect("shocked", { active: true });
						}
					} else {
						ui.notifications.info(`${actor.name} succeeded the saving throw.`);
					}
				}
			} catch (err) {
				console.error("SW5e Module | Shocking save failed", err);
			} finally {
				button.disabled = false;
			}
		});

		buttonContainer.appendChild(button);
		content.appendChild(buttonContainer);
	});
}

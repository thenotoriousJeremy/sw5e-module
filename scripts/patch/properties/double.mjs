import { getModuleId } from "../../module-support.mjs";

export function patchDouble() {
	// Hook to flag chat messages from double weapon attacks
	Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {
		const item = activity.item;
		if (item && item.type === "weapon") {
			const props = item.system.properties;
			const hasDouble = props instanceof Set ? props.has("double") : Array.isArray(props) ? props.includes("double") : false;
			if (hasDouble) {
				results.message?.setFlag("sw5e-module", "doubleAttack", {
					actorId: item.actor?.id,
					itemId: item.id,
					name: item.name
				});
			}
		}
	});

	// Append "Double Attack" button to the chat card
	Hooks.on("renderChatMessageHTML", (message, html) => {
		const flag = message.getFlag("sw5e-module", "doubleAttack");
		if (!flag) return;

		const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
		if (!root) return;

		const content = root.querySelector(".message-content") ?? root;
		if (content.querySelector(".double-attack-button")) return;

		const buttonContainer = document.createElement("div");
		buttonContainer.className = "dnd5e chat-card";
		buttonContainer.style.marginTop = "8px";

		const button = document.createElement("button");
		button.className = "double-attack-button";
		button.innerHTML = `<i class="fas fa-sword"></i> Double Attack (Bonus Action)`;
		button.style.width = "100%";
		button.style.cursor = "pointer";
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			button.disabled = true;

			try {
				const actor = game.actors.get(flag.actorId) || message.actor;
				if (!actor) {
					ui.notifications.warn("Actor not found for Double Attack.");
					return;
				}
				const item = actor.items.get(flag.itemId);
				if (!item) {
					ui.notifications.warn("Weapon not found on the actor.");
					return;
				}

				// Find attack activity to roll
				const activity = item.system.activities?.find(a => a.type === "attack") || item.system.activities?.first?.();
				if (activity) {
					await activity.use();
				} else if (typeof item.use === "function") {
					await item.use();
				} else {
					ui.notifications.warn("No valid attack activity found on the weapon.");
				}
			} catch (err) {
				console.error("SW5e Module | Double Attack failed", err);
			} finally {
				button.disabled = false;
			}
		});

		buttonContainer.appendChild(button);
		content.appendChild(buttonContainer);
	});
}

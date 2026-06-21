import { HOOKS_NAMESPACE } from "../module-support.mjs";

export function patchStealth() {
  // Hook into skill rolls to intercept Dexterity (Stealth)
  Hooks.on("dnd5e.rollSkill", async (rolls, data) => {
    if (!rolls || !Array.isArray(rolls) || !data || !data.subject) return;
    if (data.skill !== "ste") return;

    const actor = data.subject;
    const roll = rolls[0];
    if (!roll) return;

    const stealthValue = roll.total;

    // Apply the status effect (if not already present)
    let hidingEffect = actor.effects?.find(e => e.statuses?.has("hiding"));
    if (!hidingEffect) {
      if (typeof actor.toggleStatusEffect === "function") {
        try {
          const res = await actor.toggleStatusEffect("hiding", { active: true });
          if (res && typeof res.update === "function") {
            hidingEffect = res;
          } else {
            hidingEffect = actor.effects?.find(e => e.statuses?.has("hiding"));
          }
        } catch (err) {
          console.error("SW5e Module | Error toggling status effect: ", err);
        }
      }
    }

    // Store the stealth roll value in the status effect's flags
    if (hidingEffect) {
      if (typeof hidingEffect.update === "function") {
        try {
          await hidingEffect.update({
            "flags.sw5e-module.stealthValue": stealthValue
          });
        } catch (err) {
          console.error("SW5e Module | Error updating status effect flags: ", err);
        }
      }
    }

    // Handle hostile observers passive perception comparison
    const token = actor.getActiveTokens?.()?.[0];
    if (!token) {
      let chatContent = `<h3>Stealth Check: ${stealthValue}</h3>`;
      chatContent += `<p><strong>${actor.name}</strong> is hiding.</p>`;
      chatContent += `<p>Stealth check was made, but observer checks were skipped because the actor has no active token on the scene.</p>`;
      if (typeof ChatMessage !== "undefined") {
        try {
          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: "Hide Automation Results",
            content: chatContent,
            whisper: ChatMessage.getWhisperRecipients("GM")
          });
        } catch (err) {
          console.error("SW5e Module | Error creating ChatMessage for tokenless actor: ", err);
        }
      }
      return;
    }

    const scene = token.scene || (typeof canvas !== "undefined" && canvas.scene);
    if (!scene) return;

    const hidingDisp = token.document?.disposition;
    
    // Filter for active, non-defeated hostile tokens
    const observers = (scene.tokens || []).filter(t => {
      if (t.id === token.id) return false;
      
      // Exclude dead/defeated tokens
      if (t.actor?.statuses?.has("dead") || t.actor?.system?.attributes?.hp?.value === 0) return false;
      
      // Determine hostility (disposition differs from character)
      // FRIENDLY is 1, HOSTILE is -1
      const tDisp = t.document?.disposition;
      const hostileDisp = typeof CONST !== "undefined" ? CONST.TOKEN_DISPOSITIONS.HOSTILE : -1;
      const friendlyDisp = typeof CONST !== "undefined" ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : 1;
      const isHostile = (hidingDisp === friendlyDisp && tDisp === hostileDisp) ||
                        (hidingDisp === hostileDisp && tDisp === friendlyDisp) ||
                        (hidingDisp !== hostileDisp && tDisp === hostileDisp);
      return isHostile;
    });

    const activeCombat = typeof game !== "undefined" && game.combats?.active;
    let targetObservers = observers;
    if (activeCombat && activeCombat.scene?.id === scene.id) {
      const combatantTokenIds = new Set(activeCombat.combatants?.map(c => c.tokenId) || []);
      targetObservers = observers.filter(t => combatantTokenIds.has(t.id));
    }

    const results = targetObservers.map(obs => {
      const passivePerception = obs.actor?.system?.skills?.prc?.passive ?? 10;
      const detected = passivePerception > stealthValue;
      return { name: obs.name, passivePerception, detected };
    });

    const detectedNames = results.filter(r => r.detected).map(r => r.name);
    const hiddenNames = results.filter(r => !r.detected).map(r => r.name);

    let chatContent = `<h3>Stealth Check: ${stealthValue}</h3>`;
    chatContent += `<p><strong>${actor.name}</strong> is hiding.</p>`;
    if (detectedNames.length > 0) {
      chatContent += `<p style="color: #8b0000;"><strong>Detected by:</strong> ${detectedNames.join(", ")}</p>`;
    }
    if (hiddenNames.length > 0) {
      chatContent += `<p style="color: #006400;"><strong>Hidden from:</strong> ${hiddenNames.join(", ")}</p>`;
    }
    if (results.length === 0) {
      chatContent += `<p>No hostile observers nearby.</p>`;
    }

    if (typeof ChatMessage !== "undefined") {
      try {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          flavor: "Hide Automation Results",
          content: chatContent,
          whisper: ChatMessage.getWhisperRecipients("GM")
        });
      } catch (err) {
        console.error("SW5e Module | Error creating ChatMessage: ", err);
      }
    }
  });

  // Search hook - intercept perception checks and check against hidden actors
  Hooks.on("dnd5e.rollSkill", async (rolls, data) => {
    if (!rolls || !Array.isArray(rolls) || !data || !data.subject) return;
    if (data.skill !== "prc") return;
    const observer = data.subject;
    const roll = rolls[0];
    if (!roll) return;

    const perceptionValue = roll.total;
    const token = observer.getActiveTokens?.()?.[0];
    if (!token) return;

    const scene = token.scene || (typeof canvas !== "undefined" && canvas.scene);
    if (!scene) return;

    // Find all hidden tokens in the scene
    const hiddenTokens = (scene.tokens || []).filter(t => {
      if (t.id === token.id) return false;
      return t.actor?.effects?.some(e => e.statuses?.has("hiding"));
    });

    if (hiddenTokens.length === 0) return;

    let chatContent = `<h3>Perception Check (Search): ${perceptionValue}</h3>`;
    chatContent += `<p><strong>${observer.name}</strong> is searching.</p>`;

    hiddenTokens.forEach(t => {
      const hidingEffect = t.actor.effects.find(e => e.statuses?.has("hiding"));
      const stealthValue = hidingEffect?.getFlag?.("sw5e-module", "stealthValue") ?? 10;
      const detected = perceptionValue >= stealthValue;

      if (detected) {
        chatContent += `<p style="color: #006400;"><strong>Detected:</strong> ${t.name} (Stealth: ${stealthValue})</p>`;
      } else {
        chatContent += `<p style="color: #8b0000;"><strong>Failed to detect:</strong> ${t.name} (Stealth: ${stealthValue})</p>`;
      }
    });

    if (typeof ChatMessage !== "undefined") {
      try {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: observer }),
          flavor: "Search Automation Results",
          content: chatContent,
          whisper: ChatMessage.getWhisperRecipients("GM")
        });
      } catch (err) {
        console.error("SW5e Module | Error creating search ChatMessage: ", err);
      }
    }
  });

  // Remove hiding status when rolling attack or using active items
  Hooks.on("dnd5e.preUseActivity", async (activity, usageConfig, results) => {
    if (!activity) return;
    const actor = activity.actor || activity.item?.parent;
    if (actor && actor.statuses?.has("hiding")) {
      if (typeof actor.toggleStatusEffect === "function") {
        try {
          await actor.toggleStatusEffect("hiding", { active: false });
        } catch (err) {
          console.error("SW5e Module | Error toggling status effect in preUseActivity: ", err);
        }
      }
    }
  });
}

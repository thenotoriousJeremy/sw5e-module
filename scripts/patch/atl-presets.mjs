/**
 * Active Token Lighting (ATL) Presets & Support for SW5E
 *
 * Adds Lightsaber and Sci-Fi lighting presets to ATL's preset registry on world ready.
 */

const SW5E_ATL_PRESETS = Object.freeze([
	{
		id: "ATLPresetLightsaberBlue",
		name: "lightsaber-blue",
		light: {
			dim: 20,
			bright: 10,
			color: "#0088ff",
			alpha: 0.45,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetLightsaberGreen",
		name: "lightsaber-green",
		light: {
			dim: 20,
			bright: 10,
			color: "#00ff44",
			alpha: 0.45,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetLightsaberRed",
		name: "lightsaber-red",
		light: {
			dim: 20,
			bright: 10,
			color: "#ff1100",
			alpha: 0.45,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetLightsaberPurple",
		name: "lightsaber-purple",
		light: {
			dim: 20,
			bright: 10,
			color: "#aa00ff",
			alpha: 0.45,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetLightsaberYellow",
		name: "lightsaber-yellow",
		light: {
			dim: 20,
			bright: 10,
			color: "#ffee00",
			alpha: 0.45,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetLightsaberOrange",
		name: "lightsaber-orange",
		light: {
			dim: 20,
			bright: 10,
			color: "#ff7700",
			alpha: 0.45,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetLightsaberWhite",
		name: "lightsaber-white",
		light: {
			dim: 20,
			bright: 10,
			color: "#ffffff",
			alpha: 0.5,
			animation: {
				type: "torch",
				speed: 2,
				intensity: 1
			}
		}
	},
	{
		id: "ATLPresetGlowrod",
		name: "glowrod",
		light: {
			dim: 40,
			bright: 20,
			color: "#ffffff",
			alpha: 0.35,
			animation: {
				type: "none"
			}
		}
	},
	{
		id: "ATLPresetFusionLantern",
		name: "fusion-lantern",
		light: {
			dim: 60,
			bright: 30,
			color: "#e6f2ff",
			alpha: 0.4,
			animation: {
				type: "none"
			}
		}
	}
]);

export function patchAtlPresets() {
	Hooks.once("ready", async () => {
		if (!game.modules.get("ATL")?.active) return;
		try {
			const existingPresets = game.settings.get("ATL", "presets") || [];
			let updated = false;
			const newPresets = [...existingPresets];

			for (const swPreset of SW5E_ATL_PRESETS) {
				const existingIndex = newPresets.findIndex(p => p.id === swPreset.id || p.name === swPreset.name);
				if (existingIndex === -1) {
					newPresets.push(swPreset);
					updated = true;
				}
			}

			if (updated && (game.user?.isGM ?? false)) {
				await game.settings.set("ATL", "presets", newPresets);
				console.log("SW5E | Registered Star Wars lighting presets in ATL.");
			}
		} catch (err) {
			console.warn("SW5E | Error registering ATL presets:", err);
		}
	});
}

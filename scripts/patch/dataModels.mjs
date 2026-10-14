import * as dataModels from "./../data/_module.mjs";
import { ItemSheetSW5E } from "./../applications/item-sheet.mjs";
import { getModule, getModuleId, getModuleTypeCandidates, safeRegisterWrapper } from "../module-support.mjs";
import {
	makeCastBonusFields,
	makeLegacyPowerAttackFields,
	makeLegacyPowerBonusFields
} from "./power-bonuses.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Produce the schema field for a points resource.
 * @param {object} [schemaOptions]    Options passed to the outer schema.
 * @returns {PowerCastingData}
 */
function makePointsResource(schemaOptions = {}) {
	const baseLabel = schemaOptions.label;
	const schemaObj = {
		value: new NumberField({
			nullable: false,
			integer: true,
			min: 0,
			initial: 0,
			label: `${baseLabel}Current`
		}),
		max: new NumberField({
			nullable: true,
			integer: true,
			min: 0,
			initial: null,
			label: `${baseLabel}Override`
		}),
		bonuses: new SchemaField({
			level: new game.dnd5e.dataModels.fields.FormulaField({ deterministic: true, label: `${baseLabel}BonusLevel` }),
			overall: new game.dnd5e.dataModels.fields.FormulaField({ deterministic: true, label: `${baseLabel}BonusOverall` })
		})
	};
	if (schemaOptions.hasTemp) schemaObj.temp = new NumberField({
		integer: true,
		initial: 0,
		min: 0,
		label: `${baseLabel}Temp`
	});
	if (schemaOptions.hasTempMax) schemaObj.tempmax = new NumberField({
		integer: true,
		initial: 0,
		label: `${baseLabel}TempMax`
	});
	return new SchemaField(schemaObj, schemaOptions);
}
function addProgression(wrapped, ...args) {
	const result = wrapped(...args);
	result.spellcasting.fields.forceProgression = new StringField({
		required: true, initial: "none", blank: false, label: "SW5E.Powercasting.Force.Prog.Label"
	});
	result.spellcasting.fields.techProgression = new StringField({
		required: true, initial: "none", blank: false, label: "SW5E.Powercasting.Tech.Prog.Label"
	});
	result.spellcasting.fields.superiorityProgression = new StringField({
		required: true, initial: "none", blank: false, label: "SW5E.Superiority.Prog.Label"
	});
	return result;
}
function addPowercasting(result) {
	result.powercasting = new SchemaField({
		force: new SchemaField({
			known: new SchemaField({
				max: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.Known.Max.Override" })
			}),
			level: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.Level.Override" }),
			limit: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.Limit.Override" }),
			maxPowerLevel: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.MaxPowerLevel.Override" }),
			points: makePointsResource({ label: "SW5E.Powercasting.Force.Point.Label", hasTemp: true, hasTempMax: true }),
			schools: new SchemaField({
				lgt: new SchemaField({
					attr: new StringField({ nullable: true, initial: null, label: "SW5E.Powercasting.Force.School.Lgt.Attr.Override" }),
					dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.School.Lgt.Dc.Override" })
				}),
				uni: new SchemaField({
					attr: new StringField({ nullable: true, initial: null, label: "SW5E.Powercasting.Force.School.Uni.Attr.Override" }),
					dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.School.Uni.Dc.Override" })
				}),
				drk: new SchemaField({
					attr: new StringField({ nullable: true, initial: null, label: "SW5E.Powercasting.Force.School.Drk.Attr.Override" }),
					dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Force.School.Drk.Dc.Override" })
				})
			}, { label: "SW5E.Powercasting.Force.School.Label" }),
			used: new SetField(new NumberField(), { label: "SW5E.Powercasting.Force.Used" })
		}, { label: "SW5E.Powercasting.Force.Label" }),
		tech: new SchemaField({
			known: new SchemaField({
				max: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Tech.Known.Max.Override" })
			}),
			level: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Tech.Level.Override" }),
			limit: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Tech.Limit.Override" }),
			maxPowerLevel: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Tech.MaxPowerLevel.Override" }),
			points: makePointsResource({ label: "SW5E.Powercasting.Tech.Point.Label", hasTemp: true, hasTempMax: true }),
			schools: new SchemaField({
				tec: new SchemaField({
					attr: new StringField({ nullable: true, initial: null, label: "SW5E.Powercasting.Tech.School.Tec.Attr.Override" }),
					dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Powercasting.Tech.School.Tec.Dc.Override" })
				})
			}, { label: "SW5E.Powercasting.Tech.School.Label" }),
			used: new SetField(new NumberField(), { label: "SW5E.Powercasting.Tech.Used" })
		}, { label: "SW5E.Powercasting.Tech.Label" })
	}, { label: "SW5E.Powercasting.Label" });
}
function addSuperiority(result) {
	result.superiority = new SchemaField({
		known: new SchemaField({
			max: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Superiority.Known.Max.Override" })
		}),
		dice: makePointsResource({ label: "SW5E.Superiority.Dice.Label", hasTemp: true }),
		die: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Superiority.Die.Override" }),
		types: new SchemaField({
			physical: new SchemaField({
				attr: new StringField({ nullable: true, initial: null, label: "SW5E.Superiority.Type.Physical.Attr.Override" }),
				dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Superiority.Type.Physical.Dc.Override" })
			}),
			mental: new SchemaField({
				attr: new StringField({ nullable: true, initial: null, label: "SW5E.Superiority.Type.Mental.Attr.Override" }),
				dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Superiority.Type.Mental.Dc.Override" })
			}),
			general: new SchemaField({
				attr: new StringField({ nullable: true, initial: null, label: "SW5E.Superiority.Type.General.Attr.Override" }),
				dc: new NumberField({ nullable: true, min: 0, initial: null, label: "SW5E.Superiority.Type.General.Dc.Override" })
			})
		}, { label: "SW5E.Superiority.Type.Label" })
	}, { label: "SW5E.Superiority.Label" });
}
function addLegacyNpcDetailFields(result) {
	const detailsField = result.details;
	const detailSchema = detailsField?.fields ?? detailsField?.model?.fields;
	if ( !detailSchema ) return;

	const legacyLevelFields = {
		powerForceLevel: "SW5E.ForcecasterLevel",
		powerTechLevel: "SW5E.TechcasterLevel",
		superiorityLevel: "SW5E.SuperiorityLevel"
	};

	for (const [key, label] of Object.entries(legacyLevelFields)) {
		if ( key in detailSchema ) continue;
		detailSchema[key] = new NumberField({
			required: true,
			nullable: false,
			integer: true,
			min: 0,
			initial: 0,
			label
		});
	}

	if ( !("tier" in detailSchema) ) {
		detailSchema.tier = new NumberField({
			required: true,
			nullable: false,
			integer: true,
			min: 0,
			initial: 0,
			label: "Tier"
		});
	}
}

function addPowerBonusFields(result) {
	const bonusFields = result.bonuses?.fields;
	if ( !bonusFields ) return;

	bonusFields.mpak = makeLegacyPowerAttackFields({ label: "SW5E.BonusMPAttack" });
	bonusFields.rpak = makeLegacyPowerAttackFields({ label: "SW5E.BonusRPAttack" });
	bonusFields.power = makeLegacyPowerBonusFields();
	bonusFields.force = makeCastBonusFields("force");
	bonusFields.tech = makeCastBonusFields("tech");
}

function changeProficiency(result, type) {
	if (type === "creature") {
		result.skills.model.fields.value.max = 5;
		result.abilities.model.fields.proficient.max = 5;
	} else {
		if (type !== "weapon") result.proficient.max = 5;
		result.proficient.integer = false;
		result.proficient.step = 0.5;
	}
}

function addStarshipWeaponFacingFields(schema) {
	schema.firingArc = new StringField({
		required: true,
		blank: true,
		initial: "",
		label: "SW5E.StarshipWeaponFacing"
	});
	schema.turreted = new BooleanField({
		required: true,
		initial: false,
		label: "SW5E.StarshipWeaponTurreted"
	});
}

export function patchDataModels() {
	// Powercasting
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.item.ClassData.defineSchema', addProgression, 'WRAPPER');
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.item.SubclassData.defineSchema', addProgression, 'WRAPPER');
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.actor.CreatureTemplate.defineSchema', function (wrapped, ...args) {
		const result = wrapped(...args);
		addLegacyNpcDetailFields(result);
		addPowerBonusFields(result);
		addPowercasting(result);
		addSuperiority(result);
		changeProficiency(result, "creature");
		return result;
	}, 'WRAPPER');
	// DND5e 5.3.3 owns NPC `details` on NPCData, not CreatureTemplate. Re-apply legacy
	// powerForceLevel / powerTechLevel / superiorityLevel after NPCData.replace-merge.
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.actor.NPCData.defineSchema', function (wrapped, ...args) {
		const result = wrapped(...args);
		addLegacyNpcDetailFields(result);
		return result;
	}, 'WRAPPER');
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.item.ToolData.defineSchema', function (wrapped, ...args) {
		const result = wrapped(...args);
		changeProficiency(result, "tool");
		return result;
	}, 'WRAPPER');
	libWrapper.register(getModuleId(), 'dnd5e.dataModels.item.WeaponData.defineSchema', function (wrapped, ...args) {
		const result = wrapped(...args);
		changeProficiency(result, "weapon");
		addStarshipWeaponFacingFields(result);
		return result;
	}, 'WRAPPER');

	// Defensive DocumentUUID normalizer: auto-upgrade 3-part compendium UUIDs to 4-part in DocumentUUIDField
	const DocumentUUIDField = globalThis.foundry?.data?.fields?.DocumentUUIDField;
	if ( DocumentUUIDField?.prototype && !DocumentUUIDField.prototype._sw5eCleanPatched ) {
		const origCleanType = DocumentUUIDField.prototype._cleanType;
		if ( typeof origCleanType === "function" ) {
			DocumentUUIDField.prototype._cleanType = function(value, options, ...args) {
				if ( typeof value === "string" && value.startsWith("Compendium.") ) {
					const m = value.match(/^Compendium\.([^.]+)\.([^.]+)\.([^.]+)$/);
					if ( m ) {
						const docType = this.type ?? "Item";
						value = `Compendium.${m[1]}.${m[2]}.${docType}.${m[3]}`;
					}
				}
				return origCleanType.call(this, value, options, ...args);
			};
		}
		DocumentUUIDField.prototype._sw5eCleanPatched = true;
	}

	// Defensive ItemGrantConfigurationData cleaner: fix legacy 3-part compendium UUIDs
	safeRegisterWrapper('dnd5e.dataModels.advancement.ItemGrantConfigurationData._cleanData', function(wrapped, source, options, ...args) {
		if ( source && Array.isArray(source.items) ) {
			for ( const entry of source.items ) {
				if ( entry && typeof entry === "object" && typeof entry.uuid === "string" ) {
					const m = entry.uuid.match(/^Compendium\.([^.]+)\.([^.]+)\.([^.]+)$/);
					if ( m ) entry.uuid = `Compendium.${m[1]}.${m[2]}.Item.${m[3]}`;
				}
			}
		}
		return wrapped(source, options, ...args);
	}, 'WRAPPER');

	// Defensive Activity ID and duration sanitizers
	safeRegisterWrapper('dnd5e.dataModels.activity.BaseActivityData._cleanData', function(wrapped, source, options, ...args) {
		if ( source && typeof source === "object" ) {
			let id = source._id;
			if ( typeof id === "string" ) {
				if ( id.length < 16 && /^[a-zA-Z0-9]+$/.test(id) ) source._id = id.padEnd(16, "0");
				else if ( id.length > 16 ) source._id = id.slice(0, 16);
				else if ( !/^[a-zA-Z0-9]{16}$/.test(id) ) source._id = (globalThis.foundry?.utils?.randomID?.(16) ?? "sw5e0act00000000").padEnd(16, "0");
			}
			if ( source.duration ) {
				if ( source.duration.value === "inst" || (source.duration.units === "inst" && typeof source.duration.value === "string" && !/^\d+$/.test(source.duration.value.trim())) ) {
					source.duration.value = "";
				}
			}
		}
		return wrapped(source, options, ...args);
	}, 'WRAPPER');

	safeRegisterWrapper('dnd5e.dataModels.activity.ActivityDurationData._cleanData', function(wrapped, source, options, ...args) {
		if ( source && typeof source === "object" ) {
			if ( source.value === "inst" || (source.units === "inst" && typeof source.value === "string" && !/^\d+$/.test(source.value.trim())) ) {
				source.value = "";
			}
		}
		return wrapped(source, options, ...args);
	}, 'WRAPPER');

	safeRegisterWrapper('dnd5e.dataModels.abstract.ItemDataModel._cleanData', function(wrapped, source, options, ...args) {
		if ( source?.activities && typeof source.activities === "object" ) {
			const sanitized = {};
			for ( let [k, v] of Object.entries(source.activities) ) {
				if ( v && typeof v === "object" ) {
					let id = v._id || k;
					if ( typeof id === "string" ) {
						if ( id.length < 16 && /^[a-zA-Z0-9]+$/.test(id) ) id = id.padEnd(16, "0");
						else if ( id.length > 16 ) id = id.slice(0, 16);
						else if ( !/^[a-zA-Z0-9]{16}$/.test(id) ) id = (globalThis.foundry?.utils?.randomID?.(16) ?? "sw5e0act00000000").padEnd(16, "0");
					} else {
						id = (globalThis.foundry?.utils?.randomID?.(16) ?? "sw5e0act00000000").padEnd(16, "0");
					}
					v._id = id;
					if ( v.duration && (v.duration.value === "inst" || (v.duration.units === "inst" && typeof v.duration.value === "string" && !/^\d+$/.test(v.duration.value.trim()))) ) {
						v.duration.value = "";
					}
					sanitized[id] = v;
				}
			}
			source.activities = sanitized;
		}
		return wrapped(source, options, ...args);
	}, 'WRAPPER');

	const DocumentIdField = globalThis.foundry?.data?.fields?.DocumentIdField;
	if ( DocumentIdField?.prototype && !DocumentIdField.prototype._sw5eCleanPatched ) {
		const origCleanType = DocumentIdField.prototype._cleanType;
		if ( typeof origCleanType === "function" ) {
			DocumentIdField.prototype._cleanType = function(value, options, ...args) {
				if ( typeof value === "string" ) {
					if ( value.length < 16 && /^[a-zA-Z0-9]+$/.test(value) ) value = value.padEnd(16, "0");
					else if ( value.length > 16 ) value = value.slice(0, 16);
				}
				return origCleanType.call(this, value, options, ...args);
			};
		}
		DocumentIdField.prototype._sw5eCleanPatched = true;
	}

	const ActivitiesField = globalThis.dnd5e?.dataModels?.fields?.ActivitiesField ?? globalThis.dnd5e?.dataModels?.item?.ActivitiesField;
	if ( ActivitiesField?.prototype && !ActivitiesField.prototype._sw5eCleanPatched ) {
		const origCleanType = ActivitiesField.prototype._cleanType;
		if ( typeof origCleanType === "function" ) {
			ActivitiesField.prototype._cleanType = function(value, options, _state, ...args) {
				_state ??= (options?._state ?? { source: value });
				if ( value && typeof value === "object" ) {
					const sanitized = {};
					for ( let [k, v] of Object.entries(value) ) {
						if ( v && typeof v === "object" ) {
							let id = v._id || k;
							if ( typeof id === "string" ) {
								if ( id.length < 16 && /^[a-zA-Z0-9]+$/.test(id) ) id = id.padEnd(16, "0");
								else if ( id.length > 16 ) id = id.slice(0, 16);
								else if ( !/^[a-zA-Z0-9]{16}$/.test(id) ) id = (globalThis.foundry?.utils?.randomID?.(16) ?? "sw5e0act00000000").padEnd(16, "0");
							} else {
								id = (globalThis.foundry?.utils?.randomID?.(16) ?? "sw5e0act00000000").padEnd(16, "0");
							}
							v._id = id;
							if ( v.duration && (v.duration.value === "inst" || (v.duration.units === "inst" && typeof v.duration.value === "string" && !/^\d+$/.test(v.duration.value.trim()))) ) {
								v.duration.value = "";
							}
							sanitized[id] = v;
						}
					}
					value = sanitized;
				}
				return origCleanType.call(this, value, options, _state, ...args);
			};
		}
		ActivitiesField.prototype._sw5eCleanPatched = true;
	}

	function ensureItemActivitiesIterable(item) {
		if ( !item?.system ) return;
		const sys = item.system;
		if ( sys.activities && typeof sys.activities === "object" && !(Symbol.iterator in sys.activities) ) {
			const ActivitiesFieldCls = globalThis.dnd5e?.dataModels?.fields?.ActivitiesField ?? globalThis.dnd5e?.dataModels?.item?.ActivitiesField;
			const field = sys.schema?.fields?.activities ?? (ActivitiesFieldCls ? new ActivitiesFieldCls() : null);
			if ( field?.initialize ) {
				try {
					sys.activities = field.initialize(sys.activities, sys);
				} catch (_) {}
			}
			if ( !sys.activities || !(Symbol.iterator in sys.activities) ) {
				const arr = Object.values(sys.activities ?? {});
				for ( const act of arr ) {
					if ( act && typeof act === "object" && typeof act.prepareData !== "function" ) {
						act.prepareData = () => {};
					}
				}
				sys.activities = arr;
			}
		}
		if ( sys.advancement && typeof sys.advancement === "object" && !(Symbol.iterator in sys.advancement) ) {
			const AdvFieldCls = globalThis.dnd5e?.dataModels?.fields?.AdvancementCollectionField ?? globalThis.dnd5e?.dataModels?.item?.AdvancementCollectionField;
			const advField = sys.schema?.fields?.advancement ?? (AdvFieldCls ? new AdvFieldCls() : null);
			if ( advField?.initialize ) {
				try {
					sys.advancement = advField.initialize(sys.advancement, sys);
				} catch (_) {}
			}
			if ( !sys.advancement || !(Symbol.iterator in sys.advancement) ) {
				const arr = Object.values(sys.advancement ?? {});
				for ( const adv of arr ) {
					if ( adv && typeof adv === "object" && typeof adv.prepareData !== "function" ) {
						adv.prepareData = () => {};
					}
				}
				sys.advancement = arr;
			}
		}
		if ( !sys.validProperties || typeof sys.validProperties.has !== "function" ) {
			const config = CONFIG.DND5E.validProperties?.[item.type] ?? [];
			sys.validProperties = new Set([...config, ...(config[sys.type?.value] ?? [])]);
		}
	}

	// Defensive validProperties getter for all ItemDataModels lacking PhysicalItemTemplate (spells, powers, feats, etc.)
	const ItemDataModelProto = globalThis.dnd5e?.dataModels?.abstract?.ItemDataModel?.prototype;
	if ( ItemDataModelProto && !Object.getOwnPropertyDescriptor(ItemDataModelProto, "validProperties") ) {
		Object.defineProperty(ItemDataModelProto, "validProperties", {
			get() {
				const config = CONFIG.DND5E.validProperties?.[this.parent?.type] ?? [];
				return new Set([...config, ...(config[this.type?.value] ?? [])]);
			},
			configurable: true,
			enumerable: false
		});
	}

	// Defensive requiresConcentration wrapper to prevent "validProperties is undefined" crash
	safeRegisterWrapper('dnd5e.documents.Item5e.prototype.requiresConcentration', function(wrapped) {
		if ( !this.system?.validProperties || typeof this.system.validProperties.has !== "function" ) {
			const hasProp = Boolean(this.system?.properties?.has?.("concentration") || this.system?.properties?.includes?.("concentration"));
			if ( hasProp ) return true;
			return this.system?.activities?.contents?.[0]?.duration?.concentration ?? false;
		}
		return wrapped();
	}, 'WRAPPER');

	// Defensive wrappers on document preparation to prevent "is not iterable" crashes during delta applications
	safeRegisterWrapper('dnd5e.documents.Actor5e.prototype.prepareEmbeddedDocuments', function(wrapped, ...args) {
		for ( const item of this.items ?? [] ) {
			ensureItemActivitiesIterable(item);
		}
		return wrapped(...args);
	}, 'WRAPPER');

	safeRegisterWrapper('dnd5e.documents.Item5e.prototype.prepareEmbeddedDocuments', function(wrapped, ...args) {
		ensureItemActivitiesIterable(this);
		try {
			return wrapped(...args);
		} catch (err) {
			if ( err?.message?.includes("is not iterable") ) {
				ensureItemActivitiesIterable(this);
				try {
					return wrapped(...args);
				} catch (_) {
					return;
				}
			}
			throw err;
		}
	}, 'WRAPPER');

	safeRegisterWrapper('dnd5e.documents.Item5e.prototype.prepareDerivedData', function(wrapped, ...args) {
		ensureItemActivitiesIterable(this);
		try {
			return wrapped(...args);
		} catch (err) {
			if ( err?.message?.includes("is not iterable") || err?.message?.includes("validProperties") ) {
				ensureItemActivitiesIterable(this);
				try {
					return wrapped(...args);
				} catch (_) {
					return;
				}
			}
			throw err;
		}
	}, 'WRAPPER');



	// Defensive ActiveEffect change guard: prevent "setting getter-only property 'background'"
	safeRegisterWrapper('dnd5e.documents.ActiveEffect5e.applyChangeField', function(wrapped, model, change, options) {
		if ( change?.key === "background" || change?.key === "system.details.background" || change?.key?.endsWith(".background") ) {
			return;
		}
		try {
			return wrapped(model, change, options);
		} catch (err) {
			if ( err.message?.includes("getter-only property") ) return;
			throw err;
		}
	}, 'WRAPPER');

	// Defensive shimData wrapper: guard against Firefox SpiderMonkey Proxy invariant crashes on 'changes'
	const shimClasses = [
		globalThis.foundry?.documents?.BaseActiveEffect,
		globalThis.foundry?.documents?.BaseActorDelta,
		globalThis.CONFIG?.ActiveEffect?.documentClass,
		globalThis.CONFIG?.ActorDelta?.documentClass,
		globalThis.dnd5e?.documents?.ActiveEffect5e
	];
	for ( const cls of shimClasses ) {
		if ( cls && typeof cls.shimData === "function" && !cls.shimData._sw5ePatched ) {
			const origShim = cls.shimData;
			cls.shimData = function(data, options) {
				try {
					return origShim.call(this, data, options);
				} catch (err) {
					if ( err?.message?.includes("incompatible property descriptor") || err?.message?.includes("non-extensible") ) {
						return data;
					}
					throw err;
				}
			};
			cls.shimData._sw5ePatched = true;
		}
	}

	// Defensive scaleValues guard: handle documents where this.advancement is undefined
	const patchScaleValuesOnProto = (proto) => {
		let curr = proto;
		while ( curr && curr !== Object.prototype ) {
			const desc = Object.getOwnPropertyDescriptor(curr, "scaleValues");
			if ( desc?.get && !desc.get._sw5ePatched ) {
				const orig = desc.get;
				const patched = function() {
					if ( !this.advancement?.byType ) return {};
					try {
						return orig.call(this);
					} catch (_) {
						return {};
					}
				};
				patched._sw5ePatched = true;
				try {
					Object.defineProperty(curr, "scaleValues", {
						...desc,
						get: patched
					});
				} catch (_) {}
			}
			curr = Object.getPrototypeOf(curr);
		}
	};
	patchScaleValuesOnProto(globalThis.dnd5e?.documents?.Item5e?.prototype);
	patchScaleValuesOnProto(globalThis.CONFIG?.Item?.documentClass?.prototype);
	patchScaleValuesOnProto(globalThis.Item?.prototype);

	Object.assign(CONFIG.Item.dataModels, dataModels.item.config);
	const module = getModule();
	const types = Object.keys(module?.documentTypes?.Item ?? {}).flatMap(getModuleTypeCandidates);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, getModuleId(), ItemSheetSW5E, { types, makeDefault: true });
}

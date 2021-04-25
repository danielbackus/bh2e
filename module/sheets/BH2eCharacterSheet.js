import {castMagic,
        castMagicAsRitual,
        prepareMagic,
        unprepareMagic} from '../magic.js';
import {deleteOwnedItem,
        findActorFromItemId,
        generateDieRollFormula,
        initializeCharacterSheetUI,
        interpolate,
        onTabSelected} from '../shared.js';
import {logAttackRoll,
        logAttributeTest,
        logUsageDieRoll} from '../chat_messages.js';

export default class BH2eCharacterSheet extends ActorSheet {
    static get defaultOptions() {
        return(mergeObject(super.defaultOptions,
                           {classes: ["bh2e", "sheet", "character"],
                            template: "systems/bh2e/templates/sheets/character-sheet.html"}));
    }

    getData() {
        const data    = super.getData();
        const abilities = [];
        const armour    = [];
        const classes   = [];
        const equipment = [];
        const prayers   = [];
        const spells = [];
        let weapons   = [];

        data.bh2e      = CONFIG.bh2e;
        data.config    = CONFIG.bh2e.configuration;

        data.items.forEach((item) => {
            switch(item.type) {
                case "ability":
                    abilities.push(item);
                    break;

                case "armour":
                    armour.push(item);
                    break;

                case "class":
                    classes.push(item);
                    break;

                case "equipment":
                    equipment.push(item);
                    break;

                case "magic":
                    let index = item.data.level - 1;

                    // if(index >= 0 && index < spells.length) {
                        switch(item.data.kind) {
                            case "prayer":
                                prayers.push(item);
                                break;

                            case "spell":
                                spells.push(item);
                                break;

                            default:
                                console.warn("Ignoring character item magic", item);
                        }
                    // } else {
                    //     console.error(`An invalid level of ${item.data.level} was specified for a spell or prayer.`, item);
                    // }
                    break;

                case "weapon":
                    weapons.push(item);
                    break;

                default:
                    console.warn("Ignoring character item", item);
            }
        });

        abilities.sort(function(lhs, rhs) {
            if(lhs.name > rhs.name) {
              return(1);
            } else if(lhs.name < rhs.name) {
              return(-1);
            } else {
              return(0);
            }
        });

        data.abilities    = abilities;
        data.armour       = armour;
        data.classes      = classes;
        data.equipment    = equipment;
        data.hasPrayers = prayers.length;
        data.hasSpells = spells.length;
        data.prayers = prayers;
        data.spells = spells;
        data.weapons      = weapons;

        return(data);
    }

    activateListeners(html) {
        initializeCharacterSheetUI(window.bh2e.state);

        html.find(".bh2e-roll-attack-icon").click(this._onRollAttackClicked.bind(this));
        html.find(".bh2e-roll-attribute-test-icon").click(this._onRollAttributeTest.bind(this));
        html.find(".bh2e-roll-usage-die-icon").click(this._onRollUsageDieClicked.bind(this));
        html.find(".bh2e-delete-item-icon").click(this._onDeleteItemClicked.bind(this));
        html.find(".bh2e-break-armour-die-icon").click(this._onBreakArmourDieClicked.bind(this));
        html.find(".bh2e-repair-armour-die-icon").click(this._onRepairArmourDieClicked.bind(this));
        html.find(".bh2e-repair-all-armour-dice-icon").click(this._onRepairAllArmourDiceClicked.bind(this));
        html.find(".bh2e-reset-all-usage-dice-icon").click(this._onResetUsageDiceClicked.bind(this));
        html.find(".bh2e-reset-usage-die-icon").click(this._onResetUsageDieClicked.bind(this));
        html.find(".bh2e-increase-quantity-icon").click(this._onIncreaseEquipmentQuantityClicked.bind(this));
        html.find(".bh2e-decrease-quantity-icon").click(this._onDecreaseEquipmentQuantityClicked.bind(this));
        html.find(".bh2e-cast-magic-icon").click(castMagic);
        html.find(".bh2e-cast-magic-as-ritual-icon").click(castMagicAsRitual);
        html.find(".bh2e-prepare-magic-icon").click(prepareMagic);
        html.find(".bh2e-unprepare-magic-icon").click(unprepareMagic);

        super.activateListeners(html);
    }

    _onBreakArmourDieClicked(event) {
        let element = event.currentTarget;

        event.preventDefault();
        if(element.dataset.id) {
            console.log(`Breakage of armour die on armour item id ${element.dataset.id}.`);
            let actor = findActorFromItemId(element.dataset.id);
            if(actor) {
                let item  = actor.items.find(i => i._id === element.dataset.id);

                if(item) {
                    if(item.data.data.armourValue.total > item.data.data.armourValue.broken) {
                        let data = {_id: item._id,
                                    data: {
                                      armourValue: {
                                        broken: item.data.data.armourValue.broken + 1
                                    }}};

                        actor.updateOwnedItem(data, {diff: true});
                    }
                } else {
                    console.error(`Failed to find item id ${element.dataset.id}.`);
                }
            } else {
              console.error(`Failed to find an actor that owns item id ${element.dataset.id}.`);
            }
        } else {
            console.error(`Element had no item id on it.`)
        }

        return(false);
    }

    _onDeleteItemClicked(event) {
        let element = event.currentTarget;

        event.preventDefault();
        if(element.dataset.id) {
            deleteOwnedItem(element.dataset.id);
        } else {
            console.error("Delete item called for but item id is not present on the element.");
        }
        return(false);
    }

    _onDecreaseEquipmentQuantityClicked(evemt) {
        let element = event.currentTarget;

        event.preventDefault();
        if(element.dataset.id) {
            let actor = findActorFromItemId(element.dataset.id);

            if(actor) {
                this.decrementEquipmentQuantity(actor, element.dataset.id)
            } else {
                console.error(`Failed to find an actor that owns item id ${element.dataset.id}.`);
            }
        } else {
            console.error(`Element had no item id on it.`)
        }
        return(false);
    }

    _onIncreaseEquipmentQuantityClicked(evemt) {
        let element = event.currentTarget;

        event.preventDefault();
        if(element.dataset.id) {
            let actor = findActorFromItemId(element.dataset.id);
            if(actor) {
                this.incrementEquipmentQuantity(actor, element.dataset.id)
            } else {
                console.error(`Failed to find an actor that owns item id ${element.dataset.id}.`);
            }
        } else {
            console.error(`Element had no item id on it.`)
        }
        return(false);
    }

    _onRepairAllArmourDiceClicked(event) {
        let element = event.currentTarget;
        let actor   = game.actors.find(a => a._id === element.dataset.id);

        event.preventDefault();
        if(actor) {
            console.log("Repairing all armour dice for actor id ${actor._id}.");
            actor.data.items.forEach(function(item) {
                let data = {data: {armourValue: {broken: 0}}};

                if(item.type === "armour") {
                    if(item.data.armourValue.broken > 0) {
                      data._id = item._id;
                      actor.updateOwnedItem(data, {diff: true});
                    }
                }
            });
        } else {
            console.error(`Failed to find an actor with the id ${element.dataset.id}.`)
        }
        return(false);
    }

    _onRepairArmourDieClicked(event) {
        let element = event.currentTarget;

        event.preventDefault();
        if(element.dataset.id) {
            console.log(`Repairing of armour die on armour item id ${element.dataset.id}.`);
            let actor = findActorFromItemId(element.dataset.id);
            if(actor) {
                let item  = actor.items.find(i => i._id === element.dataset.id);

                if(item) {
                    if(item.data.data.armourValue.broken > 0) {
                        let data = {_id: item._id,
                                    data: {
                                      armourValue: {
                                        broken: item.data.data.armourValue.broken - 1
                                    }}};

                        actor.updateOwnedItem(data, {diff: true});
                    }
                } else {
                    console.error(`Failed to find item id ${element.dataset.id}.`);
                }
            } else {
                console.error(`Failed to find an actor that owns item id ${element.dataset.id}.`);
            }
        } else {
            console.error(`Element had no item id on it.`)
        }
        return(false);
    }

    _onResetUsageDiceClicked(event) {
        let element = event.currentTarget;
        let actorId  = element.dataset.id;

        event.preventDefault();
        if(actorId) {
            let actor = game.actors.find(a => a._id === actorId);

            if(actor) {
                actor.items.forEach(item => this.resetUsageDie(actor, item._id));
            } else {
                console.error(`Unable to locate an actor wth the id ${actorId}.`);
            }
        } else {
            console.error("Actor id not found in element data set.");
        }
        return(false);
    }

    _onResetUsageDieClicked(event) {
        let element = event.currentTarget;
        let itemId  = element.dataset.id;

        event.preventDefault();
        if(itemId) {
            let actor = findActorFromItemId(itemId);

            if(actor) {
                this.resetUsageDie(actor, itemId);
            } else {
                console.error(`Unable to locate an owning actor for item id ${itemId}.`);
            }
        } else {
            console.error("Equipment element does not possess an item id.");
        }
        return(false);
    }

    _onRollAttackClicked(event) {
        let element = event.currentTarget;
        let actor   = findActorFromItemId(element.dataset.id);

        event.preventDefault();
        logAttackRoll(actor._id, element.dataset.id, event.shiftKey, event.ctrlKey);

        return(false);
    }

    _onRollAttributeTest(event) {
      let element = event.currentTarget;
      let actor   = game.actors.find(a => a._id === element.dataset.id);

      event.preventDefault();
      logAttributeTest(element.dataset.id, element.dataset.attribute, event.shiftKey, event.ctrlKey);
      return(false);
    }

    _onRollUsageDieClicked(event) {
        let element = event.currentTarget;

        event.preventDefault();
        logUsageDieRoll(element.dataset.id);
        return(false);
    }

    decrementEquipmentQuantity(actor, itemId) {
        let item = actor.items.find(i => i._id === itemId);

        if(item && item.type === "equipment") {
            let itemData = item.data.data;

            if(itemData.usageDie && itemData.usageDie.maximum !== "none") {
                if(itemData.quantity > 0) {
                    let data = {_id: item._id,
                                data: {
                                  quantity: itemData.quantity - 1
                                }};
                    actor.updateOwnedItem(data, {diff: true});
                } else {
                    console.warn(`Unable to decrease quantity for the ${item.name} item (id: ${item._id}) as it's already at zero.`);
                }
            } else {
              console.warn(`Unable to increase quantity for the ${item.name} item (id ${item.name}) (${item._id}) as it does not have a usage die.`);
            }
        } else {
            if(!item) {
                console.error(`The actor '${actor.name}' (id ${actor._id}) does not appear to own item id ${itemId}.`);
            }
        }
    }

    incrementEquipmentQuantity(actor, itemId) {
        let item = actor.items.find(i => i._id === itemId);

        if(item && item.type === "equipment") {
            let itemData = item.data.data;

            if(itemData.usageDie && itemData.usageDie.maximum !== "none") {
                let data = {_id: item._id,
                            data: {
                              quantity: itemData.quantity + 1
                            }};
                actor.updateOwnedItem(data, {diff: true});
            } else {
                console.warn(`Unable to increase quantity for item id ${item.name} (${item._id}) as it does not have a usage die.`);
            }
        } else {
            if(!item) {
                console.error(`The actor '${actor.name}' (id ${actor._id}) does not appear to own item id ${itemId}.`);
            }
        }
    }

    resetUsageDie(actor, itemId) {
        let item = actor.items.find(i => i._id === itemId);

        if(item && item.type === "equipment") {
            let itemData = item.data.data;

            if(itemData.usageDie && itemData.usageDie.maximum !== "none") {
                if(itemData.quantity > 0) {
                    if(itemData.usageDie.current !== itemData.usageDie.maximum) {
                        let data = {
                          _id: item._id,
                            data: {
                              usageDie: {
                                current: itemData.usageDie.maximum
                              }
                            }
                        };
                        actor.updateOwnedItem(data, {diff: true});
                    } else {
                      console.warn(`Unable to reset the usage die for item ${item.name} (id ${item._id}) as it's at it's maximum usage die.`);
                    }
                } else {
                  console.warn(`Unable to reset the usage die for item ${item.name} (id ${item._id}) as it's supply is depleted.`);
                  ui.notifications.error(interpolate("bh2e.messages.errors.supplyDepleted", {item: item.name}))
                }
            } else {
              console.warn(`Unable to reset the usage die for item id ${item.name} (${item._id}) as it does not have a usage die.`);
            }
        } else {
            if(!item) {
                console.error(`The actor '${actor.name}' (id ${actor._id}) does not appear to own item id ${itemId}.`);
            }
        }
    }
}

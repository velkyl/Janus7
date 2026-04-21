import { JanusBaseApp } from '../core/base-app.js';
import { moduleTemplatePath } from '../../core/common.js';
import { getJanusCore } from '../../core/index.js';

function _resolveBrewerActor() {
  return canvas?.tokens?.controlled?.[0]?.actor
    ?? game.user?.character
    ?? game.actors?.contents?.find((actor) => actor?.type === 'character' && actor?.isOwner)
    ?? null;
}

function _parseBrewModifier(target) {
  const raw = target?.closest?.('.j7-brew-actions')?.querySelector?.('.j7-mod-input')?.value ?? 0;
  const modifier = Number(raw);
  return Number.isFinite(modifier) ? modifier : 0;
}

function _resolveRecipeResultSpec(recipe = {}) {
  const result = recipe?.system?.result ?? recipe?.system?.results?.[0] ?? null;
  if (typeof result === 'string') return { name: result, quantity: 1 };
  if (result && typeof result === 'object') return result;
  return null;
}

async function _createBrewResult(stashActor, recipe = {}) {
  const resultSpec = _resolveRecipeResultSpec(recipe);
  if (!stashActor || !resultSpec) return false;

  const quantity = Math.max(1, Number(resultSpec.quantity ?? resultSpec.qty ?? 1) || 1);
  const resultName = String(resultSpec.name ?? resultSpec.label ?? '').trim();
  if (resultName) {
    const existing = stashActor.items.find((item) => String(item.name ?? '').trim().toLowerCase() === resultName.toLowerCase());
    if (existing) {
      const current = Number(existing.system?.quantity ?? 0) || 0;
      await existing.update({ 'system.quantity': current + quantity });
      return true;
    }
  }

  const resultUuid = String(resultSpec.uuid ?? resultSpec.itemUuid ?? '').trim();
  if (!resultUuid) return false;

  const source = await fromUuid(resultUuid);
  if (!source?.toObject) return false;

  const itemData = source.toObject();
  itemData.system = itemData.system ?? {};
  itemData.system.quantity = quantity;
  await stashActor.createEmbeddedDocuments('Item', [itemData]);
  return true;
}

export class JanusLaborApp extends JanusBaseApp {
  static DEFAULT_OPTIONS = {
    id: 'janus7-labor-interface',
    classes: ['janus7-app', 'janus7-labor-interface', 'premium-surface'],
    position: { width: 900, height: 600 },
    window: {
      title: 'Alchimie-Labor · Gruppen-Stash',
      resizable: true,
      minimizable: true,
      icon: 'fas fa-vials'
    },
    actions: {
      selectRecipe: JanusLaborApp.onSelectRecipe,
      brewRecipe: JanusLaborApp.onBrewRecipe
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('extensions/labor-interface/labor-app.hbs')
    }
  };

  constructor(options = {}) {
    super(options);
    this._activeRecipeId = null;
  }

  /** @override */
  async _preRender(options) {
    await super._preRender(options);
    const { core } = getJanusCore();
    const stashActorId = core.config.get('stashActorId');
    const stashActor = game.actors.get(stashActorId);
    this.__stashActorCache = stashActor ?? null;
    this.__recipesCache = await this.#loadRecipes(stashActor);
  }

  /** @override */
  _prepareContext(_options) {
    const stashActor = this.__stashActorCache ?? null;
    const recipes = this.__recipesCache ?? [];
    const activeRecipe = recipes.find((recipe) => recipe.id === this._activeRecipeId);

    return {
      stashActorName: stashActor?.name || 'Kein Lager konfiguriert',
      recipes,
      activeRecipe,
      activeRecipeId: this._activeRecipeId
    };
  }

  async #loadRecipes(stashActor) {
    let items = [];
    if (stashActor) {
      items = stashActor.items
        .filter((item) => item.type === 'recipe' && item.system.subtype === 'Alchimie')
        .map((item) => item.toObject());
    }

    return items.map((recipe) => {
      const ingredients = this.#processIngredients(recipe, stashActor);
      const canBrew = ingredients.every((ingredient) => ingredient.hasEnough);
      return {
        ...recipe,
        ingredients,
        canBrew
      };
    });
  }

  #processIngredients(recipe, stashActor) {
    if (!Array.isArray(recipe?.system?.ingredients)) return [];

    return recipe.system.ingredients.map((ingredient) => {
      const stashItem = stashActor?.items.find((item) => item.name === ingredient.name);
      const currentQty = Number(stashItem?.system?.quantity ?? 0) || 0;
      const neededQty = Number(ingredient.quantity ?? 0) || 0;
      return {
        name: ingredient.name,
        neededQty,
        currentQty,
        hasEnough: currentQty >= neededQty
      };
    });
  }

  static async onSelectRecipe(_event, target) {
    this._activeRecipeId = target.dataset.recipeId;
    this.render({ force: true });
  }

  static async onBrewRecipe(_event, target) {
    const { core, dsa5 } = getJanusCore();
    const stashActorId = core.config.get('stashActorId');
    const stashActor = game.actors.get(stashActorId);
    const brewer = _resolveBrewerActor();
    const modifier = _parseBrewModifier(target);

    const recipes = await this.#loadRecipes(stashActor);
    const activeRecipe = recipes.find((recipe) => recipe.id === this._activeRecipeId);

    if (!activeRecipe || !activeRecipe.canBrew) {
      ui.notifications.warn('Zutaten reichen nicht aus oder kein Rezept gewählt.');
      return;
    }

    if (!stashActor) {
      ui.notifications.warn('Kein Materiallager konfiguriert.');
      return;
    }

    if (!brewer) {
      ui.notifications.warn('Kein Brauender verfügbar. Wähle einen Token oder hinterlege einen Charakter.');
      return;
    }

    if (typeof dsa5?.rollSkill !== 'function') {
      ui.notifications.warn('DSA5-Roll-Bridge ist nicht verfügbar.');
      return;
    }

    ui.notifications.info(`Brauprozess für ${activeRecipe.name} gestartet...`);

    let brewRoll;
    try {
      brewRoll = await dsa5.rollSkill(brewer, 'Alchimie', {
        modifier,
        silent: true,
        dsa5: { fastForward: true, dialog: false }
      });
    } catch (err) {
      ui.notifications.warn(err?.message ?? 'Alchimie-Probe fehlgeschlagen.');
      return;
    }

    if (!brewRoll?.success) {
      ui.notifications.warn(`${brewer.name} misslingt der Brauvorgang. Zutaten wurden nicht verbraucht.`);
      return;
    }

    const updates = [];
    for (const ingredient of activeRecipe.ingredients) {
      const item = stashActor.items.find((entry) => entry.name === ingredient.name);
      if (!item) continue;
      updates.push({
        _id: item.id,
        'system.quantity': Math.max(0, Number(item.system?.quantity ?? 0) - Number(ingredient.neededQty ?? 0))
      });
    }
    if (updates.length) {
      await stashActor.updateEmbeddedDocuments('Item', updates);
    }

    const createdResult = await _createBrewResult(stashActor, activeRecipe);
    const qs = Number(brewRoll?.quality ?? 0) || 0;
    ui.notifications.info(`${activeRecipe.name} erfolgreich hergestellt${qs > 0 ? ` (QS ${qs})` : ''}!`);
    if (!createdResult) {
      ui.notifications.warn('Brauergebnis konnte nicht automatisch ins Lager geschrieben werden.');
    }

    this.render({ force: true });
  }

  static showSingleton() {
    if (this._instance) {
      this._instance.render({ force: true });
      this._instance.bringToFront();
      return this._instance;
    }
    this._instance = new this();
    this._instance.render({ force: true });
    return this._instance;
  }
}

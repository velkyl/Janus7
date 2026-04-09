import { JanusBaseApp } from '../core/base-app.js';
import { getJanusCore } from '../../core/index.js';

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
      template: 'modules/Janus7/templates/extensions/labor-interface/labor-app.hbs'
    }
  };

  constructor(options = {}) {
    super(options);
    this._activeRecipeId = null;
  }

  /** @override */
  async _prepareContext(options) {
    const { core } = getJanusCore();
    const stashActorId = core.config.get('stashActorId');
    const stashActor = game.actors.get(stashActorId);
    
    // Get recipes from stash and reachable compendiums
    const recipes = await this.#loadRecipes(stashActor);
    const activeRecipe = recipes.find(r => r.id === this._activeRecipeId);

    return {
      stashActorName: stashActor?.name || 'Kein Lager konfiguriert',
      recipes,
      activeRecipe,
      activeRecipeId: this._activeRecipeId
    };
  }

  async #loadRecipes(stashActor) {
    // Collect all items of type recipe (Alchimie) the party has
    let items = [];
    if (stashActor) {
        items = stashActor.items.filter(i => i.type === "recipe" && i.system.subtype === "Alchimie").map(i => i.toObject());
    }

    // Process ingredients matching with stash
    return items.map(recipe => {
        const ingredients = this.#processIngredients(recipe, stashActor);
        const canBrew = ingredients.every(ing => ing.hasEnough);
        return {
            ...recipe,
            ingredients,
            canBrew
        };
    });
  }

  #processIngredients(recipe, stashActor) {
    if (!recipe.system.ingredients) return [];
    
    // This depends on how DSA5 stores ingredients. Usually an array of objects.
    return recipe.system.ingredients.map(ing => {
        const stashItem = stashActor?.items.find(i => i.name === ing.name);
        const currentQty = stashItem?.system?.quantity ?? 0;
        return {
            name: ing.name,
            neededQty: ing.quantity,
            currentQty,
            hasEnough: currentQty >= ing.quantity
        };
    });
  }

  static async onSelectRecipe(event, target) {
    this._activeRecipeId = target.dataset.recipeId;
    this.render();
  }

  static async onBrewRecipe(event, target) {
    const { core, dsa5 } = getJanusCore();
    const stashActorId = core.config.get('stashActorId');
    const stashActor = game.actors.get(stashActorId);
    
    const recipes = await this.#loadRecipes(stashActor);
    const activeRecipe = recipes.find(r => r.id === this._activeRecipeId);
    
    if (!activeRecipe || !activeRecipe.canBrew) {
        ui.notifications.warn("Zutaten reichen nicht aus oder kein Rezept gewählt.");
        return;
    }

    // 1. Roll Skill via DSA5 API
    ui.notifications.info(`Brauprozess für ${activeRecipe.name} gestartet...`);
    
    // Simplified Simulation for now
    const success = true; 
    
    if (success) {
        // 2. Consume items from Stash
        const updates = [];
        for (const ing of activeRecipe.ingredients) {
            const item = stashActor.items.find(i => i.name === ing.name);
            updates.push({
                _id: item.id,
                "system.quantity": item.system.quantity - ing.neededQty
            });
        }
        await stashActor.updateEmbeddedDocuments("Item", updates);
        
        // 3. Create result product
        // Note: result item name usually in recipe.system.result
        ui.notifications.info(`${activeRecipe.name} erfolgreich hergestellt!`);
    }
    
    this.render();
  }

  static showSingleton() {
    if (this._instance) {
      this._instance.render({ force: true });
      this._instance.bringToFront();
      return this._instance;
    }
    this._instance = new this();
    this._instance.render(true);
    return this._instance;
  }
}

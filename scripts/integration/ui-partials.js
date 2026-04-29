/**
 * @file scripts/integration/ui-partials.js
 * @module janus7/ui
 * @phase 6
 *
 * Registers shell views and panels as Handlebars partials to support
 * declarative rendering in JanusShellApp.
 */
/* global Handlebars */

const getTemplate = foundry?.applications?.handlebars?.getTemplate;

const PARTIALS = [
  // Views
  'templates/shell/views/academy.hbs',
  'templates/shell/views/chronicleBrowser.hbs',
  'templates/shell/views/director.hbs',
  'templates/shell/views/director_ai.hbs',
  'templates/shell/views/people.hbs',
  'templates/shell/views/places.hbs',
  'templates/shell/views/schedule.hbs',
  'templates/shell/views/sessionPrep.hbs',
  'templates/shell/views/system.hbs',
  'templates/shell/views/tools.hbs',
  'templates/shell/views/workbench.hbs',
  
  // Panels
  'templates/shell/panels/default-panel.hbs',
  'templates/shell/panels/layout-manager.hbs',

  // Parts
  'templates/shell/parts/modular-view.hbs',
  'templates/shell/parts/modules/runbook.hbs',
  'templates/shell/parts/modules/workflow-events.hbs',
  'templates/shell/parts/modules/status-monitor.hbs',
  'templates/shell/parts/modules/regional-fauna.hbs',
  'templates/shell/parts/modules/slot-builder.hbs'
];

/**
 * Registers all specified templates as Handlebars partials.
 * Uses the full module path as the partial name for uniqueness.
 */
export async function registerShellPartials() {
  const MODULE_ID = 'Janus7';
  if (typeof getTemplate !== 'function') {
    throw new Error('[JANUS7] foundry.applications.handlebars.getTemplate ist nicht verfügbar.');
  }
  const promises = PARTIALS.map(async (relative) => {
    const path = `modules/${MODULE_ID}/${relative}`;
    try {
      const template = await getTemplate(path);
      Handlebars.registerPartial(path, template);
    } catch (err) {
      console.warn(`[JANUS7] Failed to register partial: ${path}`, err);
    }
  });
  
  await Promise.all(promises);
  console.log(`[JANUS7] Registered ${PARTIALS.length} UI partials for declarative rendering.`);
}

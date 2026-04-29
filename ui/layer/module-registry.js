/**
 * @file ui/layer/module-registry.js
 * @module janus7/ui/modules
 * 
 * Central registry for all available UI modules (cards) in the Janus7 Shell.
 * This allows modules to be assigned to multiple views dynamically.
 */

const MODULE_DEFINITIONS = new Map();

/**
 * Registers a UI module (card) definition.
 * @param {Object} definition - The module definition.
 * @param {string} definition.id - Unique ID for the module.
 * @param {string} definition.title - Display title.
 * @param {string} definition.icon - FontAwesome icon class.
 * @param {string} [definition.description] - Short description.
 * @param {string} [definition.type] - Special module type (runbook, slot-builder, etc).
 * @param {Function} [definition.build] - Build function to fetch dynamic data for this specific card.
 */
export function registerModule(definition) {
  if (!definition.id) throw new Error("[JANUS7] Module requires an ID.");
  MODULE_DEFINITIONS.set(definition.id, {
    description: '',
    type: 'default',
    isWide: false,
    ...definition
  });
}

/**
 * Gets a module definition by ID.
 */
export function getModule(id) {
  return MODULE_DEFINITIONS.get(id);
}

/**
 * Returns all registered modules.
 */
export function getAllModules() {
  return [...MODULE_DEFINITIONS.values()];
}

// --- Pre-defined core modules ---

// Director / Core
registerModule({
  id: 'time-control',
  title: 'Zeitkontrolle',
  icon: 'fas fa-clock',
  description: 'Direkte Zeitsteuerung über Director/Commands.'
});

registerModule({
  id: 'runtime',
  title: 'Director Runtime',
  icon: 'fas fa-compass-drafting',
  description: 'Workflow, Runbook und Betriebsmodi.'
});

registerModule({
  id: 'atmosphere',
  title: 'Atmosphäre & Graph',
  icon: 'fas fa-wave-square',
  description: 'Laufende Stimmungs- und Graph-Indikatoren.'
});

registerModule({
  id: 'runbook',
  title: 'Runbook',
  icon: 'fas fa-route',
  description: 'Workflow & Tagesablauf',
  type: 'runbook'
});

registerModule({
  id: 'workflow-events',
  title: 'Letzte Ereignisse',
  icon: 'fas fa-clipboard-list',
  description: 'Aus dem Workflow Runbook',
  type: 'workflow-events'
});

registerModule({
  id: 'status-monitor',
  title: 'Status Monitor',
  icon: 'fas fa-heart-pulse',
  description: 'Echtzeit-Überwachung der Studenten & Helden',
  type: 'status-monitor',
  isWide: true
});

registerModule({
  id: 'creatures',
  title: 'Regionale Fauna & Flora',
  icon: 'fas fa-dragon',
  description: 'Potenzielle Begegnungen',
  type: 'regional-fauna',
  isWide: true
});

registerModule({
  id: 'calendar-events',
  title: 'Regionale Ereignisse',
  icon: 'fas fa-calendar-alt',
  description: 'Feste & Almanach-Daten',
  type: 'calendar-events',
  isWide: true
});

// Academy
registerModule({
  id: 'academy-profile',
  title: 'Profil & Vertrag',
  icon: 'fas fa-school-flag',
  description: 'Aktives Akademieprofil, Vertragsstatus und Referenzrolle.'
});

registerModule({
  id: 'academy-week',
  title: 'Akademie-Woche',
  icon: 'fas fa-calendar-days',
  description: 'Heutige Eintraege, aktuelle Lehrtermine und Raster-Einstieg.'
});

registerModule({
  id: 'academy-data',
  title: 'Akademie-Daten',
  icon: 'fas fa-book',
  description: 'Schnellzugriff auf Datendomaenen, Hooks und soziale Struktur.'
});

registerModule({
  id: 'academy-hooks',
  title: 'Naechste Hooks',
  icon: 'fas fa-people-group',
  description: 'Direkte Hook-Sicht fuer Unterricht, Quests und soziale Dynamik.'
});

// Schedule
registerModule({
  id: 'slot-builder',
  title: 'Slot-Builder',
  icon: 'fas fa-calendar-plus',
  description: 'Vorbereitung der nächsten Unterrichtsstunde.',
  type: 'slot-builder',
  isWide: true
});

registerModule({
  id: 'daily-plan',
  title: 'Heutiger Plan',
  icon: 'fas fa-calendar-days',
  description: 'Übersicht über den aktuellen Tag.'
});

// People
registerModule({
  id: 'teachers',
  title: 'Lehrkräfte',
  icon: 'fas fa-chalkboard-teacher',
  description: 'Dozenten und Meister.',
  type: 'people-roster'
});

registerModule({
  id: 'students',
  title: 'Schüler',
  icon: 'fas fa-user-graduate',
  description: 'Eingeschriebene Studenten.',
  type: 'people-roster'
});

registerModule({
  id: 'npcs',
  title: 'Weitere NSCs',
  icon: 'fas fa-users',
  description: 'Personal und Kontakte.',
  type: 'people-roster'
});

registerModule({
  id: 'companions',
  title: 'Gefährten',
  icon: 'fas fa-paw',
  description: 'Begleiter aus Modulen.',
  type: 'regional-fauna'
});

registerModule({
  id: 'alumni',
  title: 'Alumni-Tracking',
  icon: 'fas fa-user-graduate',
  description: 'Ehemalige und Wiedereinsatz.',
  type: 'alumni-manager',
  isWide: true
});

// Places
registerModule({
  id: 'locations-list',
  title: 'Ortschaften',
  icon: 'fas fa-map-location-dot',
  description: 'Zugeordnete Orte.',
  type: 'location-list'
});

registerModule({
  id: 'active-location',
  title: 'Aktueller Fokus',
  icon: 'fas fa-location-crosshairs',
  description: 'Aktivität am Standort.'
});

// System
registerModule({
  id: 'system-status',
  title: 'System Status',
  icon: 'fas fa-microchip',
  description: 'JANUS7 Kernmodule.'
});

registerModule({
  id: 'sync-monitor',
  title: 'Sync & Database',
  icon: 'fas fa-database',
  description: 'SQLite Synchronisierung.',
  type: 'status-monitor'
});

// Workbench
registerModule({
  id: 'section-academy',
  title: 'Academy Apps',
  icon: 'fas fa-school',
  description: 'Apps für die Akademie-Verwaltung.',
  type: 'app-launcher'
});

registerModule({
  id: 'section-livingWorld',
  title: 'Living World Apps',
  icon: 'fas fa-globe',
  description: 'Apps für die lebendige Welt.',
  type: 'app-launcher'
});

registerModule({
  id: 'section-admin',
  title: 'Admin Apps',
  icon: 'fas fa-crown',
  description: 'Administrative Werkzeuge.',
  type: 'app-launcher'
});

registerModule({
  id: 'section-maintenance',
  title: 'System Apps',
  icon: 'fas fa-gears',
  description: 'Systemwartung und Diagnose.',
  type: 'app-launcher'
});

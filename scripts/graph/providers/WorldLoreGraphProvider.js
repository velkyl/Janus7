import JanusAssetResolver from '../../../core/services/asset-resolver.js';
import { GRAPH_EDGE_TYPES, GRAPH_NODE_TYPES, GRAPH_SOURCES } from '../constants.js';

async function loadJson(path) {
  const response = await fetch(JanusAssetResolver.data(path), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
  return response.json();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export class WorldLoreGraphProvider {
  constructor({ logger } = {}) {
    this.logger = logger;
  }

  getName() {
    return 'WorldLoreGraphProvider';
  }

  async collect() {
    const nodes = [];
    const edges = [];

    let regions;
    let cities;
    let academies;
    let chronicle;
    let masterinfoHooks;

    try {
      [regions, cities, academies, chronicle, masterinfoHooks] = await Promise.all([
        loadJson('world_lore/regions.json'),
        loadJson('world_lore/cities.json'),
        loadJson('world_lore/academies.json'),
        loadJson('events/bote_chronicle.json'),
        loadJson('events/bote_masterinfo_hooks.json'),
      ]);
    } catch (err) {
      this.logger?.warn?.('[JANUS7] WorldLoreGraphProvider: load failed', { message: err?.message });
      return { nodes, edges };
    }

    for (const region of asArray(regions?.regions)) {
      if (!region?.id) continue;
      nodes.push({
        id: `region:${region.id}`,
        type: GRAPH_NODE_TYPES.REGION,
        label: region.name ?? region.id,
        source: GRAPH_SOURCES.WORLD_LORE,
        meta: {
          capital: region.capital ?? null,
          government: region.government ?? null,
          climate: region.climate ?? null,
          religion: region.religion ?? null,
          notableLocations: asArray(region.notable_locations),
        },
      });
    }

    for (const city of asArray(cities?.cities)) {
      if (!city?.id) continue;
      nodes.push({
        id: `city:${city.id}`,
        type: GRAPH_NODE_TYPES.CITY,
        label: city.name ?? city.id,
        source: GRAPH_SOURCES.WORLD_LORE,
        meta: {
          regionId: city.region ?? null,
          population: city.population ?? null,
          academies: asArray(city.academies),
          notableFeatures: asArray(city.notable_features),
        },
      });
      if (city.region) {
        edges.push({
          from: `city:${city.id}`,
          to: `region:${city.region}`,
          type: GRAPH_EDGE_TYPES.PART_OF,
          weight: 1,
          meta: {},
        });
      }
    }

    for (const academy of asArray(academies?.academies)) {
      if (!academy?.id) continue;
      nodes.push({
        id: `academy:${academy.id}`,
        type: GRAPH_NODE_TYPES.ACADEMY,
        label: academy.name ?? academy.id,
        source: GRAPH_SOURCES.WORLD_LORE,
        meta: {
          cityId: academy.cityId ?? null,
          regionId: academy.regionId ?? null,
          profileId: academy.profileId ?? null,
          guild: academy.guild ?? null,
          focus: asArray(academy.focus),
          hooks: asArray(academy.janusHooks),
        },
      });
      if (academy.cityId) {
        edges.push({
          from: `academy:${academy.id}`,
          to: `city:${academy.cityId}`,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 1,
          meta: {},
        });
      }
      if (academy.regionId) {
        edges.push({
          from: `academy:${academy.id}`,
          to: `region:${academy.regionId}`,
          type: GRAPH_EDGE_TYPES.PART_OF,
          weight: 0.8,
          meta: {},
        });
      }
    }

    for (const entry of asArray(chronicle?.chronicle)) {
      if (!entry?.id) continue;
      nodes.push({
        id: `chronicle:${entry.id}`,
        type: GRAPH_NODE_TYPES.CHRONICLE,
        label: entry.label ?? entry.id,
        source: GRAPH_SOURCES.WORLD_LORE,
        meta: {
          date: entry.date ?? null,
          location: entry.location ?? null,
          tags: asArray(entry.tags),
        },
      });

      const rawLocation = String(entry.location ?? '').trim();
      if (!rawLocation) continue;
      const locationKey = rawLocation.toLowerCase();

      const city = asArray(cities?.cities).find((row) => String(row?.name ?? '').trim().toLowerCase() === locationKey);
      if (city?.id) {
        edges.push({
          from: `chronicle:${entry.id}`,
          to: `city:${city.id}`,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 0.9,
          meta: {},
        });
        continue;
      }

      const region = asArray(regions?.regions).find((row) => String(row?.name ?? '').trim().toLowerCase() === locationKey);
      if (region?.id) {
        edges.push({
          from: `chronicle:${entry.id}`,
          to: `region:${region.id}`,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 0.7,
          meta: {},
        });
      }
    }

    for (const hook of asArray(masterinfoHooks?.hooks)) {
      if (!hook?.id) continue;
      nodes.push({
        id: `chronicle:${hook.id}`,
        type: GRAPH_NODE_TYPES.CHRONICLE,
        label: hook.title ?? hook.id,
        source: GRAPH_SOURCES.WORLD_LORE,
        meta: {
          date: hook.approximateDate ?? null,
          location: hook.location ?? null,
          tags: asArray(hook.tags),
          issue: hook.issue ?? null,
          bfYear: hook.bfYear ?? null,
          sourceType: 'meisterinfo',
        },
      });

      const rawLocation = String(hook.location ?? '').trim();
      if (!rawLocation) continue;
      const locationKey = rawLocation.toLowerCase();

      const city = asArray(cities?.cities).find((row) => String(row?.name ?? '').trim().toLowerCase() === locationKey);
      if (city?.id) {
        edges.push({
          from: `chronicle:${hook.id}`,
          to: `city:${city.id}`,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 0.85,
          meta: {},
        });
        continue;
      }

      const region = asArray(regions?.regions).find((row) => String(row?.name ?? '').trim().toLowerCase() === locationKey);
      if (region?.id) {
        edges.push({
          from: `chronicle:${hook.id}`,
          to: `region:${region.id}`,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 0.65,
          meta: {},
        });
      }
    }

    return { nodes, edges };
  }
}

export default WorldLoreGraphProvider;

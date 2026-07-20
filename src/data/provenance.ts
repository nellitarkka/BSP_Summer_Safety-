import type { DatasetSource } from '@/types';

// Data provenance & crime-data ethics registry (NFR-14). Every dataset the
// prototype uses (or is motivated by) is documented here with its source,
// license/terms, and limitations. This is the single place the app states,
// transparently, what data it relies on — and, crucially, that official crime
// statistics are used as BACKGROUND/MOTIVATION ONLY, never as street-level risk
// data, a danger score, or a route input.

export const DATASET_SOURCES: DatasetSource[] = [
  {
    id: 'osm-lu',
    name: 'OpenStreetMap — Luxembourg extract (GeoFabrik / data.public.lu)',
    source_url: 'https://download.geofabrik.de/europe/luxembourg.html',
    license: 'Open Database License (ODbL) 1.0 — © OpenStreetMap contributors',
    limitations:
      'Community-maintained; coverage and tag completeness vary. Lighting (lit=*) ' +
      'and some POIs are unmapped in places — such features are reported as ' +
      '"not enough data" rather than guessed.',
    role: 'base_map',
    background_only: false,
  },
  {
    id: 'gtfs-lu',
    name: 'Luxembourg public transport schedule (GTFS / NeTEx)',
    source_url: 'https://data.public.lu/en/datasets/gtfs-datasets/',
    license: 'Open data — per data.public.lu / mobiliteit.lu terms',
    limitations:
      'Static schedule; stop positions used for "close to transit" only. Real-time ' +
      '(GTFS-RT) is optional and not part of the core indicators.',
    role: 'transit',
    background_only: false,
  },
  {
    id: 'incident-context-demo',
    name: 'Manually collected public incident reports (research/demo only)',
    source_url: 'https://police.public.lu/en.html',
    license: 'Public press/police notices — cited individually; demo use only',
    limitations:
      'OPTIONAL demo layer shown as "recent public incident nearby" with date, ' +
      'source and explicit uncertainty. Isolated from the engine — it does NOT ' +
      'feed the route safety indicators (FR-65).',
    role: 'incident_context_demo',
    background_only: false,
  },
  {
    id: 'crime-stats-background',
    name: 'Official crime statistics (Police Grand-Ducale, STATEC / LUSTAT)',
    source_url: 'https://statistiques.public.lu/en.html',
    license: 'Official statistics — aggregate figures, cited as background',
    limitations:
      'BACKGROUND / MOTIVATION ONLY. Aggregate and national/regional. NEVER used ' +
      'as street-level risk data, a danger score, or to label any street or area, ' +
      'and never sent to the route engine or AI (NFR-14).',
    role: 'background_context',
    background_only: true,
  },
];

// Sources that may legitimately inform route indicators — everything that is
// NOT background-only. Enforces the NFR-14 boundary in code: a background/
// crime-stats source can never appear here, so it can never feed an indicator.
export function sourcesFeedingIndicators(): DatasetSource[] {
  return DATASET_SOURCES.filter((s) => !s.background_only);
}

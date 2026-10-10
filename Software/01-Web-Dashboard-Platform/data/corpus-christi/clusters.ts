/**
 * Proposed Corpus Christi, TX deployment clusters.
 *
 * IMPORTANT: these are PROPOSED demonstration areas with approximate,
 * publicly-known neighborhood-level coordinates — not actual installations,
 * confirmed customer sites, or precise addresses. Label accordingly in the UI.
 */

export interface ClusterSeed {
  id: string;
  name: string;
  approximateLatitude: number;
  approximateLongitude: number;
}

export const CORPUS_CHRISTI_CLUSTERS: ClusterSeed[] = [
  { id: "cluster-tamucc", name: "TAMU-CC Area", approximateLatitude: 27.7089, approximateLongitude: -97.3192 },
  { id: "cluster-north-beach", name: "North Beach", approximateLatitude: 27.8142, approximateLongitude: -97.3928 },
  { id: "cluster-downtown", name: "Downtown Corpus Christi", approximateLatitude: 27.7676, approximateLongitude: -97.3964 },
  { id: "cluster-flour-bluff", name: "Flour Bluff", approximateLatitude: 27.6478, approximateLongitude: -97.2881 },
  { id: "cluster-calallen", name: "Calallen", approximateLatitude: 27.8459, approximateLongitude: -97.5633 },
];

export const AWGS_PER_CLUSTER = 4;
export const TOTAL_AWGS = CORPUS_CHRISTI_CLUSTERS.length * AWGS_PER_CLUSTER; // 20
export const RATED_GALLONS_PER_DAY_PER_AWG = 50;
export const FLEET_RATED_GALLONS_PER_DAY = TOTAL_AWGS * RATED_GALLONS_PER_DAY_PER_AWG; // 1,000

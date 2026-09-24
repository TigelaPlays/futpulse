/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiFootball from "../apiFootball.js";
import type * as assets from "../assets.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as footballData from "../footballData.js";
import type * as ingestion from "../ingestion.js";
import type * as leagues from "../leagues.js";
import type * as matches from "../matches.js";
import type * as seed from "../seed.js";
import type * as seedChampions from "../seedChampions.js";
import type * as seedNationsLeague from "../seedNationsLeague.js";
import type * as seedStandings from "../seedStandings.js";
import type * as simulation from "../simulation.js";
import type * as sofascore from "../sofascore.js";
import type * as standings from "../standings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiFootball: typeof apiFootball;
  assets: typeof assets;
  cleanup: typeof cleanup;
  crons: typeof crons;
  footballData: typeof footballData;
  ingestion: typeof ingestion;
  leagues: typeof leagues;
  matches: typeof matches;
  seed: typeof seed;
  seedChampions: typeof seedChampions;
  seedNationsLeague: typeof seedNationsLeague;
  seedStandings: typeof seedStandings;
  simulation: typeof simulation;
  sofascore: typeof sofascore;
  standings: typeof standings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

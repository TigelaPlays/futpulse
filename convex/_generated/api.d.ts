/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assets from "../assets.js";
import type * as crons from "../crons.js";
import type * as leagues from "../leagues.js";
import type * as matches from "../matches.js";
import type * as seed from "../seed.js";
import type * as seedNations from "../seedNations.js";
import type * as seedNationsLeagueA from "../seedNationsLeagueA.js";
import type * as seedNationsLeagueAll from "../seedNationsLeagueAll.js";
import type * as seedNationsLeagueBCD from "../seedNationsLeagueBCD.js";
import type * as stadiumAliases from "../stadiumAliases.js";
import type * as standings from "../standings.js";
import type * as syncSofascore from "../syncSofascore.js";
import type * as teamAliases from "../teamAliases.js";
import type * as testScore from "../testScore.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assets: typeof assets;
  crons: typeof crons;
  leagues: typeof leagues;
  matches: typeof matches;
  seed: typeof seed;
  seedNations: typeof seedNations;
  seedNationsLeagueA: typeof seedNationsLeagueA;
  seedNationsLeagueAll: typeof seedNationsLeagueAll;
  seedNationsLeagueBCD: typeof seedNationsLeagueBCD;
  stadiumAliases: typeof stadiumAliases;
  standings: typeof standings;
  syncSofascore: typeof syncSofascore;
  teamAliases: typeof teamAliases;
  testScore: typeof testScore;
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

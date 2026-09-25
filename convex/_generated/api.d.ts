/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bindExternalIds from "../bindExternalIds.js";
import type * as crons from "../crons.js";
import type * as leagues from "../leagues.js";
import type * as matches from "../matches.js";
import type * as seedNationsLeagueA from "../seedNationsLeagueA.js";
import type * as seedNationsLeagueAll from "../seedNationsLeagueAll.js";
import type * as seedNationsLeagueBCD from "../seedNationsLeagueBCD.js";
import type * as standings from "../standings.js";
import type * as syncLiveScore from "../syncLiveScore.js";
import type * as syncSofascore from "../syncSofascore.js";
import type * as testScore from "../testScore.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bindExternalIds: typeof bindExternalIds;
  crons: typeof crons;
  leagues: typeof leagues;
  matches: typeof matches;
  seedNationsLeagueA: typeof seedNationsLeagueA;
  seedNationsLeagueAll: typeof seedNationsLeagueAll;
  seedNationsLeagueBCD: typeof seedNationsLeagueBCD;
  standings: typeof standings;
  syncLiveScore: typeof syncLiveScore;
  syncSofascore: typeof syncSofascore;
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

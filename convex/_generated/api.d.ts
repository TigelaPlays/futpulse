/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as leagues from "../leagues.js";
import type * as matches from "../matches.js";
import type * as seedNationsLeagueA from "../seedNationsLeagueA.js";
import type * as seedNationsLeagueAll from "../seedNationsLeagueAll.js";
import type * as standings from "../standings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  leagues: typeof leagues;
  matches: typeof matches;
  seedNationsLeagueA: typeof seedNationsLeagueA;
  seedNationsLeagueAll: typeof seedNationsLeagueAll;
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

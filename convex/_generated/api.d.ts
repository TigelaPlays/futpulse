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
import type * as ingestion from "../ingestion.js";
import type * as leagues from "../leagues.js";
import type * as matches from "../matches.js";
import type * as seed from "../seed.js";
import type * as seedChampions from "../seedChampions.js";
import type * as sofascore from "../sofascore.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assets: typeof assets;
  crons: typeof crons;
  ingestion: typeof ingestion;
  leagues: typeof leagues;
  matches: typeof matches;
  seed: typeof seed;
  seedChampions: typeof seedChampions;
  sofascore: typeof sofascore;
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

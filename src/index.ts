/**
 * express-numflow
 *
 * Feature-First architecture plugin for Express
 * Bring Numflow's Convention over Configuration to your Express apps
 *
 * @packageDocumentation
 */

export { createFeatureRouter, CreateFeatureRouterOptions } from './create-feature-router'

// Re-export Feature API for users to create features
export { feature, Feature } from './feature/feature'

// Re-export retry mechanism
export { retry } from './feature/retry'
export type { RetrySignal } from './feature/retry'

// Re-export Feature types for convenience
export type {
  FeatureConfig,
  Context,
  StepFunction,
  AsyncTaskFunction,
  FeatureHandler,
  FeatureError,
} from './feature/types'
export type { ScannedFeature, ScanOptions } from './feature/feature-scanner'

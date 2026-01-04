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
export { feature, Feature } from './http/feature'

// Re-export retry mechanism
export { retry } from './http/retry'
export type { RetrySignal } from './http/retry'

// Re-export Feature types for convenience
export type {
  FeatureConfig,
  Context,
  StepFunction,
  AsyncTaskFunction,
  FeatureHandler,
} from './http/types'

// Re-export FeatureError class (not type)
export { FeatureError } from './http/types'
export type { ScannedFeature, ScanOptions } from './http/feature-scanner'

// ========== WebSocket Support ==========
export { createWsHandler } from './ws/create-ws-handler'

// Re-export WebSocket types
export type {
  WsHandler,
  WsContext,
  WsTrigger,
  WsResponder,
  WsStepFunction,
  WsFeatureConfig,
  CreateWsHandlerOptions,
  ScannedWsFeature,
} from './ws/types'

// Re-export WebSocket utilities
export { ConnectionContextManager } from './ws/context-manager'
export { WsConventionResolver } from './ws/convention'
export { scanWsFeatures, WsFeatureScanner } from './ws/scanner'

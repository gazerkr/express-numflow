declare module 'express-numflow' {
  import { Router } from 'express'

  export interface CreateFeatureRouterOptions {
    debug?: boolean
  }

  export function createFeatureRouter(
    featuresDir: string,
    options?: CreateFeatureRouterOptions
  ): Promise<Router>

  export interface FeatureConfig {
    contextInitializer?: (ctx: any, req: any, res: any) => void | Promise<void>
    onError?: (error: Error, ctx: any, req: any, res: any) => void | Promise<void>
  }

  export function feature(config?: FeatureConfig): FeatureConfig
}

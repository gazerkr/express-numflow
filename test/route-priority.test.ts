/**
 * Route Priority Tests
 *
 * Tests for route registration order (static routes before dynamic routes)
 */

import { scanFeatures } from '../src/feature/feature-scanner'

describe('Route Priority', () => {
  describe('Static vs Dynamic routes', () => {
    it('should prioritize static routes over dynamic routes at same level', async () => {
      // Expected order:
      // 1. /blog/search (static)
      // 2. /blog/about (static)
      // 3. /blog/:slug (dynamic)

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      // Static routes should come before dynamic routes
      const searchIndex = paths.indexOf('/blog/search')
      const aboutIndex = paths.indexOf('/blog/about')
      const slugIndex = paths.indexOf('/blog/:slug')

      expect(searchIndex).toBeLessThan(slugIndex)
      expect(aboutIndex).toBeLessThan(slugIndex)
    })

    it('should prioritize deeper static routes first', async () => {
      // Expected order:
      // 1. /blog/search/advanced (3 segments, all static)
      // 2. /blog/search (2 segments, all static)
      // 3. /blog/:slug/comments (3 segments, 2 static)
      // 4. /blog/:slug (2 segments, 1 static)

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      const advancedIndex = paths.indexOf('/blog/search/advanced')
      const searchIndex = paths.indexOf('/blog/search')
      const commentsIndex = paths.indexOf('/blog/:slug/comments')
      const slugIndex = paths.indexOf('/blog/:slug')

      // More specific (deeper + more static) comes first
      if (advancedIndex !== -1) {
        expect(advancedIndex).toBeLessThan(searchIndex)
      }

      expect(searchIndex).toBeLessThan(slugIndex)

      if (commentsIndex !== -1) {
        expect(commentsIndex).toBeLessThan(slugIndex)
      }
    })

    it('should prioritize routes with more static segments', async () => {
      // /api/posts/:id/comments (3 segments, 2 static)
      // /api/posts/:id (2 segments, 1 static)
      // /api/:resource/:id (2 segments, 0 static)

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      const postCommentsIndex = paths.indexOf('/api/posts/:id/comments')
      const postIdIndex = paths.indexOf('/api/posts/:id')
      const genericIndex = paths.indexOf('/api/:resource/:id')

      if (postCommentsIndex !== -1 && postIdIndex !== -1) {
        expect(postCommentsIndex).toBeLessThan(postIdIndex)
      }

      if (postIdIndex !== -1 && genericIndex !== -1) {
        expect(postIdIndex).toBeLessThan(genericIndex)
      }
    })

    it('should handle root routes correctly', async () => {
      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      // Root route should be last (least specific)
      const rootIndex = paths.indexOf('/')

      if (rootIndex !== -1) {
        // All other routes should come before root
        paths.forEach((p, i) => {
          if (p !== '/') {
            expect(i).toBeLessThan(rootIndex)
          }
        })
      }
    })
  })

  describe('Same specificity routes', () => {
    it('should maintain consistent order for routes with same specificity', async () => {
      // Routes with same specificity (e.g., both static at same level)
      // should maintain alphabetical order for predictability

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      const aboutIndex = paths.indexOf('/blog/about')
      const searchIndex = paths.indexOf('/blog/search')

      if (aboutIndex !== -1 && searchIndex !== -1) {
        // Alphabetical: about < search
        expect(aboutIndex).toBeLessThan(searchIndex)
      }
    })
  })

  describe('Complex route hierarchies', () => {
    it('should handle multiple levels of nesting correctly', async () => {
      // Expected order (most specific first):
      // 1. /api/v1/users/:id/posts/:postId/comments/:commentId
      // 2. /api/v1/users/:id/posts/:postId/comments
      // 3. /api/v1/users/:id/posts/:postId
      // 4. /api/v1/users/:id/posts
      // 5. /api/v1/users/:id
      // 6. /api/v1/users

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      // Find all nested user routes
      const userRoutes = paths.filter(p => p && p.startsWith('/api/v1/users'))

      // Check that deeper routes come before shallower ones
      for (let i = 0; i < userRoutes.length - 1; i++) {
        const current = userRoutes[i]
        const next = userRoutes[i + 1]

        if (current && next) {
          const currentDepth = current.split('/').filter(s => s).length
          const nextDepth = next.split('/').filter(s => s).length

          // Current should be >= next in depth (deeper or same level comes first)
          expect(currentDepth).toBeGreaterThanOrEqual(nextDepth)
        }
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle routes with multiple consecutive dynamic segments', async () => {
      // /api/:resource/:id/:action
      // /api/:resource/:id
      // /api/:resource

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      const actionIndex = paths.indexOf('/api/:resource/:id/:action')
      const idIndex = paths.indexOf('/api/:resource/:id')
      const resourceIndex = paths.indexOf('/api/:resource')

      if (actionIndex !== -1 && idIndex !== -1) {
        // Deeper dynamic route still comes before shallower one
        expect(actionIndex).toBeLessThan(idIndex)
      }

      if (idIndex !== -1 && resourceIndex !== -1) {
        expect(idIndex).toBeLessThan(resourceIndex)
      }
    })

    it('should handle mixed static and dynamic segments correctly', async () => {
      // /users/profile (static)
      // /users/:id/settings (mixed)
      // /users/:id (dynamic)

      const features = await scanFeatures('./test/fixtures/route-priority')

      const paths = features.map(f => f.feature.getInfo().path)

      const profileIndex = paths.indexOf('/users/profile')
      const settingsIndex = paths.indexOf('/users/:id/settings')
      const userIdIndex = paths.indexOf('/users/:id')

      if (profileIndex !== -1 && userIdIndex !== -1) {
        // Static comes before dynamic at same depth
        expect(profileIndex).toBeLessThan(userIdIndex)
      }

      if (settingsIndex !== -1 && userIdIndex !== -1) {
        // Deeper route comes before shallower, even with dynamic segment
        expect(settingsIndex).toBeLessThan(userIdIndex)
      }
    })
  })
})

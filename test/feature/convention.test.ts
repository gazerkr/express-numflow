/**
 * Convention System Tests
 *
 * Tests for convention-over-configuration system
 */

import { ConventionResolver } from '../../src/feature/convention'

describe('Convention System', () => {
  describe('inferMethod()', () => {
    it('should infer GET from @get folder', () => {
      // Given: Path with @get
      const featurePath = '/features/users/@get'

      // When: Infer method
      const method = ConventionResolver.inferMethod(featurePath)

      // Then: Returns GET
      expect(method).toBe('GET')
    })

    it('should infer POST from @post folder', () => {
      const method = ConventionResolver.inferMethod('/features/users/@post')
      expect(method).toBe('POST')
    })

    it('should infer PUT from @put folder', () => {
      const method = ConventionResolver.inferMethod('/features/users/@put')
      expect(method).toBe('PUT')
    })

    it('should infer PATCH from @patch folder', () => {
      const method = ConventionResolver.inferMethod('/features/users/@patch')
      expect(method).toBe('PATCH')
    })

    it('should infer DELETE from @delete folder', () => {
      const method = ConventionResolver.inferMethod('/features/users/@delete')
      expect(method).toBe('DELETE')
    })

    it('should throw error if no @ prefix', () => {
      expect(() => {
        ConventionResolver.inferMethod('/features/users/get')
      }).toThrow('Feature folder must start with @')
    })

    it('should throw error for invalid method', () => {
      expect(() => {
        ConventionResolver.inferMethod('/features/users/@invalid')
      }).toThrow('Invalid HTTP method')
    })
  })

  describe('inferPath() - Space validation', () => {
    it('should throw error when folder name contains spaces', () => {
      // Given: Path with spaces
      const featuresRoot = '/features'
      const featurePath = '/features/my folder/@get'

      // When & Then: Throws error
      expect(() => {
        ConventionResolver.inferPath(featurePath, featuresRoot)
      }).toThrow('Folder names cannot contain spaces')
    })

    it('should throw error when nested folder contains spaces', () => {
      // Given: Nested path with spaces
      const featuresRoot = '/features'
      const featurePath = '/features/api/user profile/@get'

      // When & Then: Throws error
      expect(() => {
        ConventionResolver.inferPath(featurePath, featuresRoot)
      }).toThrow('Folder names cannot contain spaces')
    })

    it('should throw error when dynamic param contains spaces', () => {
      // Given: Dynamic param with spaces
      const featuresRoot = '/features'
      const featurePath = '/features/users/[user id]/@get'

      // When & Then: Throws error
      expect(() => {
        ConventionResolver.inferPath(featurePath, featuresRoot)
      }).toThrow('Folder names cannot contain spaces')
    })

    it('should work with hyphens instead of spaces', () => {
      // Given: Path with hyphens
      const featuresRoot = '/features'
      const featurePath = '/features/user-profile/@get'

      // When: Infer route
      const route = ConventionResolver.inferPath(featurePath, featuresRoot)

      // Then: Returns valid route
      expect(route).toBe('/user-profile')
    })

    it('should work with underscores instead of spaces', () => {
      // Given: Path with underscores
      const featuresRoot = '/features'
      const featurePath = '/features/user_profile/@get'

      // When: Infer route
      const route = ConventionResolver.inferPath(featurePath, featuresRoot)

      // Then: Returns valid route
      expect(route).toBe('/user_profile')
    })
  })

  describe('inferPath() - Basic functionality', () => {
    it('should infer route from simple path', () => {
      const route = ConventionResolver.inferPath('/features/users/@get', '/features')
      expect(route).toBe('/users')
    })

    it('should infer route from nested path', () => {
      const route = ConventionResolver.inferPath('/features/api/v1/users/@get', '/features')
      expect(route).toBe('/api/v1/users')
    })

    it('should convert [id] to :id for dynamic routes', () => {
      const route = ConventionResolver.inferPath('/features/users/[id]/@get', '/features')
      expect(route).toBe('/users/:id')
    })

    it('should handle multiple dynamic params', () => {
      const route = ConventionResolver.inferPath('/features/users/[userId]/posts/[postId]/@get', '/features')
      expect(route).toBe('/users/:userId/posts/:postId')
    })

    it('should return / for root feature', () => {
      const route = ConventionResolver.inferPath('/features/@get', '/features')
      expect(route).toBe('/')
    })

    it('should remove @method from path', () => {
      const route = ConventionResolver.inferPath('/features/api/orders/@post', '/features')
      expect(route).toBe('/api/orders')
    })
  })
})

/**
 * GenericExecutor Tests
 *
 * TDD: Tests for trigger-agnostic step execution engine
 *
 * Features:
 * - Sequential step execution
 * - Context sharing across steps
 * - Error handling and FeatureError wrapping
 * - ctx.__stop flow control
 * - isCompleted callback for early termination
 */

import { GenericExecutor, executeSteps } from '../../src/core/executor'
import { Context, StepInfo, FeatureError } from '../../src/core/types'

describe('GenericExecutor', () => {
  // Mock trigger and responder for testing
  const createMockTrigger = () => ({ event: 'test', data: { foo: 'bar' } })
  const createMockResponder = () => ({
    emit: jest.fn(),
    broadcast: jest.fn(),
  })

  describe('Basic Execution', () => {
    it('should execute all steps in order', async () => {
      const executionOrder: number[] = []

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-first.ts',
          path: '/steps/01-first.ts',
          fn: async (ctx) => {
            executionOrder.push(1)
            ctx.step1 = true
          },
        },
        {
          number: 2,
          name: '02-second.ts',
          path: '/steps/02-second.ts',
          fn: async (ctx) => {
            executionOrder.push(2)
            ctx.step2 = true
          },
        },
        {
          number: 3,
          name: '03-third.ts',
          path: '/steps/03-third.ts',
          fn: async (ctx) => {
            executionOrder.push(3)
            ctx.step3 = true
          },
        },
      ]

      const context: Context = {}
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await executor.execute()

      expect(executionOrder).toEqual([1, 2, 3])
      expect(context.step1).toBe(true)
      expect(context.step2).toBe(true)
      expect(context.step3).toBe(true)
    })

    it('should return context after execution', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-set-value.ts',
          path: '/steps/01-set-value.ts',
          fn: async (ctx) => {
            ctx.result = 'completed'
          },
        },
      ]

      const context: Context = { initial: true }
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      const result = await executor.execute()

      expect(result).toBe(context)
      expect(result.initial).toBe(true)
      expect(result.result).toBe('completed')
    })

    it('should handle empty steps array', async () => {
      const context: Context = { preserved: true }
      const executor = new GenericExecutor({
        steps: [],
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      const result = await executor.execute()

      expect(result).toBe(context)
      expect(result.preserved).toBe(true)
    })
  })

  describe('Context Sharing', () => {
    it('should share context across all steps', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-set.ts',
          path: '/steps/01-set.ts',
          fn: async (ctx) => {
            ctx.value = 10
          },
        },
        {
          number: 2,
          name: '02-double.ts',
          path: '/steps/02-double.ts',
          fn: async (ctx) => {
            ctx.value = ctx.value * 2
          },
        },
        {
          number: 3,
          name: '03-add.ts',
          path: '/steps/03-add.ts',
          fn: async (ctx) => {
            ctx.value = ctx.value + 5
          },
        },
      ]

      const context: Context = {}
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await executor.execute()

      // 10 * 2 + 5 = 25
      expect(context.value).toBe(25)
    })

    it('should preserve initial context values', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-append.ts',
          path: '/steps/01-append.ts',
          fn: async (ctx) => {
            ctx.items.push('added')
          },
        },
      ]

      const context: Context = { items: ['initial'] }
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await executor.execute()

      expect(context.items).toEqual(['initial', 'added'])
    })
  })

  describe('Step Function Arguments', () => {
    it('should pass trigger to step functions', async () => {
      let receivedTrigger: any

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-check-trigger.ts',
          path: '/steps/01-check-trigger.ts',
          fn: async (_ctx, trigger) => {
            receivedTrigger = trigger
          },
        },
      ]

      const mockTrigger = { event: 'custom', data: { message: 'hello' } }
      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: mockTrigger,
        responder: createMockResponder(),
      })

      await executor.execute()

      expect(receivedTrigger).toBe(mockTrigger)
      expect(receivedTrigger.event).toBe('custom')
      expect(receivedTrigger.data.message).toBe('hello')
    })

    it('should pass responder to step functions', async () => {
      let receivedResponder: any

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-check-responder.ts',
          path: '/steps/01-check-responder.ts',
          fn: async (_ctx, _trigger, responder) => {
            receivedResponder = responder
            responder.emit('test', { data: 'value' })
          },
        },
      ]

      const mockResponder = createMockResponder()
      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: mockResponder,
      })

      await executor.execute()

      expect(receivedResponder).toBe(mockResponder)
      expect(mockResponder.emit).toHaveBeenCalledWith('test', { data: 'value' })
    })
  })

  describe('Flow Control - ctx.__stop', () => {
    it('should stop execution when ctx.__stop is set', async () => {
      const executionOrder: number[] = []

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-execute.ts',
          path: '/steps/01-execute.ts',
          fn: async () => {
            executionOrder.push(1)
          },
        },
        {
          number: 2,
          name: '02-stop.ts',
          path: '/steps/02-stop.ts',
          fn: async (ctx) => {
            executionOrder.push(2)
            ctx.__stop = true
          },
        },
        {
          number: 3,
          name: '03-should-not-run.ts',
          path: '/steps/03-should-not-run.ts',
          fn: async () => {
            executionOrder.push(3)
          },
        },
      ]

      const context: Context = {}
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await executor.execute()

      expect(executionOrder).toEqual([1, 2])
      expect(context.__stop).toBe(true)
    })

    it('should return context when stopped', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-set-and-stop.ts',
          path: '/steps/01-set-and-stop.ts',
          fn: async (ctx) => {
            ctx.stopped = true
            ctx.__stop = true
          },
        },
        {
          number: 2,
          name: '02-never.ts',
          path: '/steps/02-never.ts',
          fn: async (_ctx) => {
            _ctx.stopped = false
          },
        },
      ]

      const context: Context = {}
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      const result = await executor.execute()

      expect(result.stopped).toBe(true)
    })
  })

  describe('Flow Control - isCompleted', () => {
    it('should stop execution when isCompleted returns true', async () => {
      const executionOrder: number[] = []
      let completed = false

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-execute.ts',
          path: '/steps/01-execute.ts',
          fn: async () => {
            executionOrder.push(1)
          },
        },
        {
          number: 2,
          name: '02-complete.ts',
          path: '/steps/02-complete.ts',
          fn: async () => {
            executionOrder.push(2)
            completed = true
          },
        },
        {
          number: 3,
          name: '03-should-not-run.ts',
          path: '/steps/03-should-not-run.ts',
          fn: async () => {
            executionOrder.push(3)
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
        isCompleted: () => completed,
      })

      await executor.execute()

      expect(executionOrder).toEqual([1, 2])
    })

    it('should continue if isCompleted returns false', async () => {
      const executionOrder: number[] = []

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-first.ts',
          path: '/steps/01-first.ts',
          fn: async () => {
            executionOrder.push(1)
          },
        },
        {
          number: 2,
          name: '02-second.ts',
          path: '/steps/02-second.ts',
          fn: async () => {
            executionOrder.push(2)
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
        isCompleted: () => false,
      })

      await executor.execute()

      expect(executionOrder).toEqual([1, 2])
    })
  })

  describe('Error Handling', () => {
    it('should throw FeatureError when step throws', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-throw.ts',
          path: '/steps/01-throw.ts',
          fn: async () => {
            throw new Error('Something went wrong')
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await expect(executor.execute()).rejects.toThrow(FeatureError)
    })

    it('should include original error in FeatureError', async () => {
      const originalError = new Error('Original error message')

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-throw.ts',
          path: '/steps/01-throw.ts',
          fn: async () => {
            throw originalError
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(FeatureError)
        const featureError = error as FeatureError
        expect(featureError.originalError).toBe(originalError)
        expect(featureError.message).toBe('Original error message')
      }
    })

    it('should include step info in FeatureError', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-success.ts',
          path: '/steps/01-success.ts',
          fn: async () => {},
        },
        {
          number: 2,
          name: '02-fail.ts',
          path: '/steps/02-fail.ts',
          fn: async () => {
            throw new Error('Step 2 failed')
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        const featureError = error as FeatureError
        expect(featureError.step).toBeDefined()
        expect(featureError.step?.number).toBe(2)
        expect(featureError.step?.name).toBe('02-fail.ts')
      }
    })

    it('should include context in FeatureError', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-set.ts',
          path: '/steps/01-set.ts',
          fn: async (ctx) => {
            ctx.beforeError = true
          },
        },
        {
          number: 2,
          name: '02-fail.ts',
          path: '/steps/02-fail.ts',
          fn: async () => {
            throw new Error('Failed')
          },
        },
      ]

      const context: Context = { initial: 'value' }
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        const featureError = error as FeatureError
        expect(featureError.context).toBe(context)
        expect(featureError.context?.initial).toBe('value')
        expect(featureError.context?.beforeError).toBe(true)
      }
    })

    it('should use statusCode from error if available', async () => {
      const error = new Error('Not Found') as any
      error.statusCode = 404

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-throw.ts',
          path: '/steps/01-throw.ts',
          fn: async () => {
            throw error
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (err) {
        const featureError = err as FeatureError
        expect(featureError.statusCode).toBe(404)
      }
    })

    it('should default to statusCode 500', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-throw.ts',
          path: '/steps/01-throw.ts',
          fn: async () => {
            throw new Error('Generic error')
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (err) {
        const featureError = err as FeatureError
        expect(featureError.statusCode).toBe(500)
      }
    })

    it('should re-throw existing FeatureError without wrapping', async () => {
      const originalFeatureError = new FeatureError(
        'Original feature error',
        undefined,
        undefined,
        undefined,
        400
      )

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-throw-feature-error.ts',
          path: '/steps/01-throw-feature-error.ts',
          fn: async () => {
            throw originalFeatureError
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBe(originalFeatureError)
        expect((error as FeatureError).statusCode).toBe(400)
      }
    })

    it('should stop execution after error', async () => {
      const executionOrder: number[] = []

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-run.ts',
          path: '/steps/01-run.ts',
          fn: async () => {
            executionOrder.push(1)
          },
        },
        {
          number: 2,
          name: '02-error.ts',
          path: '/steps/02-error.ts',
          fn: async () => {
            executionOrder.push(2)
            throw new Error('Stop here')
          },
        },
        {
          number: 3,
          name: '03-never.ts',
          path: '/steps/03-never.ts',
          fn: async () => {
            executionOrder.push(3)
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      try {
        await executor.execute()
      } catch {
        // Expected
      }

      expect(executionOrder).toEqual([1, 2])
    })
  })

  describe('Synchronous Steps', () => {
    it('should support synchronous step functions', async () => {
      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-sync.ts',
          path: '/steps/01-sync.ts',
          fn: (ctx) => {
            ctx.sync = true
          },
        },
      ]

      const context: Context = {}
      const executor = new GenericExecutor({
        steps,
        context,
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await executor.execute()

      expect(context.sync).toBe(true)
    })

    it('should handle mix of sync and async steps', async () => {
      const executionOrder: number[] = []

      const steps: StepInfo[] = [
        {
          number: 1,
          name: '01-sync.ts',
          path: '/steps/01-sync.ts',
          fn: () => {
            executionOrder.push(1)
          },
        },
        {
          number: 2,
          name: '02-async.ts',
          path: '/steps/02-async.ts',
          fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            executionOrder.push(2)
          },
        },
        {
          number: 3,
          name: '03-sync.ts',
          path: '/steps/03-sync.ts',
          fn: () => {
            executionOrder.push(3)
          },
        },
      ]

      const executor = new GenericExecutor({
        steps,
        context: {},
        trigger: createMockTrigger(),
        responder: createMockResponder(),
      })

      await executor.execute()

      expect(executionOrder).toEqual([1, 2, 3])
    })
  })
})

describe('executeSteps() helper', () => {
  it('should execute steps using helper function', async () => {
    const steps: StepInfo[] = [
      {
        number: 1,
        name: '01-set.ts',
        path: '/steps/01-set.ts',
        fn: async (ctx) => {
          ctx.executed = true
        },
      },
    ]

    const context: Context = {}
    const result = await executeSteps({
      steps,
      context,
      trigger: { event: 'test' },
      responder: { emit: jest.fn() },
    })

    expect(result.executed).toBe(true)
  })
})

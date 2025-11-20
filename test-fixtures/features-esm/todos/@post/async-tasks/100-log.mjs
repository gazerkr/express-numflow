/**
 * Async Task: Log todo creation (ESM)
 */

export default async (ctx) => {
  // Simulate async logging
  const logEntry = {
    action: 'TODO_CREATED',
    todoId: ctx.todo?.id,
    timestamp: new Date().toISOString(),
  }

  // In real app, this would write to a log service
  console.log('[Async Task - ESM]', logEntry)
}

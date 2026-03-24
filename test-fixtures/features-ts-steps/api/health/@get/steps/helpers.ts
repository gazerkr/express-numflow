export function formatResponse(status: string) {
  return { status, timestamp: Date.now() }
}

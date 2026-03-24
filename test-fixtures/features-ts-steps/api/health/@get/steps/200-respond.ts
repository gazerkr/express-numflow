import { formatResponse } from './helpers'

export default async (ctx: any, _req: any, res: any) => {
  const response = formatResponse(ctx.status)
  res.json(response)
}

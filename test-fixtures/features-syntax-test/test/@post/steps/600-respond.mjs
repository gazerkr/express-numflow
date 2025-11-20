/**
 * Final step: Send response
 */

export default async (ctx, req, res) => {
  res.status(200).json({
    success: true,
    tests: {
      test1: ctx.test1,
      test2: ctx.test2,
      test3: ctx.test3,
      test4: ctx.test4,
      test5: ctx.test5,
    }
  })
}

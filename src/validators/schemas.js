const { z } = require('zod');

const uuid = z.string().uuid();
const money = z.coerce.number().positive().max(1000000000);
const currency = z.string().trim().toUpperCase().min(3).max(10);

const idParams = z.object({ body: z.any(), query: z.any(), params: z.object({ id: uuid }) });
const sponsor = z.object({
  body: z.object({ name: z.string().trim().min(2).max(120), contactEmail: z.string().email(), logoUrl: z.string().url().optional() }),
  params: z.any(), query: z.any(),
});
const prizePool = z.object({
  body: z.object({ tournamentId: uuid, name: z.string().trim().min(2).max(120), currency, targetAmount: money.optional() }),
  params: z.any(), query: z.any(),
});
const contribution = z.object({
  body: z.object({ sponsorId: uuid, amount: money, provider: z.enum(['stripe', 'binance_pay']) }),
  params: z.object({ id: uuid }), query: z.any(),
});
const distribution = z.object({
  body: z.object({ rules: z.array(z.object({ position: z.coerce.number().int().positive(), percentage: z.coerce.number().positive().max(100) })).min(1) }),
  params: z.object({ id: uuid }), query: z.any(),
});
const payout = z.object({
  body: z.object({ recipientId: uuid, position: z.coerce.number().int().positive(), destination: z.string().trim().min(3).max(200) }),
  params: z.object({ id: uuid }), query: z.any(),
});

module.exports = { idParams, sponsor, prizePool, contribution, distribution, payout };

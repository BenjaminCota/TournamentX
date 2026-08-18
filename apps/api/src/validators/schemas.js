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
  body: z.object({ sponsorId: uuid, amount: money, provider: z.literal('stripe'), idempotencyKey: z.string().trim().min(8).max(100).optional() }),
  params: z.object({ id: uuid }), query: z.any(),
});
const distribution = z.object({
  body: z.object({ rules: z.array(z.object({ position: z.coerce.number().int().positive(), percentage: z.coerce.number().positive().max(100) })).min(1) }),
  params: z.object({ id: uuid }), query: z.any(),
});
const payout = z.object({
  body: z.object({ recipientId: z.string().trim().min(1).max(120), position: z.coerce.number().int().positive() }),
  params: z.object({ id: uuid }), query: z.any(),
});
const paymentStatus = z.object({
  body: z.object({ status: z.enum(['authorized', 'paid', 'failed', 'cancelled', 'refunded']), notes: z.string().trim().max(255).optional() }),
  params: z.object({ id: uuid }), query: z.any(),
});
const sponsorUpdate = z.object({
  body: z.object({ name: z.string().trim().min(2).max(120).optional(), contactEmail: z.string().email().optional(), logoUrl: z.string().url().nullable().optional(), active: z.boolean().optional() }).refine((body) => Object.keys(body).length > 0, 'Envía al menos un campo'),
  params: z.object({ id: uuid }), query: z.any(),
});
const reward = z.object({
  body: z.object({
    sponsorId: uuid.optional(), prizePoolId: uuid.optional(),
    rewardType: z.enum(['physical', 'game_code', 'gift_card', 'coupon']),
    name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional(),
    quantity: z.coerce.number().int().positive().max(10000).default(1), milestone: z.string().trim().max(120).optional(),
  }), params: z.any(), query: z.any(),
});
const rewardAssignment = z.object({
  body: z.object({ recipientId: uuid, redemptionCode: z.string().trim().min(4).max(100).optional() }),
  params: z.object({ id: uuid }), query: z.any(),
});
const rewardAssignmentStatus = z.object({
  body: z.object({ status: z.enum(['redeemed', 'delivered', 'cancelled']) }),
  params: z.object({ id: uuid }), query: z.any(),
});
const tournamentResults = z.object({
  body: z.object({
    tournamentId: uuid,
    source: z.string().trim().min(2).max(50).default('api'),
    winners: z.array(z.object({
      recipientId: uuid,
      recipientType: z.enum(['team', 'player']),
      position: z.coerce.number().int().positive(),
    })).min(1).refine((winners) => new Set(winners.map((winner) => winner.position)).size === winners.length, 'Las posiciones no pueden repetirse'),
  }), params: z.object({ id: uuid }), query: z.any(),
});

module.exports = { idParams, sponsor, sponsorUpdate, prizePool, contribution, distribution, payout, paymentStatus, reward, rewardAssignment, rewardAssignmentStatus, tournamentResults };

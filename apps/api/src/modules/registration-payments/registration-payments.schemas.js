const { z } = require('zod');

const opaqueId = z.string().trim().min(1).max(120);
const envelope = (body, params) => z.object({ body, params, query: z.any() });

module.exports = {
  create: envelope(
    z.object({
      teamId: opaqueId,
      idempotencyKey: z.string().trim().min(8).max(100),
    }),
    z.object({ tournamentId: opaqueId }),
  ),
  tournament: envelope(z.any(), z.object({ tournamentId: opaqueId })),
  registration: envelope(z.any(), z.object({ id: opaqueId })),
};

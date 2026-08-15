const { z } = require('zod');

const matchStatuses = ['scheduled', 'live', 'completed', 'postponed', 'cancelled'];
const matchModes = ['best_of_1', 'best_of_3', 'best_of_5'];
const opaqueId = z.string().trim().min(1).max(120);

const listMatches = z.object({
  body: z.any(),
  params: z.any(),
  query: z.object({
    tournamentId: opaqueId.optional(),
    scheduleId: opaqueId.optional(),
    status: z.enum(matchStatuses).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  }).refine(({ from, to }) => !from || !to || from <= to, 'El rango de fechas no es válido'),
});

const matchId = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: opaqueId }),
});

const createMatch = z.object({
  params: z.any(),
  query: z.any(),
  body: z.object({
    scheduleId: opaqueId.optional(),
    tournamentId: opaqueId,
    roundId: opaqueId.optional(),
    team1Id: opaqueId,
    team2Id: opaqueId,
    scheduledAt: z.coerce.date(),
    venue: z.string().trim().min(2).max(160).optional(),
    mode: z.enum(matchModes).optional(),
    streamUrl: z.string().url().nullable().optional(),
  }).refine(({ team1Id, team2Id }) => team1Id !== team2Id, {
    message: 'Los equipos de un partido deben ser distintos',
    path: ['team2Id'],
  }),
});

const updateMatchScore = z.object({
  params: z.object({ id: opaqueId }),
  query: z.any(),
  body: z.object({
    team1Score: z.coerce.number().int().min(0).optional(),
    team2Score: z.coerce.number().int().min(0).optional(),
    status: z.enum(matchStatuses).optional(),
  }).superRefine((body, context) => {
    const hasTeam1 = body.team1Score !== undefined;
    const hasTeam2 = body.team2Score !== undefined;
    if (!hasTeam1 && !hasTeam2 && !body.status) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Envía un marcador o un estado' });
    }
    if (hasTeam1 !== hasTeam2) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Envía ambos marcadores juntos', path: ['team2Score'] });
    }
  }),
});

module.exports = { listMatches, matchId, createMatch, updateMatchScore };

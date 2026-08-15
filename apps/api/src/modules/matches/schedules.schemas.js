const { z } = require('zod');

const opaqueId = z.string().trim().min(1).max(120);
const scheduleFormats = ['round_robin', 'single_elimination'];
const matchModes = ['best_of_1', 'best_of_3', 'best_of_5'];

const scheduleId = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: opaqueId }),
});

const listSchedules = z.object({
  body: z.any(),
  params: z.any(),
  query: z.object({ tournamentId: opaqueId.optional() }),
});

const createSchedule = z.object({
  params: z.any(),
  query: z.any(),
  body: z.object({
    tournamentId: opaqueId,
    teamIds: z.array(opaqueId).min(2).max(32).refine((teamIds) => new Set(teamIds).size === teamIds.length, 'Los equipos no pueden repetirse'),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    slotMinutes: z.coerce.number().int().min(15).max(1440).default(90),
    venue: z.string().trim().min(2).max(160).optional(),
    mode: z.enum(matchModes).default('best_of_1'),
    format: z.enum(scheduleFormats).default('round_robin'),
  }).superRefine((body, context) => {
    if (body.endsAt && body.endsAt <= body.startsAt) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'La fecha de cierre debe ser posterior al inicio', path: ['endsAt'] });
    }
    if (body.format === 'single_elimination' && (body.teamIds.length & (body.teamIds.length - 1)) !== 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'La eliminación directa requiere una cantidad de equipos potencia de dos', path: ['teamIds'] });
    }
  }),
});

module.exports = { scheduleId, listSchedules, createSchedule };

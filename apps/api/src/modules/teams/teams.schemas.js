const { z } = require('zod');
const opaqueId = z.string().trim().min(1).max(120);
const envelope = (body, params = z.any()) => z.object({ body, params, query: z.any() });
const teamFields = z.object({ name: z.string().trim().min(2).max(120), abbreviation: z.string().trim().min(2).max(8).optional(), tag: z.string().trim().min(2).max(8).optional(), logo: z.string().url().optional(), sport: z.string().trim().min(2).max(80).default('Esports'), region: z.string().trim().min(2).max(80).default('LATAM'), competitionType: z.string().trim().min(2).max(80).default('Regional'), description: z.string().trim().max(500).default(''), status: z.enum(['active', 'inactive', 'draft']).default('active') }).passthrough();
const playerFields = z.object({ name: z.string().trim().min(2).max(100), lastname: z.string().trim().max(100).default(''), nickname: z.string().trim().min(2).max(60), avatar: z.string().url().optional(), sport: z.string().trim().min(2).max(80).default('Esports'), position: z.string().trim().min(2).max(80).default('Jugador'), nationality: z.string().trim().min(2).max(60).default('MX'), status: z.enum(['active', 'inactive', 'suspended', 'ACTIVE', 'OFFLINE', 'SUSPENDED']).default('active'), gameProfiles: z.record(z.string().trim().min(1).max(120)).optional() }).passthrough();

module.exports = {
  createTeam: envelope(teamFields), updateTeam: envelope(teamFields.partial().refine((value) => Object.keys(value).length > 0), z.object({ id: opaqueId })),
  createPlayer: envelope(playerFields), updatePlayer: envelope(playerFields.partial().refine((value) => Object.keys(value).length > 0), z.object({ id: opaqueId })),
  roster: envelope(z.object({ playerId: opaqueId, role: z.string().trim().min(2).max(80), status: z.enum(['active', 'inactive']).default('active') }), z.object({ id: opaqueId })),
  invitation: envelope(z.object({ expiresInHours: z.coerce.number().int().min(1).max(720).default(72), rosterRole: z.string().trim().min(2).max(80).default('Jugador') }), z.object({ id: opaqueId })),
  joinRequest: envelope(z.object({ code: z.string().trim().min(6).max(32), playerId: opaqueId })),
  joinDecision: envelope(z.object({ decision: z.enum(['approve', 'reject']) }), z.object({ id: opaqueId, requestId: opaqueId })),
  captainTransfer: envelope(z.object({ captainUserId: opaqueId }), z.object({ id: opaqueId })),
};

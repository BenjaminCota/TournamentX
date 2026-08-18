const router = require('express').Router();
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const store = require('./local-rewards.store');
const tournamentStore = require('../tournaments/tournament-store');

const manager = [authenticate, authorize('admin', 'organizer')];
function invalid(next, details) { return next(Object.assign(new Error('Datos no válidos'), { status: 400, details })); }
function requireFound(value, next, message) { if (!value) { next(Object.assign(new Error(message), { status: 404 })); return false; } return true; }

router.use(['/sponsors', '/prize-pools', '/contributions', '/rewards'], authenticate);
router.get('/sponsors', (_req, res) => res.json({ data: store.list('sponsors') }));
router.post('/sponsors', ...manager, (req, res, next) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), contactEmail: z.string().email(), logoUrl: z.string().url().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  if (store.list('sponsors').some((item) => item.contactEmail.toLowerCase() === parsed.data.contactEmail.toLowerCase())) return next(Object.assign(new Error('El correo del patrocinador ya existe'), { status: 409 }));
  const sponsor = store.add('sponsors', { id: store.id(), ...parsed.data, logoUrl: parsed.data.logoUrl || null, active: true, createdAt: new Date().toISOString() });
  return res.status(201).json({ data: sponsor });
});

router.get('/prize-pools', (_req, res) => res.json({ data: store.list('prizePools').map(store.poolDetails) }));
router.get('/prize-pools/:id', (req, res, next) => { const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return; return res.json({ data: store.poolDetails(pool) }); });
router.post('/prize-pools', ...manager, (req, res, next) => {
  const parsed = z.object({ tournamentId: z.string().min(1), name: z.string().trim().min(3).max(120), currency: z.string().trim().length(3).default('USD'), targetAmount: z.coerce.number().positive().optional() }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  const timestamp = new Date().toISOString();
  const pool = store.add('prizePools', { id: store.id(), ...parsed.data, currency: parsed.data.currency.toUpperCase(), targetAmount: parsed.data.targetAmount || null, fundedAmount: 0, status: 'funding', createdBy: req.user.sub, createdAt: timestamp, updatedAt: timestamp });
  return res.status(201).json({ data: pool });
});
router.post('/prize-pools/:id/contributions', ...manager, (req, res, next) => {
  const parsed = z.object({ sponsorId: z.string().min(1), amount: z.coerce.number().positive().max(10000000), provider: z.enum(['stripe', 'binance_pay']), idempotencyKey: z.string().max(100).optional() }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  if (pool.status !== 'funding') return next(Object.assign(new Error('La bolsa ya no acepta aportaciones'), { status: 409 }));
  if (!store.find('sponsors', parsed.data.sponsorId)) return next(Object.assign(new Error('Patrocinador no encontrado'), { status: 404 }));
  if (parsed.data.idempotencyKey) { const existingId = store.list('idempotency').find((item) => item.key === parsed.data.idempotencyKey)?.contributionId; if (existingId) return res.json({ data: store.publicContribution(store.find('contributions', existingId)), payment: { mode: 'local', reused: true } }); }
  const contribution = store.add('contributions', { id: store.id(), prizePoolId: pool.id, sponsorId: parsed.data.sponsorId, amount: parsed.data.amount, currency: pool.currency, provider: parsed.data.provider, providerReference: `local_${parsed.data.provider}_${Date.now()}`, status: 'pending', metadata: { mode: 'local' }, createdAt: new Date().toISOString() });
  if (parsed.data.idempotencyKey) store.add('idempotency', { key: parsed.data.idempotencyKey, contributionId: contribution.id });
  store.add('paymentEvents', { id: store.id(), contributionId: contribution.id, eventType: 'created', previousStatus: null, newStatus: 'pending', performedBy: req.user.sub, createdAt: new Date().toISOString() });
  return res.status(201).json({ data: store.publicContribution(contribution), payment: { mode: 'local', provider: parsed.data.provider, qrContent: parsed.data.provider === 'binance_pay' ? `binance://pay?reference=${contribution.providerReference}&amount=${contribution.amount}` : null, clientSecret: null } });
});
router.put('/prize-pools/:id/distribution', ...manager, (req, res, next) => {
  const parsed = z.object({ rules: z.array(z.object({ position: z.coerce.number().int().positive(), percentage: z.coerce.number().positive().max(100) })).min(1) }).refine((body) => Math.abs(body.rules.reduce((sum, rule) => sum + rule.percentage, 0) - 100) < 0.001, 'Los porcentajes deben sumar 100').safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  const keep = store.list('distributionRules').filter((item) => item.prizePoolId !== pool.id);
  const rules = parsed.data.rules.map((rule) => ({ id: store.id(), prizePoolId: pool.id, ...rule, amount: Number((Number(pool.fundedAmount) * rule.percentage / 100).toFixed(2)) }));
  store.save('distributionRules', [...keep, ...rules]); store.update('prizePools', pool.id, { status: 'locked', updatedAt: new Date().toISOString() });
  return res.json({ data: rules });
});
router.post('/prize-pools/:id/results', ...manager, (req, res, next) => {
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  if (pool.status !== 'locked') return next(Object.assign(new Error('La bolsa debe estar bloqueada antes de importar ganadores'), { status: 409 }));
  if (store.list('payouts').some((item) => item.prizePoolId === pool.id)) return next(Object.assign(new Error('La bolsa ya tiene pagos registrados'), { status: 409 }));

  let status;
  try { status = tournamentStore.getStatus(pool.tournamentId); } catch (error) { return next(error); }
  if (status.status !== 'COMPLETED' || !status.championId) return next(Object.assign(new Error('El torneo debe finalizar antes de importar al campeón'), { status: 409 }));

  const rules = store.list('distributionRules').filter((item) => item.prizePoolId === pool.id).sort((left, right) => left.position - right.position);
  if (rules.length !== 1 || rules[0].position !== 1) return next(Object.assign(new Error('La importación automática local requiere una única regla para la posición 1'), { status: 409 }));

  const champion = tournamentStore.listParticipants(pool.tournamentId).find((participant) => participant.id === status.championId);
  const winner = store.add('winners', { id: store.id(), prizePoolId: pool.id, tournamentId: pool.tournamentId, recipientId: status.championId, recipientType: 'team', position: 1, source: 'bracket', importedBy: req.user.sub, importedAt: new Date().toISOString() });
  const payout = store.add('payouts', { id: store.id(), prizePoolId: pool.id, recipientId: winner.recipientId, position: 1, amount: rules[0].amount, currency: pool.currency, destination: `local:team:${winner.recipientId}`, status: 'released', receiptCode: `TX-${Date.now().toString(36).toUpperCase()}-1`, releasedBy: req.user.sub, releasedAt: new Date().toISOString() });
  store.update('prizePools', pool.id, { status: 'distributed', updatedAt: new Date().toISOString() });
  return res.status(201).json({ data: { tournamentId: pool.tournamentId, champion: champion?.name || winner.recipientId, payout, source: 'bracket' } });
});
router.post('/prize-pools/:id/payouts', ...manager, (req, res, next) => {
  const parsed = z.object({ recipientId: z.string().min(1), position: z.coerce.number().int().positive(), destination: z.string().min(3).max(255) }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  const rule = store.list('distributionRules').find((item) => item.prizePoolId === pool.id && item.position === parsed.data.position); if (!requireFound(rule, next, 'No existe una regla para esa posición')) return;
  if (store.list('payouts').some((item) => item.prizePoolId === pool.id && item.position === rule.position)) return next(Object.assign(new Error('Esta posición ya fue pagada'), { status: 409 }));
  const receiptCode = `TX-${Date.now().toString(36).toUpperCase()}-${rule.position}`;
  const payout = store.add('payouts', { id: store.id(), prizePoolId: pool.id, recipientId: parsed.data.recipientId, position: rule.position, amount: rule.amount, currency: pool.currency, destination: parsed.data.destination, status: 'released', receiptCode, releasedBy: req.user.sub, releasedAt: new Date().toISOString() });
  const pending = store.list('distributionRules').filter((item) => item.prizePoolId === pool.id).some((item) => !store.list('payouts').some((payoutItem) => payoutItem.prizePoolId === pool.id && payoutItem.position === item.position));
  if (!pending) store.update('prizePools', pool.id, { status: 'distributed', updatedAt: new Date().toISOString() });
  return res.status(201).json({ data: payout });
});

router.get('/contributions', (req, res) => res.json({ data: store.list('contributions').filter((item) => !req.query.prizePoolId || item.prizePoolId === req.query.prizePoolId).map(store.publicContribution) }));
function completeContribution(req, res, next, status = 'paid') { const contribution = store.find('contributions', req.params.id); if (!requireFound(contribution, next, 'Aportación no encontrada')) return; const previous = contribution.status; if (previous !== 'paid' && status === 'paid') { const pool = store.find('prizePools', contribution.prizePoolId); store.update('prizePools', pool.id, { fundedAmount: Number(pool.fundedAmount) + Number(contribution.amount), updatedAt: new Date().toISOString() }); } store.update('contributions', contribution.id, { status }); store.add('paymentEvents', { id: store.id(), contributionId: contribution.id, eventType: status === 'paid' ? 'approved' : 'failed', previousStatus: previous, newStatus: status, performedBy: req.user.sub, createdAt: new Date().toISOString() }); return res.json({ data: store.publicContribution(store.find('contributions', contribution.id)) }); }
router.post('/contributions/:id/stripe/capture', ...manager, (req, res, next) => completeContribution(req, res, next));
router.post('/contributions/:id/stripe/test-authorize', ...manager, (req, res, next) => { const contribution = store.find('contributions', req.params.id); if (!requireFound(contribution, next, 'Aportación no encontrada')) return; store.update('contributions', contribution.id, { status: 'authorized' }); return res.json({ data: store.publicContribution(store.find('contributions', contribution.id)) }); });
router.post('/contributions/:id/binance/simulate', ...manager, (req, res, next) => completeContribution(req, res, next, req.body.status === 'failed' ? 'failed' : 'paid'));
router.get('/contributions/:id/history', (req, res) => res.json({ data: store.list('paymentEvents').filter((item) => item.contributionId === req.params.id) }));

router.get('/rewards', (req, res) => res.json({ data: store.list('rewards').filter((item) => !req.query.prizePoolId || item.prizePoolId === req.query.prizePoolId).map((item) => ({ ...item, assignedQuantity: store.list('rewardAssignments').filter((assignment) => assignment.rewardItemId === item.id && assignment.status !== 'cancelled').length })) }));
router.post('/rewards', ...manager, (req, res, next) => { const parsed = z.object({ sponsorId: z.string().optional(), prizePoolId: z.string().optional(), rewardType: z.enum(['physical', 'game_code', 'gift_card', 'coupon']), name: z.string().trim().min(2).max(120), description: z.string().max(500).optional(), quantity: z.coerce.number().int().positive().max(10000), milestone: z.string().max(120).optional() }).safeParse(req.body); if (!parsed.success) return invalid(next, parsed.error.flatten()); const reward = store.add('rewards', { id: store.id(), ...parsed.data, active: true, createdBy: req.user.sub, createdAt: new Date().toISOString() }); return res.status(201).json({ data: reward }); });
router.post('/rewards/:id/assignments', ...manager, (req, res, next) => { const parsed = z.object({ recipientId: z.string().min(1) }).safeParse(req.body); if (!parsed.success) return invalid(next, parsed.error.flatten()); const reward = store.find('rewards', req.params.id); if (!requireFound(reward, next, 'Premio no encontrado')) return; const assigned = store.list('rewardAssignments').filter((item) => item.rewardItemId === reward.id && item.status !== 'cancelled').length; if (assigned >= reward.quantity) return next(Object.assign(new Error('No hay existencias disponibles'), { status: 409 })); const assignment = store.add('rewardAssignments', { id: store.id(), rewardItemId: reward.id, recipientId: parsed.data.recipientId, redemptionCode: `TXR-${Date.now().toString(36).toUpperCase()}`, status: 'assigned', assignedBy: req.user.sub, assignedAt: new Date().toISOString() }); return res.status(201).json({ data: assignment }); });
router.get('/receipts/:code', (req, res, next) => { const payout = store.list('payouts').find((item) => item.receiptCode === req.params.code); if (!requireFound(payout, next, 'Recibo no encontrado')) return; return res.json({ data: { ...payout, prizePool: store.find('prizePools', payout.prizePoolId), generatedAt: new Date().toISOString() } }); });

module.exports = router;

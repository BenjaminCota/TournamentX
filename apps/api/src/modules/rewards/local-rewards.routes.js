const router = require('express').Router();
const { z } = require('zod');
const { authenticate, authorize } = require('../../middleware/auth');
const store = require('./local-rewards.store');
const tournamentStore = require('../tournaments/tournament-store');
const env = require('../../config/env');
const stripeConnectService = require('../stripe-connect/stripe-connect.service');
const paymentSettingsService = require('../payments/payment-settings.service');

const manager = [authenticate, authorize('admin', 'organizer')];
const managerRole = [authorize('admin', 'organizer')];
function invalid(next, details) { return next(Object.assign(new Error('Datos no válidos'), { status: 400, details })); }
function requireFound(value, next, message) { if (!value) { next(Object.assign(new Error(message), { status: 404 })); return false; } return true; }
function isAdmin(req) { return String(req.user?.role || '').toLowerCase() === 'admin'; }
function isOrganizer(req) { return String(req.user?.role || '').toLowerCase() === 'organizer'; }
function requirePoolOwner(req, pool, next) { if (isAdmin(req) || (isOrganizer(req) && pool.createdBy === req.user.sub)) return true; next(Object.assign(new Error('Solo puedes administrar bolsas de tus propios torneos'), { status: 403 })); return false; }
function requireAutomatedPaymentMode(next) { if (env.isTestRun) return true; next(Object.assign(new Error('Configura MySQL y Stripe Test para procesar pagos'), { status: 503 })); return false; }
function poolSummary(pool) { return { id: pool.id, tournamentId: pool.tournamentId, name: pool.name, currency: pool.currency, targetAmount: pool.targetAmount, fundedAmount: pool.fundedAmount, status: pool.status, updatedAt: pool.updatedAt }; }
function readablePool(pool, role) {
  const details = store.poolDetails(pool);
  if (['admin', 'organizer'].includes(String(role || '').toLowerCase())) return details;
  return { ...poolSummary(pool), distributionRules: details.distributionRules, contributions: [], payouts: [], winners: [] };
}

router.get('/prize-pools/public', (_req, res) => res.json({ data: store.list('prizePools').map(poolSummary) }));
router.use(['/sponsors', '/prize-pools', '/contributions', '/rewards'], authenticate);
router.get('/sponsors', ...managerRole, (_req, res) => res.json({ data: store.list('sponsors') }));
router.post('/sponsors', ...manager, (req, res, next) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), contactEmail: z.string().email(), logoUrl: z.string().url().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  if (store.list('sponsors').some((item) => item.contactEmail.toLowerCase() === parsed.data.contactEmail.toLowerCase())) return next(Object.assign(new Error('El correo del patrocinador ya existe'), { status: 409 }));
  const sponsor = store.add('sponsors', { id: store.id(), ...parsed.data, logoUrl: parsed.data.logoUrl || null, active: true, createdAt: new Date().toISOString() });
  return res.status(201).json({ data: sponsor });
});

router.get('/prize-pools', (req, res) => { const pools = isOrganizer(req) ? store.list('prizePools').filter((pool) => pool.createdBy === req.user.sub) : store.list('prizePools'); return res.json({ data: pools.map(poolSummary) }); });
router.get('/prize-pools/:id', (req, res, next) => { const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return; if (isOrganizer(req) && !requirePoolOwner(req, pool, next)) return; return res.json({ data: readablePool(pool, req.user.role) }); });
router.post('/prize-pools', ...manager, (req, res, next) => {
  const parsed = z.object({ tournamentId: z.string().min(1), name: z.string().trim().min(3).max(120), currency: z.string().trim().length(3).default('USD'), targetAmount: z.coerce.number().positive().optional() }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  if (isOrganizer(req) && !tournamentStore.canUserManageTournament(parsed.data.tournamentId, req.user.sub)) return next(Object.assign(new Error('Solo puedes crear bolsas para tus propios torneos'), { status: 403 }));
  const timestamp = new Date().toISOString();
  const pool = store.add('prizePools', { id: store.id(), ...parsed.data, currency: parsed.data.currency.toUpperCase(), targetAmount: parsed.data.targetAmount || null, fundedAmount: 0, status: 'funding', createdBy: req.user.sub, createdAt: timestamp, updatedAt: timestamp });
  return res.status(201).json({ data: pool });
});
router.post('/prize-pools/:id/contributions', ...manager, (req, res, next) => {
  if (!requireAutomatedPaymentMode(next)) return;
  const parsed = z.object({ sponsorId: z.string().min(1), amount: z.coerce.number().positive().max(10000000), provider: z.literal('stripe'), idempotencyKey: z.string().max(100).optional() }).safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  if (!requirePoolOwner(req, pool, next)) return;
  if (pool.status !== 'funding') return next(Object.assign(new Error('La bolsa ya no acepta aportaciones'), { status: 409 }));
  if (!store.find('sponsors', parsed.data.sponsorId)) return next(Object.assign(new Error('Patrocinador no encontrado'), { status: 404 }));
  if (parsed.data.idempotencyKey) { const existingId = store.list('idempotency').find((item) => item.key === parsed.data.idempotencyKey)?.contributionId; if (existingId) return res.json({ data: store.publicContribution(store.find('contributions', existingId)), payment: { mode: 'local', reused: true } }); }
  const contribution = store.add('contributions', { id: store.id(), prizePoolId: pool.id, sponsorId: parsed.data.sponsorId, amount: parsed.data.amount, currency: pool.currency, provider: parsed.data.provider, providerReference: `local_${parsed.data.provider}_${Date.now()}`, status: 'pending', metadata: { mode: 'local' }, createdAt: new Date().toISOString() });
  if (parsed.data.idempotencyKey) store.add('idempotency', { key: parsed.data.idempotencyKey, contributionId: contribution.id });
  store.add('paymentEvents', { id: store.id(), contributionId: contribution.id, eventType: 'created', previousStatus: null, newStatus: 'pending', performedBy: req.user.sub, createdAt: new Date().toISOString() });
  return res.status(201).json({ data: store.publicContribution(contribution), payment: { mode: 'local', provider: 'stripe', clientSecret: null, simulated: true } });
});
router.put('/prize-pools/:id/distribution', ...manager, (req, res, next) => {
  const parsed = z.object({ rules: z.array(z.object({ position: z.coerce.number().int().positive(), percentage: z.coerce.number().positive().max(100) })).min(1) }).refine((body) => Math.abs(body.rules.reduce((sum, rule) => sum + rule.percentage, 0) - 100) < 0.001, 'Los porcentajes deben sumar 100').safeParse(req.body);
  if (!parsed.success) return invalid(next, parsed.error.flatten());
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  if (!requirePoolOwner(req, pool, next)) return;
  const keep = store.list('distributionRules').filter((item) => item.prizePoolId !== pool.id);
  const rules = parsed.data.rules.map((rule) => ({ id: store.id(), prizePoolId: pool.id, ...rule, amount: Number((Number(pool.fundedAmount) * rule.percentage / 100).toFixed(2)) }));
  store.save('distributionRules', [...keep, ...rules]); store.update('prizePools', pool.id, { status: 'locked', updatedAt: new Date().toISOString() });
  return res.json({ data: rules });
});
router.post('/prize-pools/:id/results', ...manager, (req, res, next) => {
  if (!requireAutomatedPaymentMode(next)) return;
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  if (!requirePoolOwner(req, pool, next)) return;
  if (pool.status !== 'locked') return next(Object.assign(new Error('La bolsa debe estar bloqueada antes de importar ganadores'), { status: 409 }));
  if (store.list('payouts').some((item) => item.prizePoolId === pool.id)) return next(Object.assign(new Error('La bolsa ya tiene pagos registrados'), { status: 409 }));

  let status;
  try { status = tournamentStore.getStatus(pool.tournamentId); } catch (error) { return next(error); }
  if (status.status !== 'COMPLETED' || !status.championId) return next(Object.assign(new Error('El torneo debe finalizar antes de importar al campeón'), { status: 409 }));

  const rules = store.list('distributionRules').filter((item) => item.prizePoolId === pool.id).sort((left, right) => left.position - right.position);
  if (rules.length !== 1 || rules[0].position !== 1) return next(Object.assign(new Error('La importación automática local requiere una única regla para la posición 1'), { status: 409 }));

  const champion = tournamentStore.listParticipants(pool.tournamentId).find((participant) => participant.id === status.championId);
  const winner = store.add('winners', { id: store.id(), prizePoolId: pool.id, tournamentId: pool.tournamentId, recipientId: status.championId, recipientType: 'team', position: 1, source: 'bracket', importedBy: req.user.sub, importedAt: new Date().toISOString() });
  const percentage = Number(store.find('settings', 'platform')?.platformFeePercentage ?? 5);
  const amounts = paymentSettingsService.calculateAmounts(rules[0].amount, percentage);
  const payout = store.add('payouts', { id: store.id(), prizePoolId: pool.id, recipientId: winner.recipientId, position: 1, amount: amounts.grossAmount, platformFeePercentage: amounts.platformFeePercentage, platformFeeAmount: amounts.platformFeeAmount, netAmount: amounts.netAmount, currency: pool.currency, destination: `local:team:${winner.recipientId}`, providerReference: null, status: 'released', attemptCount: 1, lastError: null, receiptCode: `TX-${Date.now().toString(36).toUpperCase()}-1`, releasedBy: req.user.sub, releasedAt: new Date().toISOString() });
  store.add('payoutEvents', { id: store.id(), payoutId: payout.id, eventType: 'released', message: 'Premio enviado correctamente', performedBy: req.user.sub, createdAt: new Date().toISOString() });
  store.update('prizePools', pool.id, { status: 'distributed', updatedAt: new Date().toISOString() });
  return res.status(201).json({ data: { tournamentId: pool.tournamentId, champion: champion?.name || winner.recipientId, payout, source: 'bracket' } });
});
router.post('/prize-pools/:id/payouts', ...manager, async (req, res, next) => {
  try {
    if (!requireAutomatedPaymentMode(next)) return;
    const parsed = z.object({ recipientId: z.string().min(1).max(120), position: z.coerce.number().int().positive(), destination: z.string().min(3).max(255).optional() }).safeParse(req.body);
    if (!parsed.success) return invalid(next, parsed.error.flatten());
    const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
    if (!requirePoolOwner(req, pool, next)) return;
    const rule = store.list('distributionRules').find((item) => item.prizePoolId === pool.id && item.position === parsed.data.position); if (!requireFound(rule, next, 'No existe una regla para esa posición')) return;
    const winner = store.list('winners').find((item) => item.prizePoolId === pool.id && item.position === rule.position);
    if (winner && winner.recipientId !== parsed.data.recipientId) return next(Object.assign(new Error('El ganador seleccionado no coincide con el resultado oficial'), { status: 409 }));
    const existing = store.list('payouts').find((item) => item.prizePoolId === pool.id && item.position === rule.position);
    if (existing?.status === 'released') return next(Object.assign(new Error('Esta posición ya fue pagada'), { status: 409 }));
    if (existing?.status === 'pending') return next(Object.assign(new Error('El envío de este premio ya está en proceso'), { status: 409 }));
    if (existing && existing.recipientId !== parsed.data.recipientId) return next(Object.assign(new Error('El reintento debe conservar al mismo ganador'), { status: 409 }));

    const settings = await paymentSettingsService.getSettings();
    const amounts = existing || paymentSettingsService.calculateAmounts(rule.amount, settings.platformFeePercentage);
    const attemptCount = Number(existing?.attemptCount || 0) + 1;
    const payout = existing
      ? store.update('payouts', existing.id, { status: 'pending', attemptCount, lastError: null, releasedBy: req.user.sub })
      : store.add('payouts', { id: store.id(), prizePoolId: pool.id, recipientId: parsed.data.recipientId, position: rule.position, amount: amounts.grossAmount, platformFeePercentage: amounts.platformFeePercentage, platformFeeAmount: amounts.platformFeeAmount, netAmount: amounts.netAmount, currency: pool.currency, destination: 'stripe:pending', providerReference: null, status: 'pending', attemptCount, lastError: null, receiptCode: `TX-${Date.now().toString(36).toUpperCase()}-${rule.position}`, releasedBy: req.user.sub, releasedAt: null });
    store.add('payoutEvents', { id: store.id(), payoutId: payout.id, eventType: existing ? 'retried' : 'created', message: existing ? 'Nuevo intento de envío' : 'Premio preparado para envío', performedBy: req.user.sub, createdAt: new Date().toISOString() });
    let transfer;
    try {
      transfer = env.stripeMode === 'test'
        ? await stripeConnectService.createPrizeTransfer({ prizePoolId: pool.id, recipientId: parsed.data.recipientId, position: rule.position, amount: payout.netAmount, currency: pool.currency, attempt: attemptCount })
        : { destination: parsed.data.destination || `local:team:${parsed.data.recipientId}`, providerReference: null };
    } catch (error) {
      store.update('payouts', payout.id, { status: 'failed', lastError: String(error?.message || 'No fue posible enviar el premio').slice(0, 255) });
      store.add('payoutEvents', { id: store.id(), payoutId: payout.id, eventType: 'failed', message: String(error?.message || 'No fue posible enviar el premio').slice(0, 255), performedBy: req.user.sub, createdAt: new Date().toISOString() });
      throw error;
    }
    store.update('payouts', payout.id, { destination: transfer.destination, providerReference: transfer.providerReference, status: 'released', lastError: null, releasedAt: new Date().toISOString() });
    store.add('payoutEvents', { id: store.id(), payoutId: payout.id, eventType: 'released', message: 'Premio enviado correctamente', performedBy: req.user.sub, createdAt: new Date().toISOString() });
    const pending = store.list('distributionRules').filter((item) => item.prizePoolId === pool.id).some((item) => !store.list('payouts').some((payoutItem) => payoutItem.prizePoolId === pool.id && payoutItem.position === item.position && payoutItem.status === 'released'));
    if (!pending) store.update('prizePools', pool.id, { status: 'distributed', updatedAt: new Date().toISOString() });
    return res.status(201).json({ data: store.find('payouts', payout.id) });
  } catch (error) { return next(error); }
});

router.get('/contributions', ...managerRole, (req, res) => { const ownedPoolIds = new Set(store.list('prizePools').filter((pool) => isAdmin(req) || pool.createdBy === req.user.sub).map((pool) => pool.id)); return res.json({ data: store.list('contributions').filter((item) => ownedPoolIds.has(item.prizePoolId) && (!req.query.prizePoolId || item.prizePoolId === req.query.prizePoolId)).map(store.publicContribution) }); });
function completeContribution(req, res, next, status = 'paid') { const contribution = store.find('contributions', req.params.id); if (!requireFound(contribution, next, 'Aportación no encontrada')) return; const pool = store.find('prizePools', contribution.prizePoolId); if (!requirePoolOwner(req, pool, next)) return; const previous = contribution.status; if (previous !== 'paid' && status === 'paid') { store.update('prizePools', pool.id, { fundedAmount: Number(pool.fundedAmount) + Number(contribution.amount), updatedAt: new Date().toISOString() }); } store.update('contributions', contribution.id, { status }); store.add('paymentEvents', { id: store.id(), contributionId: contribution.id, eventType: status === 'paid' ? 'approved' : 'failed', previousStatus: previous, newStatus: status, performedBy: req.user.sub, createdAt: new Date().toISOString() }); return res.json({ data: store.publicContribution(store.find('contributions', contribution.id)) }); }
router.post('/contributions/:id/stripe/capture', ...manager, (req, res, next) => {
  if (!requireAutomatedPaymentMode(next)) return;
  return completeContribution(req, res, next);
});
router.post('/contributions/:id/stripe/refund', ...manager, (req, res, next) => {
  if (!requireAutomatedPaymentMode(next)) return;
  const contribution = store.find('contributions', req.params.id); if (!requireFound(contribution, next, 'Aportación no encontrada')) return;
  const pool = store.find('prizePools', contribution.prizePoolId); if (!requirePoolOwner(req, pool, next)) return;
  if (contribution.status === 'refunded') return res.json({ data: store.publicContribution(contribution), reused: true, providerStatus: 'succeeded' });
  if (contribution.status !== 'paid') return next(Object.assign(new Error('Solo se puede reembolsar una aportación pagada'), { status: 409 }));
  if (pool.status !== 'funding') return next(Object.assign(new Error('La bolsa ya está cerrada y no permite reembolsos'), { status: 409 }));
  store.update('prizePools', pool.id, { fundedAmount: Math.max(0, Number(pool.fundedAmount) - Number(contribution.amount)), updatedAt: new Date().toISOString() });
  store.update('contributions', contribution.id, { status: 'refunded', providerRefundReference: `refund_${Date.now()}`, refundedAt: new Date().toISOString() });
  store.add('paymentEvents', { id: store.id(), contributionId: contribution.id, eventType: 'refunded', previousStatus: 'paid', newStatus: 'refunded', performedBy: req.user.sub, notes: 'Reembolso completado', createdAt: new Date().toISOString() });
  return res.json({ data: store.publicContribution(store.find('contributions', contribution.id)), reused: false, providerStatus: 'succeeded' });
});
router.post('/contributions/:id/stripe/test-authorize', ...manager, (req, res, next) => { if (!requireAutomatedPaymentMode(next)) return; const contribution = store.find('contributions', req.params.id); if (!requireFound(contribution, next, 'Aportación no encontrada')) return; const pool = store.find('prizePools', contribution.prizePoolId); if (!requirePoolOwner(req, pool, next)) return; store.update('contributions', contribution.id, { status: 'authorized' }); return res.json({ data: store.publicContribution(store.find('contributions', contribution.id)) }); });
router.get('/contributions/:id/history', ...managerRole, (req, res, next) => { const contribution = store.find('contributions', req.params.id); if (!requireFound(contribution, next, 'Aportación no encontrada')) return; const pool = store.find('prizePools', contribution.prizePoolId); if (!requirePoolOwner(req, pool, next)) return; return res.json({ data: store.list('paymentEvents').filter((item) => item.contributionId === req.params.id) }); });

router.get('/prize-pools/:id/reconciliation', ...manager, (req, res, next) => {
  const pool = store.find('prizePools', req.params.id); if (!requireFound(pool, next, 'Bolsa de premios no encontrada')) return;
  if (!requirePoolOwner(req, pool, next)) return;
  const contributions = store.list('contributions').filter((item) => item.prizePoolId === pool.id);
  const payouts = store.list('payouts').filter((item) => item.prizePoolId === pool.id);
  const payoutIds = new Set(payouts.map((item) => item.id));
  return res.json({ data: {
    prizePoolId: pool.id,
    currency: pool.currency,
    available: Number(pool.fundedAmount),
    collected: contributions.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount), 0),
    refunded: contributions.filter((item) => item.status === 'refunded').reduce((sum, item) => sum + Number(item.amount), 0),
    awarded: payouts.filter((item) => item.status === 'released').reduce((sum, item) => sum + Number(item.amount), 0),
    platformFees: payouts.filter((item) => item.status === 'released').reduce((sum, item) => sum + Number(item.platformFeeAmount || 0), 0),
    transferred: payouts.filter((item) => item.status === 'released').reduce((sum, item) => sum + Number(item.netAmount || item.amount), 0),
    pending: payouts.filter((item) => item.status === 'pending').length,
    failed: payouts.filter((item) => item.status === 'failed').length,
    events: store.list('payoutEvents').filter((item) => payoutIds.has(item.payoutId)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 50),
  } });
});

router.get('/rewards', (req, res) => { const rewards = store.list('rewards').filter((item) => !req.query.prizePoolId || item.prizePoolId === req.query.prizePoolId).filter((item) => { if (!isOrganizer(req)) return true; if (!item.prizePoolId) return item.createdBy === req.user.sub; return store.find('prizePools', item.prizePoolId)?.createdBy === req.user.sub; }); return res.json({ data: rewards.map((item) => ({ ...item, assignedQuantity: store.list('rewardAssignments').filter((assignment) => assignment.rewardItemId === item.id && assignment.status !== 'cancelled').length })) }); });
router.post('/rewards', ...manager, (req, res, next) => { const parsed = z.object({ sponsorId: z.string().optional(), prizePoolId: z.string().optional(), rewardType: z.enum(['physical', 'game_code', 'gift_card', 'coupon']), name: z.string().trim().min(2).max(120), description: z.string().max(500).optional(), quantity: z.coerce.number().int().positive().max(10000), milestone: z.string().max(120).optional() }).safeParse(req.body); if (!parsed.success) return invalid(next, parsed.error.flatten()); if (parsed.data.prizePoolId) { const pool = store.find('prizePools', parsed.data.prizePoolId); if (!requireFound(pool, next, 'Bolsa de premios no encontrada') || !requirePoolOwner(req, pool, next)) return; } const reward = store.add('rewards', { id: store.id(), ...parsed.data, active: true, createdBy: req.user.sub, createdAt: new Date().toISOString() }); return res.status(201).json({ data: reward }); });
router.post('/rewards/:id/assignments', ...manager, (req, res, next) => { const parsed = z.object({ recipientId: z.string().min(1) }).safeParse(req.body); if (!parsed.success) return invalid(next, parsed.error.flatten()); const reward = store.find('rewards', req.params.id); if (!requireFound(reward, next, 'Premio no encontrado')) return; if (reward.prizePoolId) { const pool = store.find('prizePools', reward.prizePoolId); if (!requirePoolOwner(req, pool, next)) return; } else if (isOrganizer(req) && reward.createdBy !== req.user.sub) return next(Object.assign(new Error('Solo puedes asignar premios que creaste'), { status: 403 })); const assigned = store.list('rewardAssignments').filter((item) => item.rewardItemId === reward.id && item.status !== 'cancelled').length; if (assigned >= reward.quantity) return next(Object.assign(new Error('No hay existencias disponibles'), { status: 409 })); const assignment = store.add('rewardAssignments', { id: store.id(), rewardItemId: reward.id, recipientId: parsed.data.recipientId, redemptionCode: `TXR-${Date.now().toString(36).toUpperCase()}`, status: 'assigned', assignedBy: req.user.sub, assignedAt: new Date().toISOString() }); return res.status(201).json({ data: assignment }); });
router.get('/receipts/:code', ...manager, (req, res, next) => { const payout = store.list('payouts').find((item) => item.receiptCode === req.params.code); if (!requireFound(payout, next, 'Recibo no encontrado')) return; const pool = store.find('prizePools', payout.prizePoolId); if (!requirePoolOwner(req, pool, next)) return; return res.json({ data: { ...payout, prizePool: pool, generatedAt: new Date().toISOString() } }); });

module.exports = router;

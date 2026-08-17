import React, { useEffect, useRef, useState } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  QrCode, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Download,
  Building2,
  Gift
} from 'lucide-react';
import { EscrowTransaction, UserRole } from '../../types';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { notify } from '../../shared/feedback';

interface RecompensasViewProps {
  currentUserRole: UserRole;
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
type DemoSession = { token: string; stripePublishableKey?: string | null; sponsor: { id: string; name: string }; prizePool: { id: string; name: string } };
type ApiContribution = { id: string; amount: number; currency: string; provider: 'stripe' | 'binance_pay'; providerReference: string; status: string; sponsorName: string; createdAt?: string };
type Sponsor = { id: string; name: string; contactEmail: string; active: boolean };
type Reward = { id: string; name: string; rewardType: string; quantity: number; assignedQuantity: number };
type Rule = { position: number; percentage: number; amount: number };
type Payout = { id: string; recipientId: string; position: number; amount: number; currency: string; status: string; receiptCode: string };
type Winner = { recipientId: string; recipientType: string; position: number };
type PoolDetails = { id: string; status: string; fundedAmount: number; distributionRules: Rule[]; payouts: Payout[]; winners: Winner[] };

export const RecompensasView: React.FC<RecompensasViewProps> = ({ currentUserRole }) => {
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('Preparando la información...');
  const [activeGateway, setActiveGateway] = useState<'STRIPE' | 'BINANCE_PAY'>('STRIPE');
  const [selectedReceipt, setSelectedReceipt] = useState<EscrowTransaction | null>(null);
  const [amountInput, setAmountInput] = useState('5000');
  const [payerName, setPayerName] = useState('Team Luminex Vault');
  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successTx, setSuccessTx] = useState<EscrowTransaction | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [poolDetails, setPoolDetails] = useState<PoolDetails | null>(null);
  const [qrContent, setQrContent] = useState('binance://pay?mode=simulated');
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string>>({});
  const stripeRef = useRef<Stripe | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const [stripeReady, setStripeReady] = useState(false);

  const apiRequest = async (path: string, options: RequestInit = {}, token = demoSession?.token) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'No fue posible completar la operación');
    return body;
  };

  const mapContribution = (item: ApiContribution): EscrowTransaction => ({
    id: item.id,
    uuid: item.id,
    tournamentId: demoSession?.prizePool.id || 'demo',
    tournamentName: demoSession?.prizePool.name || 'Bolsa Demo Módulo 8',
    amountUSD: Number(item.amount),
    gateway: item.provider === 'stripe' ? 'STRIPE' : 'BINANCE_PAY',
    status: 'LOCKED',
    date: item.createdAt ? new Date(item.createdAt).toLocaleString() : new Date().toLocaleString(),
    payer: item.sponsorName || 'Patrocinador Demo',
    recipientTeam: 'Pendiente de Finalista',
    txHash: item.providerReference,
  });

  const loadData = async (active: DemoSession) => {
    const [contributionsBody, sponsorsBody, rewardsBody, poolBody] = await Promise.all([
      apiRequest(`/contributions?prizePoolId=${active.prizePool.id}`, {}, active.token),
      apiRequest('/sponsors', {}, active.token),
      apiRequest(`/rewards?prizePoolId=${active.prizePool.id}`, {}, active.token),
      apiRequest(`/prize-pools/${active.prizePool.id}`, {}, active.token),
    ]);
    setTransactions((contributionsBody.data as ApiContribution[]).map((item) => ({
      ...mapContribution(item), tournamentId: active.prizePool.id, tournamentName: active.prizePool.name,
    })));
    setPaymentStatuses(Object.fromEntries((contributionsBody.data as ApiContribution[]).map((item) => [item.id, item.status])));
    setSponsors(sponsorsBody.data); setRewards(rewardsBody.data); setPoolDetails(poolBody.data);
    if (!selectedSponsorId && sponsorsBody.data[0]) { setSelectedSponsorId(sponsorsBody.data[0].id); setPayerName(sponsorsBody.data[0].name); }
  };

  useEffect(() => { void (async () => {
    try {
      const definitiveToken = localStorage.getItem('tournamentx_token');
      if (!definitiveToken) throw new Error('Inicia sesión para administrar premios y pagos');
      const definitivePoolId = localStorage.getItem('tournamentx_prize_pool_id');
      const definitivePoolName = localStorage.getItem('tournamentx_prize_pool_name');
      const definitiveSponsorId = localStorage.getItem('tournamentx_sponsor_id');
      let poolId = definitivePoolId; let poolName = definitivePoolName; let sponsorId = definitiveSponsorId; let sponsorName = 'Patrocinador';
      if (!poolId || !sponsorId) {
        const [poolBody, sponsorBody] = await Promise.all([apiRequest('/prize-pools', {}, definitiveToken), apiRequest('/sponsors', {}, definitiveToken)]);
        const firstPool = poolBody.data?.[0]; const firstSponsor = sponsorBody.data?.[0];
        if (!firstPool || !firstSponsor) throw new Error('Crea una bolsa de premios y un patrocinador para continuar');
        poolId = firstPool.id; poolName = firstPool.name; sponsorId = firstSponsor.id; sponsorName = firstSponsor.name;
        localStorage.setItem('tournamentx_prize_pool_id', poolId); localStorage.setItem('tournamentx_prize_pool_name', poolName); localStorage.setItem('tournamentx_sponsor_id', sponsorId);
      }
      const active = { token: definitiveToken, stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null, sponsor: { id: sponsorId, name: sponsorName }, prizePool: { id: poolId, name: poolName || 'Bolsa de premios' } };
      setDemoSession(active);
      setSelectedSponsorId(active.sponsor.id);
      await loadData(active);
      setConnectionMessage('Todo está listo');
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'Error de conexión'); }
  })(); }, []);

  useEffect(() => {
    if (activeGateway !== 'STRIPE' || !demoSession?.stripePublishableKey) return;
    setStripeReady(false);
    let cancelled = false;
    void (async () => {
      const stripe = await loadStripe(demoSession.stripePublishableKey as string);
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;
      const elements = stripe.elements();
      const card = elements.create('card', {
        style: { base: { color: '#cbd5e1', fontSize: '13px', '::placeholder': { color: '#64748b' } }, invalid: { color: '#fb7185' } },
      });
      card.mount('#stripe-card-element'); cardElementRef.current = card; setStripeReady(true);
    })();
    return () => { cancelled = true; cardElementRef.current?.unmount(); cardElementRef.current = null; setStripeReady(false); };
  }, [activeGateway, demoSession?.stripePublishableKey]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoSession) return;
    if (poolDetails?.status !== 'funding') { setConnectionMessage('La bolsa está bloqueada y ya no acepta aportaciones'); return; }
    setIsProcessing(true);
    try {
      const provider = activeGateway === 'STRIPE' ? 'stripe' : 'binance_pay';
      const created = await apiRequest(`/prize-pools/${demoSession.prizePool.id}/contributions`, {
        method: 'POST', body: JSON.stringify({ sponsorId: selectedSponsorId || demoSession.sponsor.id, amount: Number(amountInput), provider, idempotencyKey: crypto.randomUUID() }),
      });
      if (provider === 'stripe') {
        setConnectionMessage('Validando la tarjeta...');
        if (created.payment.clientSecret && stripeRef.current && cardElementRef.current) {
          const confirmation = await stripeRef.current.confirmCardPayment(created.payment.clientSecret, { payment_method: { card: cardElementRef.current } });
          if (confirmation.error) throw new Error(confirmation.error.message || 'Stripe rechazó los datos de prueba');
          for (let attempt = 0; attempt < 24; attempt += 1) {
            const listed = await apiRequest('/contributions');
            const current = (listed.data as ApiContribution[]).find((item) => item.id === created.data.id);
            if (current?.status === 'authorized') break;
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        } else {
          await apiRequest(`/contributions/${created.data.id}/stripe/test-authorize`, { method: 'POST' });
        }
        await apiRequest(`/contributions/${created.data.id}/stripe/capture`, { method: 'POST' });
        setConnectionMessage('Aportación con tarjeta registrada');
      } else {
        setQrContent(created.payment.qrContent);
        await apiRequest(`/contributions/${created.data.id}/binance/simulate`, { method: 'POST', body: JSON.stringify({ status: 'paid' }) });
        setConnectionMessage('Aportación con Binance registrada');
      }
      const completed = { ...created.data, status: 'paid', sponsorName: payerName } as ApiContribution;
      const newTx = mapContribution(completed);
      setSuccessTx(newTx);
      await loadData(demoSession);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      notify('success', `Aportación de $${Number(amountInput).toLocaleString()} confirmada.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible procesar el pago';
      setConnectionMessage(message);
      notify('error', message);
    } finally { setIsProcessing(false); }
  };

  const handleReleaseEscrow = async (_txId: string) => {
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Organizador') {
      alert('Solo los Administradores u Organizadores pueden liberar fondos de custodia.');
      return;
    }

    if (!demoSession || !poolDetails?.distributionRules.length) return alert('Primero configura y bloquea la distribución.');
    const pendingRule = poolDetails.distributionRules.find((rule) => !poolDetails.payouts.some((payout) => payout.position === rule.position));
    if (!pendingRule) return alert('Todos los pagos ya fueron entregados.');
    const knownWinner = poolDetails.winners.find((winner) => winner.position === pendingRule.position);
    const recipientId = knownWinner?.recipientId || window.prompt(`Identificador del ganador de la posición ${pendingRule.position}`);
    if (!recipientId) return;
    try {
      await apiRequest(`/prize-pools/${demoSession.prizePool.id}/payouts`, { method: 'POST', body: JSON.stringify({ recipientId, position: pendingRule.position, destination: `simulated:winner:${recipientId}` }) });
      await loadData(demoSession); setConnectionMessage(`Payout de la posición ${pendingRule.position} liberado`);
      notify('success', `Pago de la posición ${pendingRule.position} liberado.`);
    } catch (error) { const message = error instanceof Error ? error.message : 'No fue posible entregar el pago'; setConnectionMessage(message); notify('error', message); }
  };

  const addSponsor = async () => {
    if (!demoSession) return;
    const name = window.prompt('Nombre del patrocinador'); const contactEmail = window.prompt('Correo del patrocinador');
    if (!name || !contactEmail) return;
    try { await apiRequest('/sponsors', { method: 'POST', body: JSON.stringify({ name, contactEmail }) }); await loadData(demoSession); notify('success', 'Patrocinador agregado correctamente.'); }
    catch (error) { const message = error instanceof Error ? error.message : 'No fue posible crear el patrocinador'; setConnectionMessage(message); notify('error', message); }
  };

  const addReward = async () => {
    if (!demoSession) return;
    const name = window.prompt('Nombre del premio o cupón'); if (!name) return;
    const quantity = Number(window.prompt('Cantidad disponible', '1') || 1);
    try { await apiRequest('/rewards', { method: 'POST', body: JSON.stringify({ prizePoolId: demoSession.prizePool.id, rewardType: 'coupon', name, quantity }) }); await loadData(demoSession); notify('success', 'Premio agregado correctamente.'); }
    catch (error) { const message = error instanceof Error ? error.message : 'No fue posible crear el premio'; setConnectionMessage(message); notify('error', message); }
  };

  const configureDistribution = async () => {
    if (!demoSession) return;
    if (!poolDetails || Number(poolDetails.fundedAmount) <= 0) { setConnectionMessage('Registra al menos una aportación pagada antes de distribuir'); return; }
    try {
      await apiRequest(`/prize-pools/${demoSession.prizePool.id}/distribution`, { method: 'PUT', body: JSON.stringify({ rules: [{ position: 1, percentage: 60 }, { position: 2, percentage: 25 }, { position: 3, percentage: 15 }] }) });
      await loadData(demoSession); setConnectionMessage('Distribución guardada correctamente'); notify('success', 'Distribución de premios guardada.');
    } catch (error) { const message = error instanceof Error ? error.message : 'No fue posible configurar la distribución'; setConnectionMessage(message); notify('error', message); }
  };

  const downloadReceipt = async (receiptCode: string) => {
    try {
      const body = await apiRequest(`/receipts/${receiptCode}`, {}, null);
      const blob = new Blob([JSON.stringify(body.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${receiptCode}.json`; link.click(); URL.revokeObjectURL(url);
      notify('success', 'Comprobante descargado.');
    } catch (error) { const message = error instanceof Error ? error.message : 'No fue posible descargar el recibo'; setConnectionMessage(message); notify('error', message); }
  };

  return (
    <div id="recompensas-escrow-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-tight italic flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#ff2e83]" />
            Premios y pagos
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-tech">
            Administra aportaciones, premios y pagos a ganadores en un solo lugar
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono-code bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {connectionMessage}
          </span>
        </div>
      </div>

      {/* 2-COLUMN: PAYMENT GATEWAY SIMULATOR & ESCROW LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: PAYMENT / DEPOSIT GATEWAY SIMULATOR */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-6 shadow-2xl">
          <div>
            <span className="text-[10px] font-mono-code uppercase font-bold text-[#ff2e83]">
              Nueva aportación
            </span>
            <h2 className="font-display font-black text-2xl text-white mt-1">
              Agregar fondos al premio
            </h2>
            <p className="text-xs text-slate-400">
              Elige un método y registra la aportación para el torneo.
            </p>
          </div>

          {/* Gateway Switcher Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-[#141724] border border-[#1e2230]">
            <button
              type="button"
              onClick={() => setActiveGateway('STRIPE')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeGateway === 'STRIPE'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>STRIPE (TARJETA)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGateway('BINANCE_PAY')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeGateway === 'BINANCE_PAY'
                  ? 'bg-[#F0B90B] text-black shadow-lg shadow-[#F0B90B]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>BINANCE PAY (CRYPTO)</span>
            </button>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                Monto de la aportación (USD)
              </label>
              <div className="relative mt-1">
                <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  max="1000000000"
                  step="0.01"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-mono-code font-bold focus:border-[#ff2e83] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                Nombre del Patrocinador / Entidad
              </label>
              <select required value={selectedSponsorId} onChange={(e) => { setSelectedSponsorId(e.target.value); setPayerName(sponsors.find((item) => item.id === e.target.value)?.name || 'Patrocinador'); }} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1">
                {sponsors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            {activeGateway === 'STRIPE' ? (
              <div className="space-y-3 p-4 rounded-2xl bg-[#141724] border border-[#232738]">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono-code">Tarjeta de prueba</span>
                  <span className="text-emerald-400 font-bold">Sin dinero real</span>
                </div>
                {demoSession?.stripePublishableKey ? <><div id="stripe-card-element" className="w-full min-h-10 bg-[#0c0d14] border border-[#1e2230] rounded-xl px-4 py-3" /><p className="text-[10px] text-slate-500">Prueba: 4242 4242 4242 4242 · vencimiento futuro · CVC de 3 dígitos · cualquier C.P.</p></> : <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">Simulación local lista: se autorizará y capturará sin mover dinero real.</div>}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#141724] border border-[#F0B90B]/30 flex items-center gap-4">
                <div className="w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 flex items-center justify-center">
                  <QRCodeSVG value={qrContent} size={68} level="M" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Pago de prueba con Binance Pay</div>
                  <p className="text-[11px] text-slate-400">
                    El QR local reproduce el formato de pago; no mueve criptomonedas reales.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !demoSession || poolDetails?.status !== 'funding' || (activeGateway === 'STRIPE' && Boolean(demoSession?.stripePublishableKey) && !stripeReady)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isProcessing ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <span>{poolDetails?.status === 'funding' ? 'Confirmar aportación' : 'Bolsa bloqueada'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Success Banner */}
          {successTx && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Aportación registrada
                </span>
                <button
                  onClick={() => setSelectedReceipt(successTx)}
                  className="text-xs text-white underline hover:text-emerald-300 font-mono-code"
                >
                  Ver comprobante
                </button>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400">
                Folio: {successTx.uuid}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: ESCROW LEDGER & TRANSACTIONS TABLE */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
              <div>
                <h2 className="font-display font-black text-2xl text-white">
                  Movimientos del premio
                </h2>
                <p className="text-xs text-slate-400">
                  Fondos retenidos y regla de distribución automática
                </p>
              </div>
              <span className="text-xs font-mono-code text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
                {transactions.length} Transacciones
              </span>
            </div>

            {/* Transactions List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl bg-[#141724] border border-[#1e2230] hover:border-slate-600 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                          tx.gateway === 'STRIPE' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tx.gateway}
                        </span>
                        <span className="font-bold text-white text-xs">{tx.tournamentName}</span>
                      </div>
                      <div className="text-[10px] font-mono-code text-slate-500 mt-1">
                        Payer: {tx.payer} • {tx.date}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono-code font-bold text-sm text-emerald-400">
                        ${tx.amountUSD.toLocaleString()} USD
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold ${
                        paymentStatuses[tx.id] === 'paid'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : paymentStatuses[tx.id] === 'authorized'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                      }`}>
                        {paymentStatuses[tx.id] === 'authorized' ? 'AUTORIZADO' : paymentStatuses[tx.id] === 'paid' ? 'PAGADO / EN CUSTODIA' : (paymentStatuses[tx.id] || 'PENDIENTE').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1e2230] flex items-center justify-between text-xs">
                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="text-[11px] text-[#ff2e83] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver aportación
                    </button>

                    <span className="text-[10px] text-slate-500">{paymentStatuses[tx.id] === 'paid' ? 'Fondos sumados a la bolsa' : 'Esperando confirmación'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e2230] text-[11px] font-mono-code text-slate-500 flex items-center justify-between">
            <span>{poolDetails?.distributionRules.length ? `Regla: ${poolDetails.distributionRules.map((rule) => `${rule.position}º ${rule.percentage}%`).join(' • ')}` : 'Distribución todavía no configurada'}</span>
            {!poolDetails?.distributionRules.length ? <button onClick={configureDistribution} disabled={!poolDetails || Number(poolDetails.fundedAmount) <= 0} className="text-[#ff2e83] font-bold disabled:text-slate-600">CONFIGURAR 60/25/15</button> : <span className="text-emerald-400">Distribución confirmada</span>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-[#10121a] border border-[#1e2230] rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between"><div><h2 className="font-display font-black text-xl text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-[#ff2e83]" /> Patrocinadores</h2><p className="text-xs text-slate-400 mt-1">Personas y organizaciones que aportan premios.</p></div><button onClick={addSponsor} className="px-3 py-2 rounded-xl bg-[#ff2e83] text-white text-xs font-bold">＋ AGREGAR</button></div>
          {sponsors.map((sponsor) => <div key={sponsor.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#151824] border border-[#24293b]"><div><div className="font-bold text-sm text-white">{sponsor.name}</div><div className="text-[11px] text-slate-500">{sponsor.contactEmail}</div></div><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${sponsor.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>{sponsor.active ? 'ACTIVO' : 'INACTIVO'}</span></div>)}
        </section>

        <section className="bg-[#10121a] border border-[#1e2230] rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between"><div><h2 className="font-display font-black text-xl text-white flex items-center gap-2"><Gift className="w-5 h-5 text-[#ff2e83]" /> Premios y cupones</h2><p className="text-xs text-slate-400 mt-1">Premios disponibles para entregar.</p></div><button onClick={addReward} className="px-3 py-2 rounded-xl bg-[#ff2e83] text-white text-xs font-bold">＋ AGREGAR</button></div>
          <div className="grid sm:grid-cols-3 gap-3">
            {rewards.map((reward) => <div key={reward.id} className="p-4 rounded-2xl bg-[#151824] border border-[#24293b]"><Gift className="w-5 h-5 text-[#ff2e83]" /><div className="font-bold text-sm text-white mt-3">{reward.name}</div><div className="text-[10px] text-slate-500 mt-1">{reward.rewardType.toUpperCase()}</div><div className="text-xs text-emerald-400 mt-3">{Math.max(0, reward.quantity - Number(reward.assignedQuantity))} disponibles</div></div>)}
            {!rewards.length && <p className="text-xs text-slate-500">Aún no hay premios registrados.</p>}
          </div>
        </section>
      </div>

      <section className="bg-[#10121a] border border-[#1e2230] rounded-3xl p-6 space-y-4">
        <div><h2 className="font-display font-black text-xl text-white">Ganadores, pagos y recibos</h2><p className="text-xs text-slate-400 mt-1">Aquí aparecerán los ganadores y sus pagos.</p></div>
        {!poolDetails?.winners.length && <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">Todavía no se han registrado ganadores. También puedes ingresar su identificador manualmente.</div>}
        {!!poolDetails?.winners.length && <div className="grid sm:grid-cols-3 gap-3">{poolDetails.winners.map((winner) => <div key={`${winner.position}-${winner.recipientId}`} className="p-3 rounded-xl bg-[#151824] border border-[#24293b] text-xs"><div className="text-[#ff2e83] font-bold">Posición {winner.position}</div><div className="text-white mt-1">{winner.recipientType}</div><div className="text-slate-500 break-all mt-1">{winner.recipientId}</div></div>)}</div>}
        <div className="space-y-2">{poolDetails?.payouts.map((payout) => <div key={payout.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#151824] border border-[#24293b]"><div className="text-xs"><span className="text-white font-bold">{payout.position}º lugar · ${Number(payout.amount).toFixed(2)} {payout.currency}</span><div className="text-slate-500 mt-1">{payout.receiptCode}</div></div><button onClick={() => void downloadReceipt(payout.receiptCode)} className="px-3 py-2 rounded-lg bg-[#ff2e83] text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" /> Descargar recibo</button></div>)}</div>
        {!!poolDetails?.distributionRules.length && poolDetails.payouts.length < poolDetails.distributionRules.length && <button onClick={() => void handleReleaseEscrow('pool')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">LIBERAR SIGUIENTE PAGO AL GANADOR</button>}
      </section>

      {/* RECEIPT / COUPON MODAL */}
      {selectedReceipt && (
        <div 
          id="modal-receipt-view"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#12141f] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <h3 className="font-display font-black text-2xl text-white">
                Comprobante de aportación
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white font-mono-code text-lg"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Canvas */}
            <div className="p-6 rounded-2xl bg-[#0a0b0e] border border-[#232738] space-y-4 font-mono-code text-xs">
              <div className="text-center pb-3 border-b border-dashed border-[#232738]">
                <div className="font-display font-black text-lg text-white">TOURNAMENTX</div>
                <div className="text-[10px] text-slate-500">Comprobante de Custodia Digital</div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">FOLIO:</span>
                  <span className="text-[#ff2e83] font-bold text-[9px]">{selectedReceipt.uuid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TORNEO:</span>
                  <span className="text-white font-bold">{selectedReceipt.tournamentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MONTO:</span>
                  <span className="text-emerald-400 font-bold text-sm">${selectedReceipt.amountUSD.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PASARELA:</span>
                  <span className="text-white font-bold">{selectedReceipt.gateway}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ESTADO:</span>
                  <span className="text-amber-400 font-bold">{selectedReceipt.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FECHA:</span>
                  <span className="text-slate-300">{selectedReceipt.date}</span>
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="pt-4 border-t border-dashed border-[#232738] text-center space-y-1">
                <div className="h-10 bg-gradient-to-r from-transparent via-slate-700 to-transparent flex items-center justify-center tracking-widest text-[9px] text-slate-400">
                  ||| | |||| || ||| ||||| ||| | ||
                </div>
                <span className="text-[9px] text-slate-500">VALIDACIÓN HASH SHA-256</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  alert('Comprobante guardado en portapapeles y listo para imprimir.');
                  setSelectedReceipt(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir / Descargar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

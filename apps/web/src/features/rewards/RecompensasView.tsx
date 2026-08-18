import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Gift,
  LockKeyhole,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { EscrowTransaction, UserRole } from '../../types';

interface RecompensasViewProps {
  currentUserRole: UserRole;
  isAuthenticated: boolean;
  currentUserId?: string;
}

type PrizePoolSummary = {
  id: string;
  tournamentId: string;
  name: string;
  currency: string;
  targetAmount?: number | null;
  fundedAmount: number;
  status: string;
  simulated?: boolean;
};
type ApiContribution = {
  id: string;
  amount: number;
  currency: string;
  provider: 'stripe';
  providerReference?: string;
  provider_reference?: string;
  providerRefundReference?: string;
  status: string;
  sponsorName?: string;
  createdAt?: string;
};
type Sponsor = { id: string; name: string; contactEmail: string; active: boolean };
type Reward = { id: string; name: string; rewardType: string; quantity: number; assignedQuantity: number };
type Rule = { position: number; percentage: number; amount: number };
type PayoutMethod = { type: 'card'; brand: 'visa' | 'mastercard' | 'amex' | 'other'; last4: string; cardholderName: string };
type Payout = { id: string; recipientId: string; position: number; amount: number; platformFeePercentage?: number; platformFeeAmount?: number; netAmount?: number; currency: string; status: string; receiptCode: string; providerReference?: string | null; attemptCount?: number; lastError?: string | null; payoutMethod?: PayoutMethod };
type Winner = { recipientId: string; recipientType: string; position: number };
type PoolDetails = PrizePoolSummary & { distributionRules: Rule[]; payouts: Payout[]; winners: Winner[] };
type RewardsSession = { token: string; pool: PrizePoolSummary };
type PaymentResult = { mode?: 'local' | 'stripe-test' | 'stripe-test-local'; clientSecret?: string | null; reused?: boolean; simulated?: boolean };
type PaymentConfig = { stripeMode: 'test' | 'disabled'; paymentsMode: string; stripePublishableKey: string | null };
type EntryTournament = { id: string; name: string; status: string; entryFee: number; entryCurrency: string; registeredTeams: number; maxTeams: number };
type CaptainTeam = { id: string; name: string; captainUserId?: string | null; status: string };
type TournamentRegistration = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  teamId: string;
  teamName: string;
  amount: number;
  currency: string;
  provider: 'stripe';
  status: string;
  enrollmentStatus?: string;
  paidAt?: string | null;
};
type StripeConnectStatus = {
  status: 'not_created' | 'onboarding_required' | 'pending_verification' | 'restricted' | 'ready';
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirementsDue: number;
  mode: string;
};
type PaymentSettings = { platformFeePercentage: number; updatedAt?: string | null };
type Reconciliation = {
  prizePoolId: string;
  currency: string;
  available: number;
  collected: number;
  refunded: number;
  awarded: number;
  platformFees: number;
  transferred: number;
  pending: number;
  failed: number;
  events: Array<{ id: string; payoutId: string; eventType: string; message?: string; createdAt?: string; position?: number; status?: string }>;
};
type ClaimablePrize = {
  prizePoolId: string;
  tournamentId: string;
  tournamentName: string;
  teamId: string;
  teamName: string;
  captainUserId: string;
  position: number;
  amount: number;
  currency: string;
  status: 'claimable' | 'paid';
  payout: Payout | null;
};
type ClaimReceipt = {
  payout: Payout;
  pool: PrizePoolSummary;
  team: { id: string; name: string };
  simulated: boolean;
  reused: boolean;
};
type ReceiptData = Payout & {
  tournamentName: string;
  team: { id: string; name: string } | null;
  paymentMode: 'simulated' | 'provider';
  generatedAt: string;
};

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const managerRoles: UserRole[] = ['Admin', 'Organizador'];

function normalizePool(data: PrizePoolSummary & Partial<PoolDetails>): PoolDetails {
  return {
    ...data,
    fundedAmount: Number(data.fundedAmount || 0),
    distributionRules: Array.isArray(data.distributionRules) ? data.distributionRules : [],
    payouts: Array.isArray(data.payouts) ? data.payouts : [],
    winners: Array.isArray(data.winners) ? data.winners : [],
  };
}

export function RecompensasView({ currentUserRole, isAuthenticated, currentUserId }: RecompensasViewProps) {
  const canManage = managerRoles.includes(currentUserRole);
  const isCaptain = currentUserRole === 'Capitán';
  // En el flujo acordado el organizador inscribe equipos y los premios de esta
  // entrega se liquidan de forma simulada. Conservamos las integraciones para
  // una etapa posterior, pero no mostramos pasos que ahora confunden al usuario.
  const showCaptainSelfRegistration = false;
  const showStripeConnectConfiguration = false;
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null);
  const [publicPools, setPublicPools] = useState<PrizePoolSummary[]>([]);
  const [availablePools, setAvailablePools] = useState<PrizePoolSummary[]>([]);
  const [session, setSession] = useState<RewardsSession | null>(null);
  const [poolDetails, setPoolDetails] = useState<PoolDetails | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string>>({});
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [payerName, setPayerName] = useState('Patrocinador');
  const [amountInput, setAmountInput] = useState('100');
  const [connectionMessage, setConnectionMessage] = useState('Cargando premios...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeCardComplete, setStripeCardComplete] = useState(false);
  const [stripeCardError, setStripeCardError] = useState<string | null>(null);
  const [stripeLoadError, setStripeLoadError] = useState<string | null>(null);
  const [stripeReloadKey, setStripeReloadKey] = useState(0);
  const [successTx, setSuccessTx] = useState<EscrowTransaction | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<EscrowTransaction | null>(null);
  const [entryTournaments, setEntryTournaments] = useState<EntryTournament[]>([]);
  const [captainTeams, setCaptainTeams] = useState<CaptainTeam[]>([]);
  const [selectedEntryTournamentId, setSelectedEntryTournamentId] = useState('');
  const [selectedEntryTeamId, setSelectedEntryTeamId] = useState('');
  const [captainRegistrations, setCaptainRegistrations] = useState<TournamentRegistration[]>([]);
  const [teamRegistrationStatuses, setTeamRegistrationStatuses] = useState<TournamentRegistration[]>([]);
  const [registrationMessage, setRegistrationMessage] = useState('Selecciona un torneo y confirma la inscripción.');
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [connectMessage, setConnectMessage] = useState('Consultando tu cuenta de cobro...');
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ platformFeePercentage: 5 });
  const [feeInput, setFeeInput] = useState('5');
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [claimablePrizes, setClaimablePrizes] = useState<ClaimablePrize[]>([]);
  const [claimReceipt, setClaimReceipt] = useState<ClaimReceipt | null>(null);
  const [payoutCardholderName, setPayoutCardholderName] = useState('Capitán Luminex');
  const [payoutCardBrand, setPayoutCardBrand] = useState<PayoutMethod['brand']>('visa');
  const [payoutCardLast4, setPayoutCardLast4] = useState('4242');
  const stripeRef = useRef<Stripe | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement | null>(null);
  const currentRegistration = captainRegistrations.find((registration) => registration.teamId === selectedEntryTeamId);

  const apiRequest = async <T,>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> => {
    const token = localStorage.getItem('tournamentx_token');
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.message || body.error || `La operación fue rechazada por la API (${response.status}).`);
    }
    return body as T;
  };

  useEffect(() => {
    let active = true;
    void apiRequest<{ data: PaymentConfig }>('/payment-settings/config', {}, false)
      .then((body) => {
        if (!active) return;
        setStripePublishableKey(body.data.stripePublishableKey);
        setStripeLoadError(body.data.stripePublishableKey ? null : 'La API no entregó la clave pública de Stripe Test.');
      })
      .catch(() => {
        if (!active) return;
        const fallback = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null;
        setStripePublishableKey(fallback);
        setStripeLoadError(fallback ? null : 'No fue posible cargar la configuración de Stripe Test.');
      });
    return () => { active = false; };
  }, []);

  const mapContribution = (item: ApiContribution, pool: PrizePoolSummary): EscrowTransaction => ({
    id: item.id,
    uuid: item.id,
    tournamentId: pool.tournamentId,
    tournamentName: pool.name,
    amountUSD: Number(item.amount),
    gateway: 'STRIPE',
    status: item.status === 'paid' ? 'LOCKED' : 'PENDING',
    date: item.createdAt ? new Date(item.createdAt).toLocaleString() : new Date().toLocaleString(),
    payer: item.sponsorName || 'Patrocinador',
    recipientTeam: 'Pendiente de resultado oficial',
    txHash: item.providerReference || item.provider_reference,
  });

  const loadData = async (preferredPoolId?: string) => {
    setConnectionMessage('Cargando premios...');
    try {
      const publicBody = await apiRequest<{ data: PrizePoolSummary[] }>('/prize-pools/public', {}, false);
      setPublicPools(publicBody.data);
      if (!isAuthenticated) {
        setAvailablePools([]);
        setClaimablePrizes([]);
        setSession(null);
        setPoolDetails(null);
        setConnectionMessage('Vista pública de premios');
        return;
      }

      const token = localStorage.getItem('tournamentx_token');
      if (!token) throw new Error('Tu sesión terminó. Inicia sesión nuevamente.');
      const listed = await apiRequest<{ data: PrizePoolSummary[] }>('/prize-pools');
      setAvailablePools(listed.data);
      const storedPoolId = localStorage.getItem('tournamentx_prize_pool_id');
      const requestedPool = preferredPoolId
        ? listed.data.find((item) => item.id === preferredPoolId)
        : listed.data.find((item) => item.id === storedPoolId);
      const pool = preferredPoolId
        ? requestedPool
        : canManage
          ? (requestedPool?.status === 'funding' ? requestedPool : listed.data.find((item) => item.status === 'funding') || requestedPool || listed.data[0])
          : requestedPool || listed.data[0];
      if (!pool) {
        setSession(null);
        setPoolDetails(null);
        setConnectionMessage(canManage ? 'Todavía no existe una bolsa de premios.' : 'No hay premios disponibles para consultar.');
        return;
      }
      localStorage.setItem('tournamentx_prize_pool_id', pool.id);
      const nextSession = { token, pool };
      setSession(nextSession);

      const [poolBody, rewardsBody] = await Promise.all([
        apiRequest<{ data: PoolDetails }>(`/prize-pools/${pool.id}`),
        apiRequest<{ data: Reward[] }>(`/rewards?prizePoolId=${pool.id}`),
      ]);
      setPoolDetails(normalizePool(poolBody.data));
      setRewards(rewardsBody.data);

      if (isCaptain) {
        const claimableBody = await apiRequest<{ data: ClaimablePrize[] }>('/prize-pools/claimable');
        setClaimablePrizes(claimableBody.data);
      } else {
        setClaimablePrizes([]);
      }

      if (!canManage && ['Capitán', 'Jugador'].includes(currentUserRole)) {
        const statusBody = await apiRequest<{ data: TournamentRegistration[] }>(`/tournaments/${pool.tournamentId}/registrations/status`);
        setTeamRegistrationStatuses(statusBody.data);
      } else {
        setTeamRegistrationStatuses([]);
      }

      if (canManage) {
        const [contributionsBody, sponsorsBody, settingsBody, reconciliationBody] = await Promise.all([
          apiRequest<{ data: ApiContribution[] }>(`/contributions?prizePoolId=${pool.id}`),
          apiRequest<{ data: Sponsor[] }>('/sponsors'),
          apiRequest<{ data: PaymentSettings }>('/payment-settings'),
          apiRequest<{ data: Reconciliation }>(`/prize-pools/${pool.id}/reconciliation`),
        ]);
        setTransactions(contributionsBody.data.map((item) => mapContribution(item, pool)));
        setPaymentStatuses(Object.fromEntries(contributionsBody.data.map((item) => [item.id, item.status])));
        setSponsors(sponsorsBody.data);
        setPaymentSettings(settingsBody.data);
        setFeeInput(String(settingsBody.data.platformFeePercentage));
        setReconciliation(reconciliationBody.data);
        const firstSponsor = sponsorsBody.data.find((item) => item.active);
        if (firstSponsor) {
          setSelectedSponsorId((current) => current || firstSponsor.id);
          setPayerName(firstSponsor.name);
        }
      } else {
        setTransactions([]);
        setSponsors([]);
        setReconciliation(null);
      }
      setConnectionMessage(canManage ? 'Stripe y la bolsa están listos' : 'Consulta habilitada');
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Error de conexión');
    }
  };

  useEffect(() => { void loadData(); }, [canManage, currentUserRole, isAuthenticated]);

  useEffect(() => {
    if (!showCaptainSelfRegistration || !isAuthenticated || !isCaptain || !currentUserId) {
      setEntryTournaments([]);
      setCaptainTeams([]);
      return;
    }
    void Promise.all([
      apiRequest<EntryTournament[]>('/tournaments'),
      apiRequest<CaptainTeam[]>('/teams'),
    ]).then(([tournaments, teams]) => {
      const available = tournaments.filter((tournament) => tournament.status === 'OPEN' && Number(tournament.entryFee) > 0 && (!tournament.maxTeams || tournament.registeredTeams < tournament.maxTeams));
      const owned = teams.filter((team) => team.captainUserId === currentUserId && team.status === 'active');
      setEntryTournaments(available);
      setCaptainTeams(owned);
      setSelectedEntryTournamentId((current) => current || available[0]?.id || '');
      setSelectedEntryTeamId((current) => current || owned[0]?.id || '');
      if (!owned.length) setRegistrationMessage('Necesitas un equipo activo del que seas capitán.');
      else if (!available.length) setRegistrationMessage('No hay torneos abiertos con cuota de inscripción.');
    }).catch((error) => setRegistrationMessage(error instanceof Error ? error.message : 'No fue posible cargar las inscripciones.'));
  }, [currentUserId, isAuthenticated, isCaptain]);

  useEffect(() => {
    if (!showCaptainSelfRegistration || !isCaptain || !selectedEntryTournamentId) {
      setCaptainRegistrations([]);
      return;
    }
    void apiRequest<{ data: TournamentRegistration[] }>(`/tournaments/${selectedEntryTournamentId}/registrations/me`)
      .then((body) => setCaptainRegistrations(body.data))
      .catch((error) => setRegistrationMessage(error instanceof Error ? error.message : 'No fue posible consultar la inscripción.'));
  }, [isCaptain, selectedEntryTournamentId]);

  const loadConnectStatus = async () => {
    if (!isCaptain || !isAuthenticated) return;
    try {
      const body = await apiRequest<{ data: StripeConnectStatus }>('/stripe/connect/status');
      setConnectStatus(body.data);
      if (body.data.status === 'ready') setConnectMessage('Tu cuenta está lista para recibir premios.');
      else if (body.data.status === 'pending_verification') setConnectMessage('Stripe está revisando los datos de tu cuenta.');
      else if (body.data.status === 'restricted') setConnectMessage('Stripe necesita que completes o corrijas algunos datos.');
      else if (body.data.status === 'onboarding_required') setConnectMessage('Continúa el registro seguro en Stripe.');
      else setConnectMessage('Configura tu cuenta antes de recibir un premio.');
    } catch (error) {
      setConnectMessage(error instanceof Error ? error.message : 'No fue posible consultar Stripe Connect.');
    }
  };

  useEffect(() => {
    if (showStripeConnectConfiguration) void loadConnectStatus();
  }, [isAuthenticated, isCaptain]);

  useEffect(() => {
    if (
      (!canManage && !(isCaptain && showCaptainSelfRegistration))
      || (canManage && !session)
      || (isCaptain && currentRegistration?.status === 'paid')
    ) return;
    if (!stripePublishableKey) return;
    let cancelled = false;
    setStripeReady(false);
    setStripeCardComplete(false);
    setStripeCardError(null);
    setStripeLoadError(null);
    void (async () => {
      try {
        const stripe = await loadStripe(stripePublishableKey);
        const mountNode = cardMountRef.current;
        if (cancelled) return;
        if (!stripe) throw new Error('Stripe.js no pudo iniciarse. Revisa la conexión e inténtalo otra vez.');
        if (!mountNode) throw new Error('No se encontró el espacio del formulario de pago.');
        stripeRef.current = stripe;
        const card = stripe.elements({ locale: 'es' }).create('card', {
          hidePostalCode: true,
          style: { base: { color: '#f8fafc', fontSize: '14px', '::placeholder': { color: '#778099' } }, invalid: { color: '#fb7185' } },
        });
        card.on('change', (change) => {
          setStripeCardComplete(change.complete);
          setStripeCardError(change.error?.message || null);
        });
        card.mount(mountNode);
        cardElementRef.current = card;
        setStripeReady(true);
      } catch (error) {
        if (!cancelled) setStripeLoadError(error instanceof Error ? error.message : 'No fue posible cargar Stripe.js.');
      }
    })();
    return () => {
      cancelled = true;
      cardElementRef.current?.unmount();
      cardElementRef.current = null;
      setStripeReady(false);
      setStripeCardComplete(false);
    };
  }, [canManage, currentRegistration?.status, isCaptain, session?.pool.id, stripePublishableKey, stripeReloadKey]);

  const processStripePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !session || !selectedSponsorId || poolDetails?.status !== 'funding') return;
    setIsProcessing(true);
    try {
      const created = await apiRequest<{ data: ApiContribution; payment: PaymentResult }>(`/prize-pools/${session.pool.id}/contributions`, {
        method: 'POST',
        body: JSON.stringify({ sponsorId: selectedSponsorId, amount: Number(amountInput), provider: 'stripe', idempotencyKey: crypto.randomUUID() }),
      });

      if (!created.payment.clientSecret) throw new Error('Stripe no entregó los datos necesarios para validar la tarjeta de prueba.');
      if (!stripeRef.current || !cardElementRef.current || !stripeCardComplete) throw new Error('Completa correctamente el número, vencimiento y CVC de la tarjeta de prueba.');
      const confirmation = await stripeRef.current.confirmCardPayment(created.payment.clientSecret, { payment_method: { card: cardElementRef.current } });
      if (confirmation.error) throw new Error(confirmation.error.message || 'No fue posible validar los datos de pago.');
      if (created.payment.mode === 'stripe-test-local') {
        await apiRequest(`/contributions/${created.data.id}/stripe/test-authorize`, { method: 'POST' });
        for (let attempt = 0; attempt < 24; attempt += 1) {
          const listed = await apiRequest<{ data: ApiContribution[] }>('/contributions');
          if (listed.data.find((item) => item.id === created.data.id)?.status === 'authorized') break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        await apiRequest(`/contributions/${created.data.id}/stripe/capture`, { method: 'POST' });
      } else {
        throw new Error('Stripe no entregó un modo de pago compatible para confirmar la aportación.');
      }

      setSuccessTx(mapContribution({ ...created.data, status: 'paid', sponsorName: payerName }, session.pool));
      setConnectionMessage('Aportación de Stripe registrada');
      cardElementRef.current?.clear();
      setStripeCardComplete(false);
      setStripeCardError(null);
      await loadData(session.pool.id);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'No fue posible procesar Stripe');
    } finally {
      setIsProcessing(false);
    }
  };

  const processCaptainRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCaptain || !selectedEntryTournamentId || !selectedEntryTeamId) return;
    setIsProcessing(true);
    setRegistrationMessage('Creando la inscripción en Stripe...');
    try {
      const created = await apiRequest<{ data: TournamentRegistration; payment: PaymentResult }>(`/tournaments/${selectedEntryTournamentId}/registrations/stripe`, {
        method: 'POST',
        body: JSON.stringify({ teamId: selectedEntryTeamId, idempotencyKey: crypto.randomUUID() }),
      });

      if (created.payment.clientSecret) {
        if (!stripeRef.current || !cardElementRef.current) throw new Error('El formulario de Stripe todavía no está listo.');
        const confirmation = await stripeRef.current.confirmCardPayment(created.payment.clientSecret, { payment_method: { card: cardElementRef.current } });
        if (confirmation.error) throw new Error(confirmation.error.message || 'No fue posible validar los datos de pago.');
        if (created.payment.mode === 'stripe-test') {
          await apiRequest(`/registrations/${created.data.id}/stripe/test-authorize`, { method: 'POST' });
        }

        let authorized = false;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const listed = await apiRequest<{ data: TournamentRegistration[] }>(`/tournaments/${selectedEntryTournamentId}/registrations/me`);
          const current = listed.data.find((item) => item.id === created.data.id);
          if (current?.status === 'authorized') { authorized = true; break; }
          if (current && ['failed', 'cancelled'].includes(current.status)) throw new Error(`Stripe dejó la inscripción en estado ${current.status}.`);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (!authorized) throw new Error('No pudimos confirmar la autorización del pago. Inténtalo nuevamente.');
      } else {
        throw new Error('Stripe no entregó los datos necesarios para confirmar la inscripción.');
      }

      const captured = await apiRequest<{ data: TournamentRegistration }>(`/registrations/${created.data.id}/stripe/capture`, { method: 'POST' });
      setCaptainRegistrations((current) => [captured.data, ...current.filter((item) => item.id !== captured.data.id)]);
      setRegistrationMessage('Pago e inscripción confirmados. El equipo ya aparece como participante.');
      cardElementRef.current?.clear();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : 'No fue posible pagar la inscripción.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startConnectOnboarding = async () => {
    setIsConnectLoading(true);
    setConnectMessage('Preparando el registro seguro de Stripe...');
    try {
      const body = await apiRequest<{ data: { url: string; account: StripeConnectStatus } }>('/stripe/connect/onboarding-link', { method: 'POST' });
      setConnectStatus(body.data.account);
      window.location.assign(body.data.url);
    } catch (error) {
      setConnectMessage(error instanceof Error ? error.message : 'No fue posible iniciar el registro en Stripe.');
      setIsConnectLoading(false);
    }
  };

  const openConnectDashboard = async () => {
    setIsConnectLoading(true);
    try {
      const body = await apiRequest<{ data: { url: string } }>('/stripe/connect/dashboard-link', { method: 'POST' });
      window.location.assign(body.data.url);
    } catch (error) {
      setConnectMessage(error instanceof Error ? error.message : 'No fue posible abrir la cuenta.');
      setIsConnectLoading(false);
    }
  };

  const addSponsor = async () => {
    const name = window.prompt('Nombre del patrocinador');
    const contactEmail = window.prompt('Correo del patrocinador');
    if (!name || !contactEmail || !session) return;
    try {
      await apiRequest('/sponsors', { method: 'POST', body: JSON.stringify({ name, contactEmail }) });
      await loadData(session.pool.id);
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'No fue posible crear el patrocinador'); }
  };

  const addReward = async () => {
    const name = window.prompt('Nombre del premio o cupón');
    if (!name || !session) return;
    const quantity = Number(window.prompt('Cantidad disponible', '1') || 1);
    try {
      await apiRequest('/rewards', { method: 'POST', body: JSON.stringify({ prizePoolId: session.pool.id, rewardType: 'coupon', name, quantity }) });
      await loadData(session.pool.id);
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'No fue posible crear el premio'); }
  };

  const configureDistribution = async () => {
    if (!session || !poolDetails || poolDetails.fundedAmount <= 0) return;
    try {
      await apiRequest(`/prize-pools/${session.pool.id}/distribution`, { method: 'PUT', body: JSON.stringify({ rules: [{ position: 1, percentage: 60 }, { position: 2, percentage: 25 }, { position: 3, percentage: 15 }] }) });
      await loadData(session.pool.id);
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'No fue posible configurar la distribución'); }
  };

  const savePlatformFee = async () => {
    const value = Number(feeInput);
    if (!Number.isFinite(value) || value < 0 || value > 30) {
      setConnectionMessage('La comisión debe estar entre 0 y 30%.');
      return;
    }
    try {
      const body = await apiRequest<{ data: PaymentSettings }>('/payment-settings', { method: 'PUT', body: JSON.stringify({ platformFeePercentage: value }) });
      setPaymentSettings(body.data);
      setFeeInput(String(body.data.platformFeePercentage));
      setConnectionMessage('Comisión actualizada');
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'No fue posible actualizar la comisión'); }
  };

  const refundContribution = async (contributionId: string) => {
    if (!session || !window.confirm('¿Quieres devolver esta aportación?')) return;
    setIsProcessing(true);
    try {
      await apiRequest(`/contributions/${contributionId}/stripe/refund`, { method: 'POST' });
      setConnectionMessage('Reembolso completado');
      await loadData(session.pool.id);
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'No fue posible completar el reembolso'); }
    finally { setIsProcessing(false); }
  };

  const claimPrize = async (prize: ClaimablePrize) => {
    if (payoutCardholderName.trim().length < 2 || !/^\d{4}$/.test(payoutCardLast4)) {
      setConnectionMessage('Completa el titular y los últimos cuatro dígitos de la tarjeta demo.');
      return;
    }
    if (!window.confirm(`¿Cobrar de forma simulada el premio de ${prize.tournamentName}?`)) return;
    setIsProcessing(true);
    try {
      const body = await apiRequest<{ data: ClaimReceipt }>(`/prize-pools/${prize.prizePoolId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ payoutMethod: { type: 'card', brand: payoutCardBrand, last4: payoutCardLast4, cardholderName: payoutCardholderName.trim() } }),
      });
      setClaimReceipt(body.data);
      setConnectionMessage(body.data.reused ? 'Este premio ya había sido cobrado' : 'Premio simulado cobrado correctamente');
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.65 }, colors: ['#ff2e83', '#ffffff', '#d6b15e'] });
      await loadData(prize.prizePoolId);
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'No fue posible cobrar el premio');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReceipt = async (receiptCode: string) => {
    try {
      const body = await apiRequest<{ data: ReceiptData }>(`/receipts/${receiptCode}`);
      const receipt = body.data;
      const safe = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character);
      const destination = receipt.payoutMethod ? `${receipt.payoutMethod.brand.toUpperCase()} •••• ${receipt.payoutMethod.last4}` : 'Cuenta de cobro registrada';
      const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${safe(receipt.receiptCode)}</title><body style="margin:0;background:#0f0f12;color:#f8f8fa;font-family:Arial,sans-serif"><main style="max-width:680px;margin:40px auto;padding:32px;border:1px solid #35313c;border-radius:24px;background:#18181c"><p style="color:#ff2e83;font-weight:700;letter-spacing:.14em">TOURNAMENTX · PAGO SIMULADO</p><h1>Ficha de pago de premio</h1><p style="color:#67e8a5">Operación completada correctamente</p><hr style="border-color:#35313c"><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px;color:#a6a1ad">Folio</td><td style="padding:10px;text-align:right">${safe(receipt.receiptCode)}</td></tr><tr><td style="padding:10px;color:#a6a1ad">Torneo</td><td style="padding:10px;text-align:right">${safe(receipt.tournamentName)}</td></tr><tr><td style="padding:10px;color:#a6a1ad">Equipo campeón</td><td style="padding:10px;text-align:right">${safe(receipt.team?.name)}</td></tr><tr><td style="padding:10px;color:#a6a1ad">Destino simulado</td><td style="padding:10px;text-align:right">${safe(destination)}</td></tr><tr><td style="padding:10px;color:#a6a1ad">Titular</td><td style="padding:10px;text-align:right">${safe(receipt.payoutMethod?.cardholderName)}</td></tr><tr><td style="padding:10px;color:#a6a1ad">Premio bruto</td><td style="padding:10px;text-align:right">$${Number(receipt.amount).toFixed(2)} ${safe(receipt.currency)}</td></tr><tr><td style="padding:10px;color:#a6a1ad">Comisión</td><td style="padding:10px;text-align:right">-$${Number(receipt.platformFeeAmount || 0).toFixed(2)}</td></tr><tr><td style="padding:14px 10px;font-weight:700">Total acreditado</td><td style="padding:14px 10px;text-align:right;color:#d6b15e;font-size:22px;font-weight:800">$${Number(receipt.netAmount ?? receipt.amount).toFixed(2)} ${safe(receipt.currency)}</td></tr></table><hr style="border-color:#35313c"><small style="color:#a6a1ad">Referencia: ${safe(receipt.providerReference)} · Generada: ${safe(new Date(receipt.generatedAt).toLocaleString())}. Esta ficha corresponde a una operación simulada y no representa movimiento bancario real.</small></main></body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receiptCode}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { setConnectionMessage(error instanceof Error ? error.message : 'No fue posible descargar el recibo'); }
  };

  const totalPublic = publicPools.reduce((total, pool) => total + Number(pool.fundedAmount || 0), 0);
  const selectedEntryTournament = entryTournaments.find((tournament) => tournament.id === selectedEntryTournamentId);
  const accessLabel = currentUserRole === 'Admin' ? 'Auditoría y control total'
    : currentUserRole === 'Organizador' ? 'Administración de bolsas y premios'
      : currentUserRole === 'Capitán' ? 'Consulta del estado económico del equipo'
        : currentUserRole === 'Jugador' ? 'Consulta de premios del equipo'
          : 'Información pública de premios';
  const paymentStatusLabel: Record<string, string> = { pending: 'Pendiente', authorized: 'Autorizado', paid: 'Pagado', failed: 'Fallido', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const nextRule = poolDetails?.distributionRules.find((rule) => !poolDetails.payouts.some((payout) => payout.position === rule.position && payout.status === 'released'));
  const nextWinner = nextRule ? poolDetails?.winners.find((winner) => winner.position === nextRule.position) : undefined;
  const contributionAmount = Number(amountInput);
  const contributionAmountIsValid = Number.isFinite(contributionAmount) && contributionAmount >= 1 && contributionAmount <= 999999.99;
  const contributionIsReady = Boolean(
    selectedSponsorId
    && poolDetails?.status === 'funding'
    && stripePublishableKey
    && stripeReady
    && stripeCardComplete
    && contributionAmountIsValid,
  );
  const contributionHint = poolDetails?.status !== 'funding'
    ? 'Esta bolsa ya no acepta aportaciones. Selecciona una bolsa marcada como “Fondo preparado”.'
    : !contributionAmountIsValid
      ? 'Ingresa un monto entre $1.00 y $999,999.99 USD para esta prueba.'
      : !selectedSponsorId
        ? 'Selecciona un patrocinador activo.'
        : stripeLoadError
          ? stripeLoadError
          : !stripeReady
            ? 'Cargando el formulario seguro de Stripe…'
            : stripeCardError
              ? stripeCardError
              : !stripeCardComplete
                ? 'Completa el número, vencimiento MM/AA y CVC de una tarjeta de prueba.'
                : 'La tarjeta de prueba es válida y la aportación está lista para confirmarse.';

  return <div id="recompensas-view" className="mx-auto max-w-7xl space-y-7 p-6 lg:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-3 font-brand text-4xl font-black uppercase italic text-white"><CreditCard className="h-8 w-8 text-[#ff2e83]"/> Premios y pagos</h1><p className="mt-2 text-sm text-slate-400">{accessLabel}.</p></div>
      <span className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4"/>{connectionMessage}</span>
    </header>

    <section className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-2xl border border-white/10 bg-[#10121a] p-5"><Trophy className="h-5 w-5 text-[#d6b15e]"/><p className="mt-3 text-xs text-slate-500">Total público acumulado</p><strong className="mt-1 block text-3xl text-white">${totalPublic.toLocaleString()} USD</strong></article>
      <article className="rounded-2xl border border-white/10 bg-[#10121a] p-5"><Eye className="h-5 w-5 text-blue-400"/><p className="mt-3 text-xs text-slate-500">Bolsas visibles</p><strong className="mt-1 block text-3xl text-white">{publicPools.length}</strong></article>
      <article className="rounded-2xl border border-white/10 bg-[#10121a] p-5"><LockKeyhole className="h-5 w-5 text-emerald-400"/><p className="mt-3 text-xs text-slate-500">Tu acceso</p><strong className="mt-1 block text-sm text-white">{accessLabel}</strong></article>
    </section>

    {publicPools.length > 0 && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{publicPools.map((pool) => {
      const canOpen = availablePools.some((available) => available.id === pool.id);
      const selected = session?.pool.id === pool.id;
      return <button type="button" key={pool.id} disabled={isAuthenticated && !canOpen} onClick={() => { if (isAuthenticated && canOpen) void loadData(pool.id); }} className={`rounded-2xl border bg-[#10121a] p-4 text-left transition ${selected ? 'border-[#ff2e83]/70 shadow-[0_0_24px_rgba(255,46,131,.12)]' : 'border-white/10'} ${isAuthenticated && canOpen ? 'hover:-translate-y-0.5 hover:border-[#ff2e83]/40' : ''}`}><div className="flex items-start justify-between gap-3"><p className="text-xs text-slate-400">{pool.name}</p>{pool.simulated && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-violet-300">SIMULADO</span>}</div><strong className="mt-2 block text-xl text-white">${Number(pool.fundedAmount).toLocaleString()} {pool.currency}</strong><span className="mt-2 inline-block text-[10px] text-emerald-300">{pool.status === 'funding' ? 'Fondo preparado' : pool.status === 'locked' ? 'Esperando cobro del capitán' : pool.status === 'distributed' ? 'Premio cobrado' : 'Cerrada'}</span></button>;
    })}</section>}

    {!isAuthenticated && <section className="rounded-3xl border border-[#ff2e83]/25 bg-[#ff2e83]/[.06] p-7 text-center"><LockKeyhole className="mx-auto h-8 w-8 text-[#ff2e83]"/><h2 className="mt-3 text-xl font-bold text-white">Inicia sesión para ver los datos de tu equipo</h2><p className="mt-2 text-sm text-slate-400">Los visitantes solamente pueden consultar el total público de las bolsas.</p></section>}

    {isAuthenticated && !canManage && <>
      <section className="rounded-3xl border border-white/10 bg-[#10121a] p-6"><h2 className="text-xl font-bold text-white">{poolDetails?.name || 'Premios disponibles'}</h2><p className="mt-2 text-sm text-slate-400">Consulta el monto reunido y cómo se repartirán los premios.</p><div className="mt-5 flex flex-wrap gap-2">{poolDetails?.distributionRules.map((rule) => <span key={rule.position} className="rounded-lg bg-white/[.05] px-3 py-2 text-xs text-slate-300">{rule.position}º lugar · {rule.percentage}%</span>)}</div>{teamRegistrationStatuses.map((registration) => <div key={registration.id} className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${registration.status === 'paid' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'}`}><CheckCircle2 className="h-4 w-4"/><span>{registration.teamName}: {registration.status === 'paid' ? 'inscripción pagada y confirmada' : 'pago de inscripción pendiente'}</span></div>)}</section>
      {isCaptain && <section className="rounded-3xl border border-[#d6b15e]/25 bg-gradient-to-br from-[#d6b15e]/[.08] via-[#10121a] to-[#ff2e83]/[.06] p-6">
        <div className="flex items-start gap-3"><Trophy className="mt-1 h-6 w-6 text-[#d6b15e]"/><div><span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d6b15e]">Recompensas del campeón</span><h2 className="mt-1 text-2xl font-black text-white">Premios disponibles para cobro</h2><p className="mt-1 text-xs text-slate-400">Solo aparecen aquí cuando el resultado oficial identifica como ganador a uno de tus equipos.</p></div></div>
        {claimablePrizes.some((prize) => prize.status === 'claimable') && <div className="mt-5 rounded-2xl border border-[#d6b15e]/20 bg-black/20 p-4"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#d6b15e]"/><strong className="text-sm text-white">Tarjeta destino simulada</strong></div><p className="mt-1 text-[11px] text-slate-400">Solo guardamos la marca y los últimos cuatro dígitos para mostrarlos en la ficha. No ingreses una tarjeta real.</p><div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_.8fr_.6fr]"><label className="text-xs text-slate-300">Titular<input value={payoutCardholderName} onChange={(event) => setPayoutCardholderName(event.target.value)} maxLength={100} className="field mt-1"/></label><label className="text-xs text-slate-300">Marca<select value={payoutCardBrand} onChange={(event) => setPayoutCardBrand(event.target.value as PayoutMethod['brand'])} className="field mt-1"><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="amex">American Express</option><option value="other">Otra</option></select></label><label className="text-xs text-slate-300">Últimos 4<input inputMode="numeric" autoComplete="off" value={payoutCardLast4} onChange={(event) => setPayoutCardLast4(event.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} className="field mt-1 font-mono"/></label></div><p className="mt-3 text-xs text-emerald-300">Destino: {payoutCardBrand.toUpperCase()} •••• {payoutCardLast4.padStart(4, '•')}</p></div>}
        <div className="mt-5 space-y-3">{claimablePrizes.length ? claimablePrizes.map((prize) => <article key={prize.prizePoolId} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-base text-white">{prize.tournamentName}</strong><p className="mt-1 text-xs text-slate-400">Campeón: {prize.teamName} · {prize.position}º lugar</p><strong className="mt-3 block text-xl text-[#d6b15e]">${Number(prize.amount).toLocaleString()} {prize.currency}</strong></div>{prize.status === 'paid' && prize.payout ? <button type="button" onClick={() => void downloadReceipt(prize.payout!.receiptCode)} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300"><Download className="h-4 w-4"/>DESCARGAR FICHA</button> : <button type="button" disabled={isProcessing} onClick={() => void claimPrize(prize)} className="rounded-xl bg-[#ff2e83] px-5 py-3 text-xs font-black text-white shadow-[0_8px_24px_rgba(255,46,131,.25)] disabled:opacity-50">{isProcessing ? 'PROCESANDO...' : 'COBRAR PREMIO SIMULADO'}</button>}</article>) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-400">Todavía no tienes un campeonato con resultado oficial pendiente de cobro.</div>}</div>
      </section>}
      {isCaptain && showStripeConnectConfiguration && <section className="rounded-3xl border border-emerald-500/20 bg-[#10121a] p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div><h2 className="text-2xl font-black text-white">Cuenta para recibir premios</h2><p className="mt-2 max-w-2xl text-xs text-slate-400">Tus datos de identidad y cuenta bancaria se registran de forma segura. TournamentX no guarda esa información.</p></div>
          <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${connectStatus?.status === 'ready' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{connectStatus?.status === 'ready' ? 'LISTA PARA COBRAR' : 'CONFIGURACIÓN PENDIENTE'}</span>
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-300">{connectMessage}</p><button type="button" disabled={isConnectLoading} onClick={() => void (connectStatus?.status === 'ready' ? openConnectDashboard() : startConnectOnboarding())} className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{isConnectLoading ? 'ABRIENDO...' : connectStatus?.status === 'ready' ? 'ADMINISTRAR CUENTA' : 'CONFIGURAR CUENTA'}</button></div>
      </section>}
      {isCaptain && showCaptainSelfRegistration && <form onSubmit={processCaptainRegistration} className="space-y-5 rounded-3xl border border-blue-500/20 bg-[#10121a] p-6">
        <div><span className="text-[10px] font-bold uppercase text-blue-300">Inscripción del equipo</span><h2 className="mt-1 text-2xl font-black text-white">Pagar con Stripe</h2><p className="mt-1 text-xs text-slate-400">La cuota se toma del torneo. No puedes cambiar el monto ni pagar por otro equipo.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs text-slate-300">Torneo<select required value={selectedEntryTournamentId} onChange={(event) => setSelectedEntryTournamentId(event.target.value)} className="field mt-1">{entryTournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name} · ${Number(tournament.entryFee).toFixed(2)} {tournament.entryCurrency}</option>)}</select></label>
          <label className="block text-xs text-slate-300">Tu equipo<select required value={selectedEntryTeamId} onChange={(event) => setSelectedEntryTeamId(event.target.value)} className="field mt-1">{captainTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm"><span className="text-slate-400">Cuota definida por el torneo</span><strong className="text-emerald-400">${Number(selectedEntryTournament?.entryFee || 0).toFixed(2)} {selectedEntryTournament?.entryCurrency || 'USD'}</strong></div>
        {currentRegistration?.status === 'paid' ? <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 className="h-5 w-5"/>{currentRegistration.enrollmentStatus === 'confirmed' ? 'Pago e inscripción confirmados' : 'Pago completado'} para {currentRegistration.teamName}</div> : <>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[.06] p-4"><span className="text-xs font-bold text-white">Pago seguro</span>{stripePublishableKey ? <div ref={cardMountRef} className="mt-3 min-h-10 rounded-xl border border-white/10 bg-[#0c0d14] px-4 py-3"/> : <p className="mt-2 text-xs text-slate-400">Confirma para continuar con el pago.</p>}</div>
          <button disabled={isProcessing || !selectedEntryTournamentId || !selectedEntryTeamId || !stripePublishableKey || !stripeReady} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white disabled:opacity-50">{isProcessing ? 'Procesando...' : 'PAGAR INSCRIPCIÓN'}<ArrowRight className="h-4 w-4"/></button>
        </>}
        <p className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300">{registrationMessage}</p>
      </form>}
      <section className="rounded-3xl border border-white/10 bg-[#10121a] p-6"><h2 className="flex items-center gap-2 text-xl font-bold text-white"><Gift className="h-5 w-5 text-[#ff2e83]"/> Premios publicados</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{rewards.map((reward) => <article key={reward.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><strong className="text-sm text-white">{reward.name}</strong><p className="mt-2 text-xs text-emerald-400">{Math.max(0, reward.quantity - Number(reward.assignedQuantity))} disponibles</p></article>)}</div></section>
    </>}

    {isAuthenticated && canManage && session && <>
      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={processStripePayment} className="space-y-5 rounded-3xl border border-white/10 bg-[#10121a] p-6">
          <div><h2 className="text-2xl font-black text-white">Agregar aportación</h2><p className="mt-1 text-xs text-slate-400">Registra el apoyo de un patrocinador en la bolsa de premios.</p></div>
          <label className="block text-xs text-slate-300">Monto en USD<div className="relative mt-1"><DollarSign className="absolute left-3 top-3 h-4 w-4 text-emerald-400"/><input type="number" min="1" max="999999.99" step="0.01" required value={amountInput} onChange={(event) => setAmountInput(event.target.value)} className="field pl-9"/></div></label>
          <label className="block text-xs text-slate-300">Patrocinador<select required value={selectedSponsorId} onChange={(event) => { setSelectedSponsorId(event.target.value); setPayerName(sponsors.find((item) => item.id === event.target.value)?.name || 'Patrocinador'); }} className="field mt-1">{sponsors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[.06] p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-white">Pago seguro · Stripe Test</span><span className={`text-[10px] font-bold ${stripeReady && stripeCardComplete ? 'text-emerald-300' : stripeLoadError || stripeCardError ? 'text-amber-300' : 'text-blue-300'}`}>{stripeReady && stripeCardComplete ? 'LISTO' : stripeLoadError || stripeCardError ? 'REVISAR' : stripeReady ? 'COMPLETA LA TARJETA' : 'CARGANDO'}</span></div>{stripePublishableKey ? <div ref={cardMountRef} className="mt-3 min-h-12 rounded-xl border border-white/10 bg-[#0c0d14] px-4 py-3"/> : <p className="mt-3 text-xs text-slate-400">Cargando configuración de Stripe Test…</p>}<div className="mt-3 flex flex-col gap-1 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>Número · vencimiento MM/AA · CVC</span><span>Ejemplo: 4242 4242 4242 4242 · fecha futura · 123</span></div>{(stripeLoadError || stripeCardError) && <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[.07] p-3 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between"><span>{stripeLoadError || stripeCardError}</span>{stripeLoadError && <button type="button" onClick={() => setStripeReloadKey((value) => value + 1)} className="shrink-0 rounded-lg border border-amber-400/30 px-3 py-2 font-bold text-amber-100">REINTENTAR</button>}</div>}<p className="mt-3 text-[10px] text-slate-500">Usa únicamente tarjetas de prueba de Stripe. TournamentX no recibe ni almacena el número completo o el CVC.</p></div>
          <button disabled={isProcessing || !contributionIsReady} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff2e83]/60 bg-[#ff2e83] py-3 text-xs font-black tracking-wide text-white shadow-[0_10px_28px_rgba(255,46,131,.22)] hover:bg-[#ff4793] disabled:border-white/10 disabled:bg-white/[.05] disabled:text-slate-500 disabled:shadow-none">{isProcessing ? 'PROCESANDO...' : 'CONFIRMAR APORTACIÓN'}<ArrowRight className="h-4 w-4"/></button>
          <p className={`rounded-xl border px-3 py-2.5 text-xs ${contributionIsReady ? 'border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300' : 'border-amber-500/20 bg-amber-500/[.07] text-amber-200'}`}>{contributionHint}</p>
          {successTx && <button type="button" onClick={() => setSelectedReceipt(successTx)} className="flex w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>Aportación registrada</span><span>Ver comprobante</span></button>}
        </form>

        <section className="rounded-3xl border border-white/10 bg-[#10121a] p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-white">Aportaciones</h2><p className="mt-1 text-xs text-slate-400">Consulta pagos y devuelve aportaciones mientras la bolsa siga abierta.</p></div><span className="rounded-full bg-white/[.05] px-3 py-1 text-xs text-slate-400">{transactions.length}</span></div>
          <div className="mt-5 max-h-[390px] space-y-3 overflow-y-auto">{transactions.map((tx) => {
            const status = paymentStatuses[tx.id] || 'pending';
            return <article key={tx.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex justify-between gap-3"><div><strong className="text-xs text-white">{tx.payer}</strong><p className="mt-2 text-[10px] text-slate-500">{tx.date}</p></div><div className="text-right"><strong className="text-emerald-400">${tx.amountUSD.toLocaleString()}</strong><p className="mt-1 text-[10px] text-slate-400">{paymentStatusLabel[status] || status}</p></div></div><div className="mt-3 flex flex-wrap gap-3"><button onClick={() => setSelectedReceipt(tx)} className="flex items-center gap-1 text-[11px] text-[#ff2e83]"><FileText className="h-3.5 w-3.5"/>Ver comprobante</button>{status === 'paid' && poolDetails?.status === 'funding' && <button disabled={isProcessing} onClick={() => void refundContribution(tx.id)} className="text-[11px] font-bold text-amber-300 disabled:opacity-50">Reembolsar</button>}</div></article>;
          })}</div>
          <footer className="mt-5 border-t border-white/10 pt-4 text-xs text-slate-400">{poolDetails?.distributionRules.length ? poolDetails.distributionRules.map((rule) => `${rule.position}º ${rule.percentage}%`).join(' · ') : <button onClick={() => void configureDistribution()} disabled={!poolDetails?.fundedAmount} className="font-bold text-[#ff2e83] disabled:text-slate-600">DEFINIR REPARTO 60/25/15</button>}</footer>
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <article className="rounded-3xl border border-white/10 bg-[#10121a] p-6">
          <h2 className="text-xl font-bold text-white">Comisión de la plataforma</h2>
          <p className="mt-2 text-xs text-slate-400">Se descuenta al enviar cada premio.</p>
          {currentUserRole === 'Admin' ? <div className="mt-5 flex items-end gap-3"><label className="flex-1 text-xs text-slate-300">Porcentaje<input type="number" min="0" max="30" step="0.01" value={feeInput} onChange={(event) => setFeeInput(event.target.value)} className="field mt-1"/></label><button type="button" onClick={() => void savePlatformFee()} className="rounded-xl bg-[#ff2e83] px-4 py-3 text-xs font-bold text-white">GUARDAR</button></div> : <strong className="mt-5 block text-3xl text-white">{paymentSettings.platformFeePercentage}%</strong>}
        </article>
        <article className="rounded-3xl border border-white/10 bg-[#10121a] p-6">
          <h2 className="text-xl font-bold text-white">Resumen financiero</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Disponible', reconciliation?.available || 0],
              ['Reembolsado', reconciliation?.refunded || 0],
              ['Comisiones', reconciliation?.platformFees || 0],
              ['Premios enviados', reconciliation?.transferred || 0],
            ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-slate-500">{label}</p><strong className="mt-1 block text-sm text-white">${Number(value).toFixed(2)} {reconciliation?.currency || poolDetails?.currency}</strong></div>)}
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-slate-500">Pendientes</p><strong className="mt-1 block text-sm text-amber-300">{reconciliation?.pending || 0}</strong></div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-slate-500">Requieren atención</p><strong className="mt-1 block text-sm text-red-300">{reconciliation?.failed || 0}</strong></div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2"><article className="rounded-3xl border border-white/10 bg-[#10121a] p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold text-white"><Building2 className="h-5 w-5 text-[#ff2e83]"/>Patrocinadores</h2><button onClick={() => void addSponsor()} className="rounded-lg bg-[#ff2e83] px-3 py-2 text-xs font-bold text-white">+ AGREGAR</button></div><div className="mt-4 space-y-2">{sponsors.map((sponsor) => <div key={sponsor.id} className="rounded-xl border border-white/10 p-3"><strong className="text-sm text-white">{sponsor.name}</strong><p className="text-xs text-slate-500">{sponsor.contactEmail}</p></div>)}</div></article><article className="rounded-3xl border border-white/10 bg-[#10121a] p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold text-white"><Gift className="h-5 w-5 text-[#ff2e83]"/>Premios</h2><button onClick={() => void addReward()} className="rounded-lg bg-[#ff2e83] px-3 py-2 text-xs font-bold text-white">+ AGREGAR</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{rewards.map((reward) => <div key={reward.id} className="rounded-xl border border-white/10 p-3"><strong className="text-sm text-white">{reward.name}</strong><p className="text-xs text-emerald-400">{Math.max(0, reward.quantity - Number(reward.assignedQuantity))} disponibles</p></div>)}</div></article></section>

      <section className="rounded-3xl border border-white/10 bg-[#10121a] p-6">
        <h2 className="text-xl font-bold text-white">Premios y recibos</h2><p className="mt-1 text-xs text-slate-400">Los premios se envían a la cuenta del capitán que aparece en el resultado oficial.</p>
        <div className="mt-4 space-y-2">{poolDetails?.payouts.map((payout) => <div key={payout.id} className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center"><span className="text-sm text-white"><strong>{payout.position}º lugar · ${Number(payout.amount).toFixed(2)} {payout.currency}</strong><small className="mt-1 block text-[10px] text-slate-400">Comisión ${Number(payout.platformFeeAmount || 0).toFixed(2)} · Recibe ${Number(payout.netAmount ?? payout.amount).toFixed(2)}</small><small className={`mt-1 block text-[10px] ${payout.status === 'released' ? 'text-emerald-400' : payout.status === 'failed' ? 'text-red-300' : 'text-amber-300'}`}>{payout.status === 'released' ? 'Enviado' : payout.status === 'failed' ? 'Requiere otro intento' : 'En proceso'}</small></span>{payout.status === 'released' && <button onClick={() => void downloadReceipt(payout.receiptCode)} className="flex items-center gap-2 rounded-lg bg-[#ff2e83] px-3 py-2 text-xs font-bold text-white"><Download className="h-4 w-4"/>Recibo</button>}</div>)}</div>
        {nextRule && <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[.06] p-4 text-xs text-amber-200">{nextWinner ? 'El premio está reservado. Por seguridad, únicamente el capitán del equipo ganador puede cobrarlo desde su sesión.' : 'Finaliza el cuadro y registra el resultado oficial para identificar al capitán que podrá cobrar.'}</div>}
      </section>
    </>}

    {selectedReceipt && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141f] p-6"><h2 className="text-xl font-bold text-white">Comprobante Stripe</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Folio</dt><dd className="max-w-56 break-all text-right text-white">{selectedReceipt.uuid}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Monto</dt><dd className="text-emerald-400">${selectedReceipt.amountUSD.toLocaleString()} USD</dd></div><div className="flex justify-between"><dt className="text-slate-500">Pasarela</dt><dd className="text-white">Stripe</dd></div></dl><button onClick={() => setSelectedReceipt(null)} className="mt-6 w-full rounded-xl bg-white/10 py-2.5 text-sm text-white">Cerrar</button></section></div>}
    {claimReceipt && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><section className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#d6b15e]/30 bg-[#12141f] shadow-2xl"><header className="border-b border-white/10 bg-gradient-to-r from-[#d6b15e]/15 to-[#ff2e83]/10 p-6"><span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d6b15e]">TournamentX · pago simulado</span><h2 className="mt-2 text-2xl font-black text-white">Ficha de pago de premio</h2><p className="mt-1 text-xs text-emerald-300">Operación completada correctamente</p></header><dl className="space-y-3 p-6 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Folio</dt><dd className="break-all text-right font-mono text-white">{claimReceipt.payout.receiptCode}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Equipo ganador</dt><dd className="text-right font-bold text-white">{claimReceipt.team.name}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Tarjeta destino</dt><dd className="text-right font-bold text-white">{claimReceipt.payout.payoutMethod ? `${claimReceipt.payout.payoutMethod.brand.toUpperCase()} •••• ${claimReceipt.payout.payoutMethod.last4}` : 'Destino simulado'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Titular</dt><dd className="text-right text-white">{claimReceipt.payout.payoutMethod?.cardholderName || 'Capitán ganador'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Premio bruto</dt><dd className="text-right text-white">${Number(claimReceipt.payout.amount).toFixed(2)} {claimReceipt.payout.currency}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Comisión</dt><dd className="text-right text-slate-300">-${Number(claimReceipt.payout.platformFeeAmount || 0).toFixed(2)}</dd></div><div className="flex justify-between gap-4 border-t border-white/10 pt-3"><dt className="font-bold text-white">Total acreditado</dt><dd className="text-xl font-black text-[#d6b15e]">${Number(claimReceipt.payout.netAmount ?? claimReceipt.payout.amount).toFixed(2)} {claimReceipt.payout.currency}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Referencia</dt><dd className="break-all text-right font-mono text-xs text-slate-300">{claimReceipt.payout.providerReference}</dd></div></dl><footer className="flex flex-col gap-2 border-t border-white/10 p-6 sm:flex-row"><button type="button" onClick={() => void downloadReceipt(claimReceipt.payout.receiptCode)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff2e83] py-3 text-xs font-bold text-white"><Download className="h-4 w-4"/>DESCARGAR FICHA</button><button type="button" onClick={() => setClaimReceipt(null)} className="flex-1 rounded-xl bg-white/10 py-3 text-xs font-bold text-white">CERRAR</button></footer></section></div>}
  </div>;
}

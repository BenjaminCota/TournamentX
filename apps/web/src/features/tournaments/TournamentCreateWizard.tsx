import React, { useState } from 'react';
import { 
  Trophy, 
  ShieldCheck, 
  DollarSign, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  UploadCloud, 
  X
} from 'lucide-react';
import { Tournament, TournamentFormat } from '../../types';
import confetti from 'canvas-confetti';
import { notify } from '../../shared/feedback';

function localDateInputValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function nextDateInputValue(date: string) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return localDateInputValue(next);
}

const MAX_PRIZE_AMOUNT_USD = 1_000_000;
const MAX_TOURNAMENT_NAME_LENGTH = 60;
const MAX_TOURNAMENT_DESCRIPTION_LENGTH = 300;

interface WizardProps {
  onClose: () => void;
  onCreateTournament: (payload: Partial<Tournament>) => Promise<Tournament> | Tournament;
  onTournamentCreated: (newTour: Tournament) => void;
}

export const TournamentCreateWizard: React.FC<WizardProps> = ({
  onClose,
  onCreateTournament,
  onTournamentCreated
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [game, setGame] = useState('');
  const [gameCategory, setGameCategory] = useState<'FPS' | 'MOBA' | 'SPORTS' | 'FIGHTING' | 'TRADITIONAL'>('TRADITIONAL');
  const [format, setFormat] = useState<TournamentFormat | null>(null);
  const [maxTeams, setMaxTeams] = useState<number | null>(null);
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'PRIVATE' | null>(null);
  const [prizePool, setPrizePool] = useState('');
  const bannerUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80';
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const today = localDateInputValue();
  const prizeAmount = Number(prizePool.replace(/,/g, ''));
  const hasPrizeAmount = Number.isFinite(prizeAmount) && Number.isInteger(prizeAmount) && prizeAmount >= 1 && prizeAmount <= MAX_PRIZE_AMOUNT_USD;

  const steps = [
    { number: 1, title: 'Información General' },
    { number: 2, title: 'Deporte / Juego' },
    { number: 3, title: 'Formato y Llaves' },
    { number: 4, title: 'Participantes' },
    { number: 5, title: 'Reglas y Fair Play' },
    { number: 6, title: 'Calendario y Sede' },
    { number: 7, title: 'Premios' }
  ];

  const stepIssue = (step: number): string | null => {
    if (step === 1) {
      if (name.trim().length < 2) return 'Escribe un nombre de torneo de al menos 2 caracteres.';
      if (name.trim().length > MAX_TOURNAMENT_NAME_LENGTH) return `El nombre del torneo no puede superar ${MAX_TOURNAMENT_NAME_LENGTH} caracteres.`;
      if (description.trim().length < 2) return 'Agrega una descripción de al menos 2 caracteres.';
      if (privacy === null) return 'Selecciona si el torneo será público o privado.';
    }
    if (step === 2 && !game) return 'Selecciona un deporte o videojuego.';
    if (step === 3 && !format) return 'Selecciona el formato de competencia.';
    if (step === 4 && !maxTeams) return 'Selecciona la cantidad máxima de equipos.';
    if (step === 6) {
      if (!venue) return 'Selecciona la sede del torneo.';
      if (!startDate) return `Selecciona una fecha de inicio igual o posterior a hoy (${today}).`;
      if (startDate < today) return `La fecha de inicio debe ser igual o posterior a hoy (${today}).`;
      if (!endDate) return 'Selecciona una fecha de finalización.';
      if (endDate <= startDate) return 'La fecha de finalización debe ser posterior a la fecha de inicio.';
    }
    if (step === 7) {
      if (!prizePool) return 'Ingresa el monto total de premios.';
      if (!Number.isFinite(prizeAmount) || !Number.isInteger(prizeAmount)) return 'El premio debe ser un número entero en USD.';
      if (prizeAmount < 1 || prizeAmount > MAX_PRIZE_AMOUNT_USD) return `El premio debe estar entre $1 y $${MAX_PRIZE_AMOUNT_USD.toLocaleString('en-US')} USD.`;
    }
    return null;
  };

  const isStepComplete = (step: number) => stepIssue(step) === null;

  const canAccessStep = (step: number) => Array.from({ length: step - 1 }, (_, index) => isStepComplete(index + 1)).every(Boolean);

  const goToStep = (step: number) => {
    if (!canAccessStep(step)) {
      const blockedStep = Array.from({ length: step - 1 }, (_, index) => index + 1).find((previousStep) => !isStepComplete(previousStep));
      setSubmitError(blockedStep ? `Paso ${blockedStep}: ${stepIssue(blockedStep)}` : 'Completa los pasos anteriores antes de continuar.');
      return;
    }
    setSubmitError(null);
    setCurrentStep(step);
  };

  const handleFinish = async () => {
    if (!isStepComplete(7)) {
      setSubmitError(stepIssue(7));
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const created = await onCreateTournament({
        name,
        description,
        game,
        gameCategory,
        banner: bannerUrl,
        prizePool: `$${prizePool} USD`,
        prizeAmountUSD: prizeAmount,
        format: format!,
        dates: `${startDate} al ${endDate}`,
        startDate,
        endDate,
        maxTeams: maxTeams!,
        privacy: privacy!,
        organizer: 'TournamentX Pro Staff',
        tier: 'PRO CIRCUIT',
        venue
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      onTournamentCreated(created);
      notify('success', `Torneo "${created.name}" creado correctamente.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo crear el torneo. Intenta de nuevo.');
      notify('error', error instanceof Error ? error.message : 'No se pudo crear el torneo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="tournament-create-wizard-modal" className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/85 p-0 backdrop-blur-md sm:items-center sm:p-6">
      <div className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-[#232738] bg-[#0f111a] shadow-2xl animate-in zoom-in-95 duration-200 sm:max-h-[90vh] sm:rounded-3xl">
        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-[#1e2230] bg-[#131624] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff2e83]/20 border border-[#ff2e83]/40 flex items-center justify-center text-[#ff2e83]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white sm:text-2xl">
                CREADOR DE TORNEOS TOURNAMENTX
              </h2>
              <p className="text-xs text-slate-400 font-tech">
                Paso {currentStep} de 7: {steps[currentStep - 1].title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1f2438] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body: Left Stepper & Right Form */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 overflow-y-auto">
          {/* Stepper Sidebar (Image 17) */}
          <div className="p-6 bg-[#0c0d14] border-r border-[#1e2230] space-y-4 hidden md:block">
            <span className="text-[10px] font-mono-code uppercase font-bold tracking-widest text-slate-500">
              PASOS DE CONFIGURACIÓN
            </span>

            <div className="space-y-2">
              {steps.map((s) => {
                const isCurrent = s.number === currentStep;
                const isCompleted = s.number < currentStep && isStepComplete(s.number);
                return (
                  <div
                    key={s.number}
                    onClick={() => goToStep(s.number)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-[#ff2e83]/15 text-white border-l-4 border-[#ff2e83]'
                        : isCompleted
                        ? 'text-emerald-400 hover:bg-[#141724]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-[#ff2e83] text-white'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-[#181b28] text-slate-500'
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3" /> : s.number}
                    </div>
                    <span className="truncate">{s.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content Area (Image 17) */}
          <div className="md:col-span-3 p-6 sm:p-8 space-y-6">
            {/* STEP 1: INFORMACIÓN GENERAL (Image 17) */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Información Básica del Torneo
                </h3>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Nombre del Torneo *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={MAX_TOURNAMENT_NAME_LENGTH}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Valorant Masters Santiago 2026"
                    className="w-full bg-[#141724] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1.5"
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-500">{name.length}/{MAX_TOURNAMENT_NAME_LENGTH} caracteres</p>
                </div>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Descripción Oficial
                  </label>
                  <textarea
                    rows={3}
                    maxLength={MAX_TOURNAMENT_DESCRIPTION_LENGTH}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el propósito del torneo, reglas clave e incentivos..."
                    className="w-full bg-[#141724] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1.5"
                  ></textarea>
                  <p className="mt-1 text-right text-[10px] text-slate-500">{description.length}/{MAX_TOURNAMENT_DESCRIPTION_LENGTH} caracteres</p>
                </div>

                {/* Banner Upload Mock */}
                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Portada del Torneo
                  </label>
                  <div className="mt-1.5 p-6 rounded-2xl border-2 border-dashed border-[#282e44] hover:border-[#ff2e83] bg-[#12141f] text-center space-y-2 cursor-pointer transition-all">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">
                      Arrastra tu imagen de portada aquí o haz clic para subir
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono-code">
                      PNG, JPG, WEBP hasta 5MB (Recomendado 1920x1080)
                    </p>
                  </div>
                </div>

                {/* Privacy Radios (Image 17) */}
                <div className="space-y-2">
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Privacidad del Torneo
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setPrivacy('PUBLIC')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        privacy === 'PUBLIC'
                          ? 'bg-[#ff2e83]/10 border-[#ff2e83] text-white'
                          : 'bg-[#141724] border-[#1e2230] text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">Público</div>
                      <div className="text-[10px] text-slate-400 mt-1">Visible para toda la comunidad</div>
                    </div>

                    <div
                      onClick={() => setPrivacy('PRIVATE')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        privacy === 'PRIVATE'
                          ? 'bg-[#ff2e83]/10 border-[#ff2e83] text-white'
                          : 'bg-[#141724] border-[#1e2230] text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs">Privado</div>
                      <div className="text-[10px] text-slate-400 mt-1">Solo con código o invitación</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DEPORTE / JUEGO */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Selecciona el Videojuego o Disciplina
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Valorant', cat: 'FPS' },
                    { name: 'League of Legends', cat: 'MOBA' },
                    { name: 'Counter-Strike 2', cat: 'FPS' },
                    { name: 'Rocket League', cat: 'SPORTS' },
                    { name: 'Street Fighter 6', cat: 'FIGHTING' },
                    { name: 'Baloncesto 3x3', cat: 'TRADITIONAL' },
                    { name: 'Fútbol', cat: 'TRADITIONAL' }
                  ].map((g) => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => {
                        setGame(g.name);
                        setGameCategory(g.cat as any);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        game === g.name
                          ? 'bg-[#ff2e83]/15 border-[#ff2e83] text-white shadow-lg'
                          : 'bg-[#141724] border-[#1e2230] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[10px] font-mono-code text-[#ff2e83] font-bold">{g.cat}</div>
                      <div className="font-bold text-sm text-white mt-1">{g.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: FORMATO Y LLAVES */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Estructura y Algoritmo de Brackets
                </h3>

                <div className="space-y-3">
                  {[
                    { id: 'SINGLE_ELIMINATION', name: 'Eliminación Directa', desc: 'El perdedor de cada partida queda eliminado inmediatamente. Ideal para torneos rápidos y playoffs.' },
                    { id: 'DOUBLE_ELIMINATION', name: 'Doble Eliminación (Winners / Losers)', desc: 'Llave de ganadores y repesca para perdedores. Máxima justicia competitiva.' },
                    { id: 'GROUP_STAGE_PLAYOFFS', name: 'Fase de Grupos + Playoffs', desc: 'Fase inicial estilo Champions League seguida por eliminación directa.' },
                    { id: 'ROUND_ROBIN', name: 'Todos contra Todos (Round Robin)', desc: 'Cada equipo compite contra todos los integrantes del grupo.' }
                  ].map((fmt) => (
                    <div
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id as TournamentFormat)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        format === fmt.id
                          ? 'bg-[#ff2e83]/10 border-[#ff2e83] text-white'
                          : 'bg-[#141724] border-[#1e2230] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{fmt.name}</div>
                      <div className="text-xs text-slate-400 mt-1 leading-snug">{fmt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: PARTICIPANTES */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Límite de Cupos y Requisitos
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {[8, 16, 32, 64, 128].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setMaxTeams(count)}
                      className={`p-4 rounded-2xl border font-mono-code text-center font-bold text-lg transition-all ${
                        maxTeams === count
                          ? 'bg-[#ff2e83] text-white border-[#ff2e83]'
                          : 'bg-[#141724] border-[#1e2230] text-slate-300'
                      }`}
                    >
                      {count} Equipos
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: REGLAS */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Reglas de Enfrentamiento & Fair Play
                </h3>
                <div className="p-4 rounded-2xl bg-[#141724] border border-[#1e2230] space-y-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Anti-Cheat oficial requerido para todos los jugadores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Check-in obligatorio 15 minutos antes de la partida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Los resultados se revisarán antes de publicarse</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: CALENDARIO & SEDES */}
            {currentStep === 6 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Fechas y Sede Presencial
                </h3>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Sede / Arena Presencial
                  </label>
                  <select
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-[#141724] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1.5"
                  >
                    <option value="">Selecciona una sede</option>
                    <option value="Movistar GameClub Santiago">Movistar GameClub Santiago (Chile)</option>
                    <option value="Arena CDMX Esports Dome">Arena CDMX Esports Dome (México)</option>
                    <option value="Geek Lounge & Arena BA">Geek Lounge & Arena BA (Argentina)</option>
                    <option value="Coliseo Medplus Gaming Arena">Coliseo Medplus Gaming Arena (Colombia)</option>
                    <option value="Online (Servidores Dedicados)">Online (Servidores Dedicados)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(e) => {
                      const nextStartDate = e.target.value;
                      setStartDate(nextStartDate);
                      if (endDate && endDate <= nextStartDate) setEndDate('');
                    }}
                    className="w-full bg-[#141724] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1.5"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Debe ser hoy ({today}) o una fecha posterior.</p>
                </div>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Fecha de finalización
                  </label>
                  <input
                    type="date"
                    min={startDate ? nextDateInputValue(startDate) : ''}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!startDate}
                    className="w-full bg-[#141724] border border-[#232738] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Debe ser posterior a la fecha de inicio.</p>
                </div>
              </div>
            )}

            {/* STEP 7: PREMIOS & ESCROW */}
            {currentStep === 7 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h3 className="text-xl font-semibold text-white">
                  Bolsa de premios
                </h3>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Monto Total de Premios (USD)
                  </label>
                  <div className="relative mt-1.5">
                    <DollarSign className="w-5 h-5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="1"
                      max={MAX_PRIZE_AMOUNT_USD}
                      step="1"
                      value={prizePool}
                      onChange={(e) => setPrizePool(e.target.value)}
                      placeholder="Ej. 25000"
                      className="w-full bg-[#141724] border border-[#232738] rounded-xl pl-10 pr-4 py-3 text-lg font-mono-code font-bold text-white focus:border-[#ff2e83] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Monto permitido: de $1 a ${MAX_PRIZE_AMOUNT_USD.toLocaleString('en-US')} USD, sin decimales.</p>
                </div>

                <div className={`p-4 rounded-2xl bg-[#141724] border text-xs text-slate-300 space-y-2 ${hasPrizeAmount ? 'border-emerald-500/30' : 'border-[#1e2230]'}`}>
                  <div className={`font-bold flex items-center gap-2 ${hasPrizeAmount ? 'text-emerald-400' : 'text-slate-400'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{hasPrizeAmount ? 'Bolsa de premios configurada' : 'Ingresa el monto de premios'}</span>
                  </div>
                  <p className="text-slate-400">
                    {hasPrizeAmount
                      ? 'El monto se registrará al publicar el torneo.'
                      : 'La bolsa se habilitará cuando captures un monto mayor a $0.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1e2230] bg-[#131624] p-4 sm:flex-nowrap sm:gap-4 sm:p-6">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => goToStep(Math.max(1, currentStep - 1))}
            className="flex items-center gap-2 rounded-xl border border-[#232738] px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 sm:px-5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ANTERIOR</span>
          </button>

          {submitError && (
            <span className="text-xs font-semibold text-red-400 text-right flex-1">{submitError}</span>
          )}

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={() => {
                const issue = stepIssue(currentStep);
                if (issue) {
                  setSubmitError(issue);
                  return;
                }
                goToStep(Math.min(7, currentStep + 1));
              }}
              className="flex max-w-[70%] items-center gap-2 rounded-xl bg-[#ff2e83] px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-[#ff2e83]/30 hover:bg-[#e11d48] sm:max-w-none sm:px-6 cursor-pointer"
            >
              <span className="truncate">SIGUIENTE: {steps[currentStep].title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinish}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Trophy className="w-4 h-4" />
              <span>{isSubmitting ? 'PUBLICANDO…' : 'PUBLICAR Y ACTIVAR TORNEO'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

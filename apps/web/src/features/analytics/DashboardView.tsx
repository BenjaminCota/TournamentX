import React, { useEffect, useMemo, useState } from 'react';
import { 
  Flame, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Radio, 
  Activity,
  Calendar
} from 'lucide-react';
import { TabId } from '../shell/Sidebar';
import { Team, Tournament, TournamentMatch } from '../../types';
import { tournamentXApi } from '../../services/apiClient';

interface DashboardViewProps {
  onNavigate: (tab: TabId, targetId?: string) => void;
  onOpenCreateWizard: () => void;
  teams: Team[];
  tournaments: Tournament[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenCreateWizard, teams, tournaments
}) => {
  const [rankingFilter, setRankingFilter] = useState<'REGIONAL' | 'GLOBAL'>('REGIONAL');

  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  useEffect(() => { tournamentXApi.matches().then(setMatches).catch(() => setMatches([])); }, []);
  const topTeams = useMemo(() => [...teams].sort((a, b) => b.points - a.points).slice(0, 5), [teams]);
  const featuredMatch = matches.find((match) => match.status === 'live') || matches[0];
  const completedMatches = matches.filter((match) => match.status === 'completed').length;
  const completionRate = matches.length ? Math.round(completedMatches / matches.length * 100) : 0;
  const teamName = (id?: string) => teams.find((team) => team.id === id)?.name || id || 'Por definir';
  const teamTag = (id?: string) => teams.find((team) => team.id === id)?.tag || teamName(id).slice(0, 3).toUpperCase();

  const upcomingMatches = matches.filter((match) => ['scheduled', 'postponed'].includes(match.status)).slice(0, 4).map((match) => ({ id: match.id, group: `${match.roundId || 'Ronda'} • ${match.mode.replaceAll('_', ' ').toUpperCase()}`, team1: teamName(match.team1Id), team2: teamName(match.team2Id), time: new Date(match.scheduledAt).toLocaleString(), game: tournaments.find((item) => item.id === match.tournamentId)?.game || 'Competencia' }));

  return (
    <div id="dashboard-view-main" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-tight italic">
            CENTRO DE MANDO PRO
          </h1>
          <p className="text-xs text-slate-400 font-tech">
            Monitoreo en tiempo real de torneos, enfrentamientos y clasificaciones
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('tournaments')}
            className="px-4 py-2 rounded-xl bg-[#141724] border border-[#1e2230] text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer font-tech"
          >
            Ver Cuadros & Brackets
          </button>
          <button
            onClick={onOpenCreateWizard}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white text-xs font-bold tracking-wide shadow-md shadow-[#ff2e83]/20 hover:scale-105 transition-all cursor-pointer font-tech"
          >
            ＋ CREAR TORNEO
          </button>
        </div>
      </div>

      <section aria-label="Indicadores operativos" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Torneos activos', value: tournaments.filter((item) => ['OPEN', 'IN_PROGRESS', 'UPCOMING'].includes(item.status)).length, detail: `${tournaments.length} en total`, icon: Trophy, tone: 'text-[#ff69a8]' },
          { label: 'Partidos en vivo', value: matches.filter((match) => match.status === 'live').length, detail: `${matches.length} registrados`, icon: Radio, tone: 'text-red-400' },
          { label: 'Avance de jornada', value: `${completionRate}%`, detail: `${completedMatches} finalizados`, icon: Activity, tone: 'text-emerald-400' },
        ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="surface rounded-2xl p-4 flex items-center gap-4">
          <span className={`grid h-10 w-10 place-items-center rounded-xl bg-white/[.04] ${tone}`}><Icon className="w-5 h-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><strong className="block mt-0.5 text-2xl text-white">{value}</strong><small className="text-[11px] text-slate-500">{detail}</small></div>
        </article>)}
      </section>

      {/* HERO MATCH STATUS CARD (Image 5) */}
      <div 
        id="hero-live-match-card"
        className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#171926] via-[#12141f] to-[#1a1524] border border-[#ff2e83]/40 p-6 sm:p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff2e83]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono-code font-bold text-xs flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                {featuredMatch?.status === 'live' ? 'EN VIVO' : featuredMatch?.status === 'completed' ? 'FINALIZADO' : 'PRÓXIMO PARTIDO'}
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                TIEMPO: <strong className="text-white">67:32</strong>
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                ESPECTADORES: <strong className="text-[#ff2e83]">124K</strong>
              </span>
            </div>

            {/* Matchup Header */}
            <div className="flex items-center gap-6 sm:gap-10">
              {/* Team 1 */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-3xl text-white shadow-inner">
                  {teamTag(featuredMatch?.team1Id)}
                </div>
                <div>
                  <div className="text-[11px] font-tech text-[#ff2e83] font-bold">#1 SEED</div>
                  <h3 className="font-brand font-black text-2xl xl:text-3xl text-white uppercase tracking-tight max-w-56 leading-none">
                    {teamName(featuredMatch?.team1Id)}
                  </h3>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0b0c12] border border-[#23273b] shadow-inner">
                <span className="font-brand font-black text-4xl sm:text-5xl text-white">{featuredMatch?.score.team1 ?? 0}</span>
                <span className="text-slate-600 font-bold text-2xl">:</span>
                <span className="font-brand font-black text-4xl sm:text-5xl text-[#ff2e83]">{featuredMatch?.score.team2 ?? 0}</span>
              </div>

              {/* Team 2 */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[11px] font-tech text-slate-400 font-bold text-right">#4 SEED</div>
                  <h3 className="font-brand font-black text-2xl xl:text-3xl text-white uppercase tracking-tight max-w-56 text-right leading-none">
                    {teamName(featuredMatch?.team2Id)}
                  </h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-3xl text-white shadow-inner">
                  {teamTag(featuredMatch?.team2Id)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
            <button
              id="btn-dashboard-watch-stream"
              onClick={() => onNavigate('live_match')}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer font-tech"
            >
              <Flame className="w-4 h-4" />
              <span>VER TRANSMISIÓN</span>
            </button>
            <button
              onClick={() => onNavigate('tournaments')}
              className="px-6 py-3.5 rounded-xl bg-[#181b28] hover:bg-[#202435] text-slate-300 hover:text-white border border-[#282d42] font-semibold text-xs tracking-wide transition-all text-center cursor-pointer font-tech"
            >
              Estadísticas del Bracket
            </button>
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Torneos Activos & Próximos Partidos */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION: TORNEOS ACTIVOS (Image 5) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#ff2e83]" />
                TORNEOS ACTIVOS
              </h2>
              <button
                onClick={() => onNavigate('tournaments')}
                className="text-xs font-bold text-[#ff2e83] hover:underline flex items-center gap-1 cursor-pointer"
              >
                VER TODOS →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tournaments.filter((item) => ['OPEN', 'IN_PROGRESS', 'UPCOMING'].includes(item.status)).slice(0, 2).map((tournament) => <div key={tournament.id} onClick={() => onNavigate('tournaments')} className="p-5 rounded-2xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83]/60 transition-all cursor-pointer group flex flex-col justify-between"><div className="space-y-2"><div className="flex items-center justify-between"><span className="px-2 py-0.5 rounded bg-[#ff2e83]/15 text-[#ff69a8] font-bold text-[10px]">{tournament.tier}</span><span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">{tournament.status}</span></div><h3 className="font-display font-bold text-lg text-white group-hover:text-[#ff2e83]">{tournament.name}</h3><p className="text-xs text-slate-400">{tournament.registeredTeams}/{tournament.maxTeams} inscritos · {tournament.format.replaceAll('_', ' ')}</p></div><div className="mt-4 pt-3 border-t border-[#1e2230] flex items-center justify-between text-xs"><span className="text-slate-400">Premio:</span><span className="font-bold text-emerald-400">{tournament.prizePool || `$${tournament.prizeAmountUSD.toLocaleString()} USD`}</span></div></div>)}
              {tournaments.length === 0 && <div className="sm:col-span-2 p-8 rounded-2xl border border-dashed border-white/10 text-center text-sm text-slate-500">Crea tu primer torneo para verlo aquí.</div>}
            </div>
          </div>

          {/* SECTION: PRÓXIMOS PARTIDOS (Image 5) */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              PRÓXIMOS PARTIDOS
            </h2>

            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-[#10121a] border border-[#1e2230] hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#161926] text-[11px] font-mono-code text-slate-300 font-bold">
                      {m.group}
                    </span>
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <span>{m.team1}</span>
                      <span className="text-slate-500 font-mono-code text-xs">vs</span>
                      <span>{m.team2}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {m.time}
                    </span>
                    <button 
                      onClick={() => onNavigate('live_match')}
                      className="px-3 py-1 rounded-lg bg-[#181b28] hover:bg-[#ff2e83] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Recordatorio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Leaderboard & Métricas */}
        <div className="space-y-8">
          {/* SECTION: TOP 5 EQUIPOS (Image 5) */}
          <div className="p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
                TOP 5 EQUIPOS
              </h2>
              {/* Regional vs Global Toggle (Image 5) */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#181b28] border border-[#232738] text-[10px] font-bold">
                <button
                  onClick={() => setRankingFilter('GLOBAL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rankingFilter === 'GLOBAL'
                      ? 'bg-[#ff2e83] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  GLOBAL
                </button>
                <button
                  onClick={() => setRankingFilter('REGIONAL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rankingFilter === 'REGIONAL'
                      ? 'bg-[#ff2e83] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  REGIONAL (LATAM)
                </button>
              </div>
            </div>

            {/* Top 5 Table List (Image 5) */}
            <div className="space-y-2.5">
              {topTeams.map((team, idx) => {
                const rankNumber = idx + 1;
                return (
                  <div
                    key={team.id}
                    onClick={() => onNavigate('team_detail', team.id)}
                    className="p-3 rounded-xl bg-[#141724] hover:bg-[#1c2033] border border-[#1e2230] hover:border-[#ff2e83]/40 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-display font-black text-base ${
                        rankNumber === 1 ? 'text-amber-400' : rankNumber === 2 ? 'text-slate-300' : rankNumber === 3 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {rankNumber}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white hover:text-[#ff2e83] transition-colors">
                          {team.name}
                        </h4>
                        <div className="text-[10px] font-mono-code text-slate-400">
                          {team.record.wins}-{team.record.losses} • {team.points} pts
                        </div>
                      </div>
                    </div>

                    <div>
                      {team.trend === 'UP' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                      {team.trend === 'DOWN' && <TrendingDown className="w-4 h-4 text-red-400" />}
                      {team.trend === 'EQUAL' && <Minus className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onNavigate('teams')}
              className="w-full py-2 rounded-xl bg-[#181b28] hover:bg-[#202435] text-slate-300 text-xs font-semibold tracking-wide transition-colors text-center block cursor-pointer"
            >
              Ver Clasificación Completa →
            </button>
          </div>

          {/* SECTION: MÉTRICAS (Image 5) */}
          <div className="p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-6">
            <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ff2e83]" />
              MÉTRICAS GENERALES
            </h2>

            {/* Metric 1: Inscripciones Activas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Inscripciones Activas</span>
                <span className="text-xs text-emerald-400 font-bold">Datos actuales</span>
              </div>
              <div className="font-display font-black text-3xl text-white">
                {tournaments.reduce((sum, item) => sum + item.registeredTeams, 0)}
              </div>

              {/* Sparkline Weekly Bars */}
              <div className="flex items-end gap-1.5 h-12 pt-2">
                {[35, 45, 60, 50, 75, 90, 100].map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${val}%` }}
                    className={`flex-1 rounded-t transition-all ${
                      i === 6 ? 'bg-[#ff2e83]' : 'bg-[#232738] hover:bg-[#343a52]'
                    }`}
                  ></div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-mono-code text-slate-500">
                <span>LUN</span>
                <span>MIE</span>
                <span>VIE</span>
                <span>DOM</span>
              </div>
            </div>

            {/* Metric 2: Partidos Jugados */}
            <div className="pt-4 border-t border-[#1e2230] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Partidos Jugados</span>
                <span className="text-xs text-slate-400 font-mono-code">Temp. Actual</span>
              </div>
              <div className="font-display font-black text-3xl text-white">
                {completedMatches}
              </div>
              <div className="w-full bg-[#1e2230] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-[#ff2e83] h-full rounded-full" style={{ width: `${completionRate}%` }}></div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono-code text-right">
                {completionRate}% del calendario completado
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

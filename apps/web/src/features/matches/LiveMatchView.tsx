import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Swords, 
  Plus,
  Minus,
  ClipboardCheck,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import { MOCK_LIVE_MATCH } from '../../data/mockData';
import { MatchWorkflow, Team, TournamentMatch, UserRole } from '../../types';
import { tournamentXApi } from '../../services/apiClient';
import { io } from 'socket.io-client';

interface LiveMatchViewProps {
  currentUserRole: UserRole;
  currentUserId?: string;
  matchId?: string;
}

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({ currentUserRole, currentUserId, matchId }) => {
  const [matchData] = useState(MOCK_LIVE_MATCH);
  const [apiMatch, setApiMatch] = useState<TournamentMatch | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [scoreError, setScoreError] = useState('');
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [seconds, setSeconds] = useState(45 * 60 + 12);
  const [feed, setFeed] = useState(matchData.killFeed);
  const [workflow, setWorkflow] = useState<MatchWorkflow | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('https://example.test/evidencias/resultado.png');
  const [reportedScore, setReportedScore] = useState({ team1: 0, team2: 0 });
  const [workflowMessage, setWorkflowMessage] = useState('');

  const canControlScore = (currentUserRole === 'Admin' || currentUserRole === 'Organizador' || currentUserRole === 'Árbitro')
    && Boolean(apiMatch) && !['completed', 'cancelled'].includes(apiMatch.status);

  useEffect(() => {
    let active = true;
    const loadMatch = async () => {
      try {
        setIsLoadingMatch(true);
        setScoreError('');
        const selected = matchId
          ? await tournamentXApi.match(matchId)
          : (await tournamentXApi.matches() as TournamentMatch[]).find((match) => match.status === 'live') || null;
        const nextTeams = await tournamentXApi.teams();
        if (active) {
          setApiMatch(selected as TournamentMatch | null);
          setTeams(Array.isArray(nextTeams) ? nextTeams as Team[] : []);
          if (selected && localStorage.getItem('tournamentx_token')) {
            tournamentXApi.matchWorkflow(selected.id).then((value) => { if (active) setWorkflow(value); }).catch(() => undefined);
          }
        }
      } catch {
        if (active) setScoreError('No fue posible cargar el partido desde la API.');
      } finally {
        if (active) setIsLoadingMatch(false);
      }
    };
    loadMatch();
    return () => { active = false; };
  }, [matchId]);

  useEffect(() => {
    if (!apiMatch?.id) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000');
    socket.emit('subscribe-match', apiMatch.id);
    socket.on('match-update', (updatedMatch: TournamentMatch) => {
      if (updatedMatch.id === apiMatch.id) setApiMatch(updatedMatch);
    });
    socket.on('match-workflow-update', () => {
      tournamentXApi.matchWorkflow(apiMatch.id).then(setWorkflow).catch(() => undefined);
    });
    return () => {
      socket.emit('unsubscribe-match', apiMatch.id);
      socket.disconnect();
    };
  }, [apiMatch?.id]);

  const teamName = (teamId: string | undefined, fallback: string) => teams.find((team) => team.id === teamId)?.name || teamId || fallback;
  const captainTeamId = apiMatch && currentUserId
    ? teams.find((team) => team.captainUserId === currentUserId && [apiMatch.team1Id, apiMatch.team2Id].includes(team.id))?.id
    : undefined;
  const canReviewReports = currentUserRole === 'Admin' || currentUserRole === 'Organizador';
  const confirmedTeams = new Set(workflow?.checkIns.filter((entry) => entry.status === 'CONFIRMED').map((entry) => entry.teamId) || []);

  const refreshWorkflow = async () => {
    if (!apiMatch) return;
    const next = await tournamentXApi.matchWorkflow(apiMatch.id);
    setWorkflow(next); setApiMatch(next.match);
  };

  const handleCheckIn = async () => {
    if (!apiMatch || !captainTeamId) return;
    try { await tournamentXApi.checkInMatch(apiMatch.id, captainTeamId); await refreshWorkflow(); setWorkflowMessage('Check-in confirmado.'); }
    catch (error) { setWorkflowMessage(error instanceof Error ? error.message : 'No se pudo confirmar el check-in'); }
  };

  const handleReport = async () => {
    if (!apiMatch || !captainTeamId) return;
    try {
      await tournamentXApi.reportMatchResult(apiMatch.id, { teamId: captainTeamId, team1Score: reportedScore.team1, team2Score: reportedScore.team2, evidenceUrl });
      await refreshWorkflow(); setWorkflowMessage('Resultado enviado al organizador para revisión.');
    } catch (error) { setWorkflowMessage(error instanceof Error ? error.message : 'No se pudo enviar el resultado'); }
  };

  const handleDecision = async (reportId: string, decision: 'approve' | 'reject') => {
    if (!apiMatch) return;
    try { await tournamentXApi.decideMatchReport(apiMatch.id, reportId, decision, decision === 'approve' ? 'Evidencia revisada' : 'La evidencia no coincide'); await refreshWorkflow(); setWorkflowMessage(decision === 'approve' ? 'Resultado oficial aprobado y sincronizado.' : 'Reporte rechazado.'); }
    catch (error) { setWorkflowMessage(error instanceof Error ? error.message : 'No se pudo revisar el reporte'); }
  };

  const handleDispute = async () => {
    if (!apiMatch || !captainTeamId) return;
    const reason = window.prompt('Explica el motivo de la disputa');
    if (!reason) return;
    try { await tournamentXApi.disputeMatch(apiMatch.id, { teamId: captainTeamId, reason, evidenceUrl }); await refreshWorkflow(); setWorkflowMessage('Disputa enviada al organizador.'); }
    catch (error) { setWorkflowMessage(error instanceof Error ? error.message : 'No se pudo abrir la disputa'); }
  };

  // Live timer simulator
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Periodic random kill feed simulator
  useEffect(() => {
    if (!isPlaying) return;
    const killInterval = setInterval(() => {
      const killers = ['Nova.Zero', 'Nova.Apex', 'Raven.Night', 'Raven.Shadow', 'Nova.Pulse'];
      const victims = ['Raven.Kage', 'Nova.Echo', 'Raven.Claw', 'Nova.Vortex', 'Raven.Viper'];
      const weapons = ['Vandal', 'Phantom', 'Operator', 'Sheriff', 'Spectre'];
      const icons: ('sword' | 'crosshair' | 'gear' | 'skull')[] = ['sword', 'crosshair', 'skull'];

      const randomKiller = killers[Math.floor(Math.random() * killers.length)];
      const randomVictim = victims[Math.floor(Math.random() * victims.length)];
      const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
      const randomIcon = icons[Math.floor(Math.random() * icons.length)];

      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      const formattedTime = `${min}:${sec < 10 ? '0' : ''}${sec}`;

      const newEvent = {
        id: `kf-${Date.now()}`,
        killer: randomKiller,
        weapon: randomWeapon,
        iconType: randomIcon,
        victim: randomVictim,
        time: formattedTime
      };

      setFeed(prev => [newEvent, ...prev.slice(0, 6)]);
    }, 8000);

    return () => clearInterval(killInterval);
  }, [isPlaying, seconds]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAdjustScore = async (team: 1 | 2, delta: number) => {
    if (!apiMatch || isSavingScore) return;
    const score = {
      team1Score: team === 1 ? Math.max(0, apiMatch.score.team1 + delta) : apiMatch.score.team1,
      team2Score: team === 2 ? Math.max(0, apiMatch.score.team2 + delta) : apiMatch.score.team2,
      status: apiMatch.status === 'scheduled' ? 'live' : apiMatch.status,
    };
    try {
      setIsSavingScore(true);
      setScoreError('');
      const updated = await tournamentXApi.updateMatchScore(apiMatch.id, score, import.meta.env.VITE_MATCH_TOKEN);
      setApiMatch(updated as TournamentMatch);
    } catch {
      setScoreError('No fue posible actualizar el marcador. Inicia sesión con un JWT de árbitro u organizador.');
    } finally {
      setIsSavingScore(false);
    }
  };

  return (
    <div id="live-match-room-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* MATCH HEADER (Image 9) */}
      <div className="rounded-3xl bg-gradient-to-r from-[#171926] via-[#12141f] to-[#1a1524] border border-[#ff2e83]/40 p-6 lg:p-8 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono-code font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              ● {apiMatch?.status === 'live' ? 'EN VIVO' : (apiMatch?.status || 'CARGANDO').toUpperCase()} | {apiMatch?.roundId || 'Partido'}
            </span>
            <span className="text-xs font-mono-code text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
              {apiMatch?.mode || matchData.bestOf}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-code text-slate-400">
            <span>TIEMPO: <strong className="text-white">{formatTimer(seconds)}</strong></span>
            <span>AUDIENCIA: <strong className="text-[#ff2e83]">{matchData.viewers}</strong></span>
          </div>
        </div>

        {/* Big Teams Scoreboard (Image 9) */}
        <div className="flex items-center justify-between pt-2">
          {/* Team 1: NOVA */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-2xl text-white shadow-inner">
              NOVA
            </div>
            <div>
              <div className="text-[11px] font-tech text-[#ff2e83] font-bold uppercase tracking-wider">EQUIPO 1</div>
              <h2 className="font-brand font-black text-3xl sm:text-5xl text-white uppercase tracking-tight italic">
                {teamName(apiMatch?.team1Id, matchData.team1.name)}
              </h2>
            </div>
          </div>

          {/* Central Score Block with Scorekeeper Buttons */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-[#0b0c12] border border-[#23273b] shadow-2xl">
              {canControlScore && (
                <button
                  disabled={isSavingScore}
                  onClick={() => handleAdjustScore(1, -1)}
                  className="p-1 rounded bg-[#1e2230] text-slate-400 hover:text-white"
                  title="Restar punto Nova"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}

              <span className="font-brand font-black text-5xl sm:text-6xl text-white">
                {apiMatch?.score.team1 ?? matchData.team1.score}
              </span>

              <span className="font-tech text-xs font-bold text-slate-500 px-1 uppercase">
                {apiMatch?.mode || matchData.bestOf}
              </span>

              <span className="font-brand font-black text-5xl sm:text-6xl text-[#ff2e83]">
                {apiMatch?.score.team2 ?? matchData.team2.score}
              </span>

              {canControlScore && (
                <button
                  disabled={isSavingScore}
                  onClick={() => handleAdjustScore(2, 1)}
                  className="p-1 rounded bg-[#1e2230] text-slate-400 hover:text-white"
                  title="Sumar punto Raven"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {canControlScore && (
              <span className="text-[10px] font-tech text-amber-400 uppercase tracking-wider">
                Control de Árbitro Activo
              </span>
            )}
          </div>

          {/* Team 2: RAVEN */}
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-[11px] font-tech text-slate-400 font-bold uppercase tracking-wider">EQUIPO 2</div>
              <h2 className="font-brand font-black text-3xl sm:text-5xl text-white uppercase tracking-tight italic">
                {teamName(apiMatch?.team2Id, matchData.team2.name)}
              </h2>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-2xl text-white shadow-inner">
              RVN
            </div>
          </div>
        </div>
      </div>

      {isLoadingMatch && <p className="rounded-xl border border-[#252a3d] bg-[#11131c] p-4 text-sm text-slate-400">Cargando datos del partido…</p>}
      {scoreError && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{scoreError}</p>}

      {apiMatch && (captainTeamId || canReviewReports) && <section className="rounded-3xl border border-[#ff2e83]/25 bg-[#10121a] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-white"><ClipboardCheck className="h-5 w-5 text-[#ff2e83]"/> Flujo oficial por rol</h2><p className="mt-1 text-xs text-slate-400">Check-in del capitán, evidencia y aprobación conectada con bracket, alertas y premios.</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{confirmedTeams.size}/2 equipos listos</span></div>
        {captainTeamId && <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto]">
          <button onClick={() => void handleCheckIn()} disabled={confirmedTeams.has(captainTeamId) || apiMatch.status === 'completed'} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{confirmedTeams.has(captainTeamId) ? 'CHECK-IN CONFIRMADO' : 'HACER CHECK-IN'}</button>
          <div className="grid grid-cols-[80px_80px_1fr] gap-2"><input type="number" min={0} value={reportedScore.team1} onChange={(event) => setReportedScore((current) => ({ ...current, team1: Number(event.target.value) }))} className="field" aria-label="Marcador equipo 1"/><input type="number" min={0} value={reportedScore.team2} onChange={(event) => setReportedScore((current) => ({ ...current, team2: Number(event.target.value) }))} className="field" aria-label="Marcador equipo 2"/><input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} className="field" placeholder="URL de la captura de evidencia"/></div>
          <div className="flex gap-2"><button onClick={() => void handleReport()} disabled={confirmedTeams.size < 2 || apiMatch.status !== 'live'} className="rounded-xl bg-[#ff2e83] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><FileCheck2 className="mr-1 inline h-4 w-4"/> REPORTAR</button><button onClick={() => void handleDispute()} className="rounded-xl border border-amber-500/30 px-3 py-2.5 text-xs font-bold text-amber-300"><AlertTriangle className="h-4 w-4"/></button></div>
        </div>}
        {canReviewReports && workflow?.reports.filter((report) => report.status === 'PENDING_REVIEW').map((report) => <div key={report.id} className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[.06] p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-sm text-white">Marcador propuesto: {report.team1Score} - {report.team2Score}</strong><a href={report.evidenceUrl} target="_blank" rel="noreferrer" className="ml-3 text-xs text-[#ff69a8] underline">Ver evidencia</a></div><div className="flex gap-2"><button onClick={() => void handleDecision(report.id, 'reject')} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">Rechazar</button><button onClick={() => void handleDecision(report.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Aprobar resultado</button></div></div>)}
        {workflowMessage && <p className="text-xs text-slate-300">{workflowMessage}</p>}
      </section>}

      {/* 2-COLUMN: STREAM PLAYER & LIVE KILL FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Video Stream Stage */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-black border border-[#1e2230] shadow-2xl aspect-video group">
            {/* Stream Image / Canvas Simulation */}
            <img
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&auto=format&fit=crop&q=80"
              alt="Cyber Stage Sector 7"
              className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
            />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

            {/* Top Stream Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-red-600 font-mono-code font-bold text-xs text-white">
                LIVE 1080p60
              </span>
              <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-xs font-mono-code text-slate-300">
                SERVER US-EAST #1
              </span>
            </div>

            {/* Stream Play/Pause Big Center Overlay */}
            {!isPlaying && (
              <div 
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full bg-[#ff2e83] flex items-center justify-center text-white shadow-2xl shadow-[#ff2e83]/60 hover:scale-110 transition-all">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
              </div>
            )}

            {/* Bottom Stream Player Control Bar */}
            <div className="absolute bottom-4 left-4 right-4 bg-[#0d0e14]/90 backdrop-blur-md border border-[#232738] rounded-2xl px-4 py-2.5 flex items-center justify-between text-slate-300 text-xs">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-[#ff2e83]" /> : <Play className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono-code text-xs text-slate-400">
                  {formatTimer(seconds)} / 90:00
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono-code text-[11px] text-[#ff2e83] font-bold">
                  PRO AUDIO 5.1
                </span>
                <Maximize className="w-4 h-4 hover:text-white cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Kill Feed & Match Events (Image 9) */}
        <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
              <h3 className="font-display font-bold text-base text-white uppercase flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#ff2e83]" />
                FEED DE ACCIÓN EN VIVO
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>

            {/* Feed List */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
              {feed.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-[#141724] border border-[#1e2230] flex items-center justify-between text-xs animate-in fade-in slide-in-from-right-3 duration-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{item.killer}</span>
                    <span className="text-[10px] font-mono-code text-slate-500 bg-[#1f2438] px-1.5 py-0.5 rounded">
                      {item.weapon}
                    </span>
                    <span className="text-[#ff2e83] font-bold">⚔️</span>
                    <span className="text-slate-400 text-xs line-through">{item.victim}</span>
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-500">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1e2230] text-[11px] font-mono-code text-slate-500 flex items-center justify-between">
            <span>Servidor: Riot Direct Connect</span>
            <span className="text-emerald-400">Ping: 14ms</span>
          </div>
        </div>
      </div>

      {/* ROSTER PLAYER KDA STATS TABLE (Image 9) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Nova Stats */}
        <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
            <h3 className="font-display font-bold text-lg text-white">TEAM NOVA • ROSTER KDA</h3>
            <span className="text-xs font-mono-code text-emerald-400 font-bold">1.34 Team K/D</span>
          </div>

          <div className="space-y-2">
            {matchData.team1.players.map((p, idx) => (
              <div
                key={p.name}
                className="p-2.5 rounded-xl bg-[#141724] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono-code text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-white">{p.name}</span>
                </div>
                <div className="flex items-center gap-4 font-mono-code">
                  <span className="text-emerald-400 font-bold">{p.kda}</span>
                  <span className="text-slate-500 text-[11px]">({p.kills}K / {p.deaths}D)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Raven Stats */}
        <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e2230] pb-3">
            <h3 className="font-display font-bold text-lg text-white">TEAM RAVEN • ROSTER KDA</h3>
            <span className="text-xs font-mono-code text-[#ff2e83] font-bold">1.12 Team K/D</span>
          </div>

          <div className="space-y-2">
            {matchData.team2.players.map((p, idx) => (
              <div
                key={p.name}
                className="p-2.5 rounded-xl bg-[#141724] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono-code text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-white">{p.name}</span>
                </div>
                <div className="flex items-center gap-4 font-mono-code">
                  <span className="text-slate-300 font-bold">{p.kda}</span>
                  <span className="text-slate-500 text-[11px]">({p.kills}K / {p.deaths}D)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

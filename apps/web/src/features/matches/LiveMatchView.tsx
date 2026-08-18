import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Swords, 
  Plus,
  Minus,
  ClipboardCheck,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import { MatchWorkflow, Team, TournamentMatch, UserRole } from '../../types';
import { tournamentXApi } from '../../services/apiClient';
import { io } from 'socket.io-client';
import { OfficialStreamPlayer } from '../media/OfficialStreamPlayer';
import type { MediaStream } from '../media/media.types';

interface LiveMatchViewProps {
  currentUserRole: UserRole;
  currentUserId?: string;
  matchId?: string;
}

function createEmbeddedStream(streamUrl: string, title: string): MediaStream | null {
  try {
    const parsed = new URL(streamUrl);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const path = parsed.pathname.split('/').filter(Boolean);

    if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) {
      const isVideo = path[0] === 'videos' && Boolean(path[1]);
      const embedId = isVideo ? `v${path[1].replace(/^v/, '')}` : path[0];
      if (!embedId) return null;
      return {
        id: `match-twitch-${embedId}`,
        eventId: null,
        platform: 'Twitch',
        title,
        channel: isVideo ? 'Twitch' : embedId,
        channelHandle: isVideo ? null : embedId,
        embedId,
        mediaKind: isVideo ? 'video' : 'channel',
        game: 'Competencia oficial',
        viewers: 0,
        live: !isVideo,
        thumbnail: '',
        url: streamUrl,
        source: 'curated',
      };
    }

    if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const embedId = host === 'youtu.be'
        ? path[0]
        : parsed.searchParams.get('v') || (['live', 'embed', 'shorts'].includes(path[0]) ? path[1] : '');
      if (!embedId) return null;
      return {
        id: `match-youtube-${embedId}`,
        eventId: null,
        platform: 'YouTube',
        title,
        channel: 'YouTube',
        embedId,
        mediaKind: 'video',
        game: 'Competencia oficial',
        viewers: 0,
        live: false,
        thumbnail: '',
        url: streamUrl,
        source: 'curated',
      };
    }
  } catch {
    return null;
  }
  return null;
}

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({ currentUserRole, currentUserId, matchId }) => {
  const [apiMatch, setApiMatch] = useState<TournamentMatch | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [scoreError, setScoreError] = useState('');
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [workflow, setWorkflow] = useState<MatchWorkflow | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [reportedScore, setReportedScore] = useState({ team1: 0, team2: 0 });
  const [workflowMessage, setWorkflowMessage] = useState('');
  const embeddedStream = apiMatch?.streamUrl
    ? createEmbeddedStream(apiMatch.streamUrl, `Transmisión · ${apiMatch.id}`)
    : null;

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

  const handleEvidenceFile = async (file?: File) => {
    if (!file || !apiMatch) return;
    try {
      setIsUploadingEvidence(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No fue posible leer el archivo'));
        reader.readAsDataURL(file);
      });
      const result = await tournamentXApi.uploadPrivateAsset({ dataUrl, fileName: file.name, purpose: 'match-evidence', matchId: apiMatch.id });
      setEvidenceUrl(result.asset.accessUrl);
      setWorkflowMessage('Evidencia privada cargada correctamente.');
    } catch (error) {
      setWorkflowMessage(error instanceof Error ? error.message : 'No se pudo cargar la evidencia');
    } finally { setIsUploadingEvidence(false); }
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

  const handleDisputeDecision = async (disputeId: string, decision: 'resolve' | 'dismiss') => {
    if (!apiMatch) return;
    const resolution = window.prompt(decision === 'resolve' ? 'Escribe la resolución oficial' : 'Explica por qué se descarta la disputa');
    if (!resolution) return;
    try { await tournamentXApi.decideMatchDispute(apiMatch.id, disputeId, decision, resolution); await refreshWorkflow(); setWorkflowMessage('Disputa cerrada; ya puedes revisar el resultado.'); }
    catch (error) { setWorkflowMessage(error instanceof Error ? error.message : 'No se pudo resolver la disputa'); }
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
    <div id="live-match-room-view" className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      {/* MATCH HEADER (Image 9) */}
      <div className="space-y-4 rounded-3xl border border-[#ff2e83]/40 bg-gradient-to-r from-[#171926] via-[#12141f] to-[#1a1524] p-4 shadow-2xl sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono-code font-bold text-xs flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              ● {apiMatch?.status === 'live' ? 'EN VIVO' : (apiMatch?.status || 'CARGANDO').toUpperCase()} | {apiMatch?.roundId || 'Partido'}
            </span>
            <span className="text-xs font-mono-code text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
              {apiMatch?.mode?.replaceAll('_', ' ') || 'Formato por confirmar'}
            </span>
          </div>

          <div className="text-right text-xs font-mono-code text-slate-400"><span className="block">{apiMatch ? new Date(apiMatch.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Horario por confirmar'}</span><strong className="text-white">{apiMatch?.venue || 'Sede por confirmar'}</strong></div>
        </div>

        {/* Big Teams Scoreboard (Image 9) */}
        <div className="grid grid-cols-2 gap-4 pt-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          {/* Team 1: NOVA */}
          <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2e344e] bg-[#202438] font-brand text-xl font-black text-white shadow-inner sm:h-16 sm:w-16 sm:text-2xl">
              {teamName(apiMatch?.team1Id, 'TBD').slice(0, 3).toUpperCase()}
            </div>
            <div>
              <div className="text-[11px] font-tech text-[#ff2e83] font-bold uppercase tracking-wider">EQUIPO 1</div>
              <h2 className="break-words font-brand text-xl font-black uppercase tracking-tight text-white sm:text-3xl lg:text-5xl">
                {teamName(apiMatch?.team1Id, 'Por definir')}
              </h2>
            </div>
          </div>

          {/* Central Score Block with Scorekeeper Buttons */}
          <div className="col-span-2 row-start-2 flex flex-col items-center gap-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            <div className="flex items-center gap-2 rounded-2xl border border-[#23273b] bg-[#0b0c12] px-3 py-3 shadow-2xl sm:gap-4 sm:px-6">
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

              <span className="font-brand text-4xl font-black text-white sm:text-6xl">
                {apiMatch?.score.team1 ?? 0}
              </span>

              <span className="font-tech text-xs font-bold text-slate-500 px-1 uppercase">
                {apiMatch?.mode?.replace('best_of_', 'BO') || 'VS'}
              </span>

              <span className="font-brand text-4xl font-black text-[#ff2e83] sm:text-6xl">
                {apiMatch?.score.team2 ?? 0}
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
          <div className="flex min-w-0 flex-col-reverse items-end gap-3 text-right sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <div>
              <div className="text-[11px] font-tech text-slate-400 font-bold uppercase tracking-wider">EQUIPO 2</div>
              <h2 className="break-words font-brand text-xl font-black uppercase tracking-tight text-white sm:text-3xl lg:text-5xl">
                {teamName(apiMatch?.team2Id, 'Por definir')}
              </h2>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2e344e] bg-[#202438] font-brand text-xl font-black text-white shadow-inner sm:h-16 sm:w-16 sm:text-2xl">
              {teamName(apiMatch?.team2Id, 'TBD').slice(0, 3).toUpperCase()}
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[80px_80px_1fr]"><input type="number" min={0} value={reportedScore.team1} onChange={(event) => setReportedScore((current) => ({ ...current, team1: Number(event.target.value) }))} className="field" aria-label="Marcador equipo 1"/><input type="number" min={0} value={reportedScore.team2} onChange={(event) => setReportedScore((current) => ({ ...current, team2: Number(event.target.value) }))} className="field" aria-label="Marcador equipo 2"/><label className="field col-span-2 flex cursor-pointer items-center text-xs text-slate-400 sm:col-span-1"><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={(event) => void handleEvidenceFile(event.target.files?.[0])}/>{isUploadingEvidence ? 'Cargando evidencia…' : evidenceUrl ? 'Evidencia privada lista ✓' : 'Adjuntar captura o PDF'}</label></div>
          <div className="flex gap-2"><button onClick={() => void handleReport()} disabled={confirmedTeams.size < 2 || apiMatch.status !== 'live' || !evidenceUrl || isUploadingEvidence} className="rounded-xl bg-[#ff2e83] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><FileCheck2 className="mr-1 inline h-4 w-4"/> REPORTAR</button><button onClick={() => void handleDispute()} disabled={!evidenceUrl} className="rounded-xl border border-amber-500/30 px-3 py-2.5 text-xs font-bold text-amber-300 disabled:opacity-40"><AlertTriangle className="h-4 w-4"/></button></div>
        </div>}
        {canReviewReports && workflow?.disputes.filter((dispute) => dispute.status === 'OPEN').map((dispute) => <div key={dispute.id} className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/[.06] p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-sm text-red-200">Disputa abierta</strong><p className="mt-1 text-xs text-slate-300">{dispute.reason}</p>{dispute.evidenceUrl && <a href={dispute.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-[#ff69a8] underline">Ver evidencia</a>}</div><div className="flex gap-2"><button onClick={() => void handleDisputeDecision(dispute.id, 'dismiss')} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300">Descartar</button><button onClick={() => void handleDisputeDecision(dispute.id, 'resolve')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black">Resolver</button></div></div>)}
        {canReviewReports && workflow?.reports.filter((report) => report.status === 'PENDING_REVIEW').map((report) => <div key={report.id} className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[.06] p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-sm text-white">Marcador propuesto: {report.team1Score} - {report.team2Score}</strong><span className="ml-2 rounded bg-white/10 px-2 py-1 text-[10px] text-slate-300">{report.comparisonStatus === 'MATCHED' ? 'COINCIDE' : report.comparisonStatus === 'CONFLICT' ? 'CONFLICTO' : 'ESPERANDO RIVAL'}</span><a href={report.evidenceUrl} target="_blank" rel="noreferrer" className="ml-3 text-xs text-[#ff69a8] underline">Ver evidencia</a></div><div className="flex gap-2"><button onClick={() => void handleDecision(report.id, 'reject')} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">Rechazar</button><button onClick={() => void handleDecision(report.id, 'approve')} disabled={Boolean(workflow.disputes.some((dispute) => dispute.status === 'OPEN'))} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Aprobar resultado</button></div></div>)}
        {workflowMessage && <p className="text-xs text-slate-300">{workflowMessage}</p>}
      </section>}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-3xl border border-[#1e2230] bg-[#10121a] p-6">
          <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff69a8]">Registro oficial</p><h2 className="mt-1 text-xl font-black text-white">Información del encuentro</h2></div>
            <Swords className="h-6 w-6 text-[#ff2e83]" />
          </div>
          {apiMatch ? <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['Identificador', apiMatch.id],
              ['Ronda', apiMatch.roundId || 'Sin ronda asignada'],
              ['Sede', apiMatch.venue || 'Por confirmar'],
              ['Formato', apiMatch.mode.replaceAll('_', ' ')],
              ['Programado', new Date(apiMatch.scheduledAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })],
              ['Actualizado', new Date(apiMatch.updatedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })],
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-200">{value}</dd></div>)}
          </dl> : <p className="mt-6 text-sm text-slate-400">Selecciona un partido de la agenda para abrir su registro.</p>}
        </article>

        <article className="rounded-3xl border border-[#1e2230] bg-[#10121a] p-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff69a8]">Plantillas registradas</p>
          <h2 className="mt-1 text-xl font-black text-white">Jugadores convocables</h2>
          <div className="mt-5 space-y-4">
            {[apiMatch?.team1Id, apiMatch?.team2Id].map((teamId, index) => {
              const team = teams.find((entry) => entry.id === teamId);
              return <div key={teamId || index} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center justify-between"><strong className="text-sm text-white">{team?.name || 'Equipo por definir'}</strong><span className="text-[10px] font-bold text-slate-500">{team?.roster.length || 0} integrantes</span></div><div className="mt-3 flex flex-wrap gap-2">{team?.roster.length ? team.roster.map((player) => <span key={player.playerId || player.id} className="rounded-lg border border-[#ff2e83]/20 bg-[#ff2e83]/[.06] px-2.5 py-1 text-[11px] text-slate-300">{player.nickname} · {player.role}</span>) : <span className="text-xs text-slate-500">No hay integrantes registrados.</span>}</div></div>;
            })}
          </div>
          {embeddedStream && <div className="mt-5"><OfficialStreamPlayer stream={embeddedStream} /></div>}
          {apiMatch?.streamUrl && !embeddedStream && <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-xs text-red-200">La dirección vinculada no corresponde a un video compatible de Twitch o YouTube.</p>}
          {!apiMatch?.streamUrl && <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-4 py-3 text-xs text-amber-200">Este partido todavía no tiene una transmisión vinculada.</p>}
        </article>
      </section>
    </div>
  );
};

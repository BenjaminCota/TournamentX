import React, { useEffect, useState } from 'react';
import {
  Trophy,
  DollarSign,
  Flame,
  Sparkles
} from 'lucide-react';
import { BracketMatch, Tournament, UserRole } from '../../types';
import { TabId } from '../shell/Sidebar';
import { tournamentXApi } from '../../services/apiClient';

interface GroupStandingRow {
  participantId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoreFor: number;
  scoreAgainst: number;
  points: number;
}

interface GroupMatch {
  id: string;
  groupId: string;
  round: number;
  team1: { id: string; name: string; score: number };
  team2: { id: string; name: string; score: number };
  status: 'FINISHED' | 'SCHEDULED';
}

interface TournamentGroup {
  id: string;
  name: string;
  standings: GroupStandingRow[];
  matches: GroupMatch[];
}

interface TournamentParticipant {
  id: string;
  name: string;
  seed: number;
}

type EditableMatch = BracketMatch | GroupMatch;

interface TournamentsViewProps {
  onNavigate: (tab: TabId, targetId?: string) => void;
  currentUserRole: UserRole;
  onOpenCreateWizard: () => void;
  tournaments: Tournament[];
  onReportBracketResult: (tournamentId: string, matchId: string, score1: number, score2: number) => Promise<void> | void;
  onRegisterParticipant: (tournamentId: string, data: { teamId?: string; teamName: string; seed?: number }) => Promise<void> | void;
  onGenerateGroups: (tournamentId: string, groupCount: number) => Promise<void> | void;
  onGenerateBracket: (tournamentId: string) => Promise<void> | void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  onNavigate,
  currentUserRole,
  onOpenCreateWizard,
  tournaments,
  onReportBracketResult,
  onRegisterParticipant,
  onGenerateGroups,
  onGenerateBracket
}) => {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | undefined>(tournaments[0]?.id);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BRACKET' | 'MATCHES' | 'STANDINGS'>('BRACKET');

  const [selectedMatch, setSelectedMatch] = useState<EditableMatch | null>(null);
  const [selectedMatchKind, setSelectedMatchKind] = useState<'knockout' | 'group' | null>(null);
  const [tempScore1, setTempScore1] = useState<number>(0);
  const [tempScore2, setTempScore2] = useState<number>(0);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantSeed, setNewParticipantSeed] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [groupCountInput, setGroupCountInput] = useState('2');
  const [isGeneratingGroups, setIsGeneratingGroups] = useState(false);
  const [generateGroupsError, setGenerateGroupsError] = useState<string | null>(null);

  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [generateBracketError, setGenerateBracketError] = useState<string | null>(null);

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId) || tournaments[0];

  const canEditScores = currentUserRole === 'Admin' || currentUserRole === 'Organizador' || currentUserRole === 'Árbitro';

  const loadGroups = async (tournamentId: string) => {
    setGroupsLoading(true);
    try {
      const data = await tournamentXApi.tournamentGroups(tournamentId);
      setGroups(data as TournamentGroup[]);
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadParticipants = async (tournamentId: string) => {
    setParticipantsLoading(true);
    try {
      const data = await tournamentXApi.tournamentParticipants(tournamentId);
      setParticipants(data as TournamentParticipant[]);
    } catch {
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTournament || selectedTournament.format !== 'GROUP_STAGE_PLAYOFFS') {
      setGroups([]);
      return;
    }
    if (activeTab !== 'STANDINGS' && activeTab !== 'MATCHES') return;
    loadGroups(selectedTournament.id);
  }, [activeTab, selectedTournament?.id, selectedTournament?.format]);

  useEffect(() => {
    if (!selectedTournament || activeTab !== 'MATCHES') return;
    loadParticipants(selectedTournament.id);
  }, [activeTab, selectedTournament?.id]);

  const handleOpenMatch = (match: EditableMatch, kind: 'knockout' | 'group') => {
    setSelectedMatch(match);
    setSelectedMatchKind(kind);
    setTempScore1(match.team1.score);
    setTempScore2(match.team2.score);
    setScoreError(null);
  };

  const handleSaveScore = async () => {
    if (!selectedMatch || !selectedTournament || !selectedMatchKind) return;
    setScoreError(null);
    setIsSavingScore(true);
    try {
      if (selectedMatchKind === 'knockout') {
        await onReportBracketResult(selectedTournament.id, selectedMatch.id, tempScore1, tempScore2);
      } else {
        await tournamentXApi.reportGroupMatchResult(selectedTournament.id, selectedMatch.id, tempScore1, tempScore2);
        await loadGroups(selectedTournament.id);
      }
      setSelectedMatch(null);
      setSelectedMatchKind(null);
    } catch (error) {
      setScoreError(error instanceof Error ? error.message : 'No se pudo guardar el resultado.');
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !newParticipantName.trim()) return;
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await onRegisterParticipant(selectedTournament.id, {
        teamName: newParticipantName.trim(),
        seed: newParticipantSeed ? Number(newParticipantSeed) : undefined,
      });
      setNewParticipantName('');
      setNewParticipantSeed('');
      await loadParticipants(selectedTournament.id);
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'No se pudo inscribir al participante.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGenerateGroupsClick = async () => {
    if (!selectedTournament) return;
    setIsGeneratingGroups(true);
    setGenerateGroupsError(null);
    try {
      await onGenerateGroups(selectedTournament.id, Number(groupCountInput) || 2);
      await loadGroups(selectedTournament.id);
    } catch (error) {
      setGenerateGroupsError(error instanceof Error ? error.message : 'No se pudieron generar los grupos.');
    } finally {
      setIsGeneratingGroups(false);
    }
  };

  const handleGenerateBracketClick = async () => {
    if (!selectedTournament) return;
    setIsGeneratingBracket(true);
    setGenerateBracketError(null);
    try {
      await onGenerateBracket(selectedTournament.id);
    } catch (error) {
      setGenerateBracketError(error instanceof Error ? error.message : 'No se pudo generar el bracket.');
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  if (!selectedTournament) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto text-center text-sm text-slate-400">
        Todavía no hay torneos creados.
        <button
          onClick={onOpenCreateWizard}
          className="block mx-auto mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white text-xs font-bold tracking-wide shadow-md shadow-[#ff2e83]/20 hover:scale-105 transition-all cursor-pointer"
        >
          ＋ CREAR NUEVO TORNEO
        </button>
      </div>
    );
  }

  const rounds = selectedTournament.rounds || [];
  const allGroupMatchesFinished = groups.length > 0
    && groups.every((group) => group.matches.length > 0 && group.matches.every((m) => m.status === 'FINISHED'));

  return (
    <div id="tournaments-view-container" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Tournament Selector Dropdown / Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono-code uppercase font-bold text-slate-400">Torneo Activo:</span>
          <select
            id="tournament-selector-dropdown"
            aria-label="Seleccionar torneo activo"
            value={selectedTournament.id}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="bg-[#141724] border border-[#232738] rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#ff2e83] cursor-pointer"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.game})</option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenCreateWizard}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white text-xs font-bold tracking-wide shadow-md shadow-[#ff2e83]/20 hover:scale-105 transition-all self-start sm:self-auto cursor-pointer"
        >
          ＋ CREAR NUEVO TORNEO
        </button>
      </div>

      {/* TOURNAMENT HEADER */}
      <div className="rounded-3xl bg-[#10121a] border border-[#1e2230] p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-md bg-[#181b28] border border-[#282d42] text-xs font-mono-code font-bold text-slate-300">
                {selectedTournament.game}
              </span>
              <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono-code font-bold">
                PRIZE: {selectedTournament.prizePool}
              </span>
              <span className={`px-3 py-1 rounded-md text-xs font-bold ${
                selectedTournament.status === 'IN_PROGRESS'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                ● {selectedTournament.status === 'IN_PROGRESS' ? 'IN PROGRESS' : selectedTournament.status}
              </span>
            </div>

            <h1 className="font-brand font-black text-4xl sm:text-5xl text-white uppercase tracking-tight italic">
              {selectedTournament.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {selectedTournament.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('live_match')}
              className="px-5 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 transition-all flex items-center gap-2 cursor-pointer font-tech"
            >
              <Flame className="w-4 h-4" />
              <span>TRANSMISIÓN EN VIVO</span>
            </button>
            <button
              onClick={() => onNavigate('rewards')}
              className="px-4 py-2.5 rounded-xl bg-[#181b28] hover:bg-[#222638] text-slate-300 hover:text-white border border-[#282d42] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer font-tech"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Bolsa de premios</span>
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-[#1e2230] pt-4 overflow-x-auto">
          {(['OVERVIEW', 'BRACKET', 'MATCHES', 'STANDINGS'] as const).map((tab) => (
            <button
              key={tab}
              id={`tab-tournament-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-black tracking-wider uppercase transition-all border-b-2 whitespace-nowrap cursor-pointer font-tech ${
                activeTab === tab
                  ? 'border-[#ff2e83] text-[#ff2e83] bg-[#ff2e83]/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'OVERVIEW' ? 'INFORMACIÓN' : tab === 'BRACKET' ? 'CUADRO / BRACKET' : tab === 'MATCHES' ? 'PARTIDOS' : 'CLASIFICACIÓN'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: BRACKET VIEW */}
      {activeTab === 'BRACKET' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#10121a] border border-[#1e2230]">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <Sparkles className="w-4 h-4 text-[#ff2e83]" />
              <span className="font-tech">Árbol de Llaves Interactivo • Formato Eliminación Directa</span>
            </div>

            <div className="flex items-center gap-3">
              {canEditScores && rounds.length > 0 && (
                <span className="text-[11px] font-mono-code text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  Modo {currentUserRole}: Clic en partida para editar marcador
                </span>
              )}
            </div>
          </div>

          {/* BRACKET CANVAS */}
          <div className="p-6 lg:p-8 rounded-3xl bg-[#0e1017] border border-[#1e2230] overflow-x-auto min-h-[500px]">
            {rounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-3">
                <p className="text-sm text-slate-400">Este torneo todavía no tiene un bracket generado.</p>
                <button
                  onClick={() => setActiveTab('MATCHES')}
                  className="text-xs font-bold text-[#ff2e83] hover:underline cursor-pointer"
                >
                  Ir a la pestaña PARTIDOS para inscribir participantes y generarlo
                </button>
              </div>
            ) : (
              <div className="flex items-stretch gap-12 sm:gap-16 min-w-[760px] justify-between py-4">
                {rounds.map((round, roundIndex) => {
                  const isFinal = roundIndex === rounds.length - 1;
                  const bestOf = round.matches[0]?.bestOf;

                  return (
                    <div key={round.id} className={`flex-1 flex flex-col ${isFinal ? 'justify-center space-y-6' : 'justify-around space-y-8'}`}>
                      <div className="text-center mb-2">
                        {isFinal ? (
                          <span className="font-display font-bold text-sm tracking-wider uppercase text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30 flex items-center justify-center gap-1.5 w-fit mx-auto">
                            <Trophy className="w-4 h-4" />
                            {round.name}
                          </span>
                        ) : (
                          <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
                            {round.name}{bestOf ? ` (BO${bestOf})` : ''}
                          </span>
                        )}
                      </div>

                      {round.matches.map((m) => isFinal ? (
                        <div
                          key={m.id}
                          onClick={() => handleOpenMatch(m, 'knockout')}
                          className="p-4 rounded-2xl bg-gradient-to-br from-[#1c1a2e] to-[#141624] border-2 border-amber-500/40 hover:border-amber-400 transition-all shadow-xl cursor-pointer"
                        >
                          <div className="text-[10px] font-mono-code text-slate-400 text-center pb-2 uppercase tracking-widest">
                            {m.status === 'FINISHED' ? 'FINALIZADO' : (m.scheduledTime || 'POR DISPUTAR')}
                          </div>

                          <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40 text-white font-bold">
                            <span className="text-sm">{m.team1.name}</span>
                            <span className="font-mono-code text-sm text-amber-400">{m.team1.score}</span>
                          </div>

                          <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40 text-white font-bold mt-2">
                            <span className="text-sm">{m.team2.name}</span>
                            <span className="font-mono-code text-sm text-amber-400">{m.team2.score}</span>
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} onClick={() => handleOpenMatch(m, 'knockout')} className="relative group cursor-pointer">
                          <div className="p-3 rounded-xl bg-[#141724] border border-[#202538] hover:border-[#ff2e83] transition-all shadow-md">
                            {m.status === 'LIVE' && (
                              <div className="pb-1 text-[10px] font-mono-code text-red-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                                EN JUEGO
                              </div>
                            )}

                            <div className={`flex items-center justify-between py-1.5 px-2 rounded ${
                              m.team1.winner ? 'bg-emerald-500/10 font-bold text-white' : 'text-slate-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                {roundIndex === 0 && m.team1.seed !== undefined && (
                                  <span className="text-[10px] font-mono-code text-slate-500">#{m.team1.seed}</span>
                                )}
                                <span className="text-xs truncate max-w-[120px]">{m.team1.name}</span>
                              </div>
                              <span className={`font-mono-code text-xs font-bold ${
                                m.team1.winner ? 'text-emerald-400' : 'text-slate-400'
                              }`}>
                                {m.team1.score}
                              </span>
                            </div>

                            <div className={`flex items-center justify-between py-1.5 px-2 rounded mt-1 ${
                              m.team2.winner ? 'bg-emerald-500/10 font-bold text-white' : 'text-slate-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                {roundIndex === 0 && m.team2.seed !== undefined && (
                                  <span className="text-[10px] font-mono-code text-slate-500">#{m.team2.seed}</span>
                                )}
                                <span className="text-xs truncate max-w-[120px]">{m.team2.name}</span>
                              </div>
                              <span className={`font-mono-code text-xs font-bold ${
                                m.team2.winner ? 'text-emerald-400' : 'text-slate-400'
                              }`}>
                                {m.team2.score}
                              </span>
                            </div>
                          </div>

                          <div className="hidden sm:block absolute -right-6 top-1/2 w-6 h-0.5 bg-[#2a3047] group-hover:bg-[#ff2e83]/60 transition-colors"></div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Detalles del Formato</h3>
            <ul className="text-xs space-y-2.5 text-slate-300">
              <li className="flex justify-between">
                <span className="text-slate-400">Tipo de Torneo:</span>
                <span className="font-bold">{selectedTournament.format}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Equipos Inscritos:</span>
                <span className="font-bold">{selectedTournament.registeredTeams} / {selectedTournament.maxTeams}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Modalidad:</span>
                <span className="font-bold">Presencial & Online</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">Sede Principal:</span>
                <span className="font-bold text-[#ff2e83]">{selectedTournament.venue || 'Online Arena'}</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Bolsa de premios</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-[#141724]">
                <span className="font-bold text-white">Monto total</span>
                <span className="font-mono-code font-bold text-emerald-400">{selectedTournament.prizePool}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              El desglose y la entrega de premios se administran desde la sección "Bolsa de premios".
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Reglamento Oficial</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todos los equipos deben conectarse al servidor 15 minutos antes de la hora estipulada. El anti-cheat Vanguard debe estar activo. Se permite 1 pausa táctica de 60s por mapa.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MATCHES (inscripción, fase de grupos y generación de bracket) */}
      {activeTab === 'MATCHES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xl text-white uppercase">Participantes</h3>
              <span className="text-xs font-mono-code text-slate-400">
                {selectedTournament.registeredTeams} / {selectedTournament.maxTeams || '∞'}
              </span>
            </div>

            {participantsLoading ? (
              <p className="text-sm text-slate-400">Cargando participantes…</p>
            ) : participants.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay participantes inscritos.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#141724] text-xs text-slate-200">
                    <span className="font-bold">{p.name}</span>
                    <span className="font-mono-code text-slate-500">#{p.seed}</span>
                  </li>
                ))}
              </ul>
            )}

            {canEditScores && rounds.length === 0 && (
              <form onSubmit={handleAddParticipant} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-[#1e2230]">
                <input
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="Nombre del equipo / jugador"
                  className="flex-1 bg-[#141724] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none"
                />
                <input
                  type="number"
                  value={newParticipantSeed}
                  onChange={(e) => setNewParticipantSeed(e.target.value)}
                  placeholder="Seed"
                  className="w-full sm:w-24 bg-[#141724] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isRegistering || !newParticipantName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? 'Agregando…' : 'Agregar'}
                </button>
              </form>
            )}
            {registerError && <p className="text-xs font-semibold text-red-400">{registerError}</p>}
          </div>

          {selectedTournament.format === 'GROUP_STAGE_PLAYOFFS' && (
            <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
              <h3 className="font-display font-bold text-xl text-white uppercase">Fase de Grupos</h3>

              {groupsLoading ? (
                <p className="text-sm text-slate-400">Cargando grupos…</p>
              ) : groups.length === 0 ? (
                <>
                  <p className="text-sm text-slate-400">Todavía no se generaron los grupos.</p>
                  {canEditScores && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={groupCountInput}
                        onChange={(e) => setGroupCountInput(e.target.value)}
                        className="w-20 bg-[#141724] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none"
                      />
                      <button
                        onClick={handleGenerateGroupsClick}
                        disabled={isGeneratingGroups || participants.length < 2}
                        className="px-4 py-2 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingGroups ? 'Generando…' : 'Generar Grupos'}
                      </button>
                    </div>
                  )}
                  {generateGroupsError && <p className="text-xs font-semibold text-red-400">{generateGroupsError}</p>}
                </>
              ) : (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase">{group.name}</h4>
                      <div className="space-y-1">
                        {group.matches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => canEditScores && handleOpenMatch(m, 'group')}
                            disabled={!canEditScores}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#141724] hover:bg-[#1a1e2e] text-xs text-left transition-colors disabled:cursor-default disabled:hover:bg-[#141724]"
                          >
                            <span className="text-slate-200">{m.team1.name} <span className="text-slate-500">vs</span> {m.team2.name}</span>
                            <span className="font-mono-code font-bold text-white">
                              {m.status === 'FINISHED' ? `${m.team1.score} - ${m.team2.score}` : 'Pendiente'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {rounds.length === 0 && (
                    <div className="pt-2 border-t border-[#1e2230] space-y-2">
                      {!allGroupMatchesFinished ? (
                        <p className="text-xs text-slate-500">Cuando terminen todos los partidos de grupo vas a poder generar el bracket de playoffs.</p>
                      ) : canEditScores ? (
                        <button
                          onClick={handleGenerateBracketClick}
                          disabled={isGeneratingBracket}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingBracket ? 'Generando…' : 'Generar Bracket desde Grupos'}
                        </button>
                      ) : null}
                      {generateBracketError && <p className="text-xs font-semibold text-red-400">{generateBracketError}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedTournament.format !== 'GROUP_STAGE_PLAYOFFS' && rounds.length === 0 && (
            <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-3">
              <h3 className="font-display font-bold text-xl text-white uppercase">Generar Bracket</h3>
              <p className="text-sm text-slate-400">
                Con {participants.length} participante{participants.length === 1 ? '' : 's'} inscritos ya se puede armar la llave de eliminación directa.
              </p>
              {canEditScores && (
                <button
                  onClick={handleGenerateBracketClick}
                  disabled={isGeneratingBracket || participants.length < 2}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingBracket ? 'Generando…' : 'Generar Bracket'}
                </button>
              )}
              {generateBracketError && <p className="text-xs font-semibold text-red-400">{generateBracketError}</p>}
            </div>
          )}

          {rounds.length > 0 && (
            <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] text-center text-sm text-slate-400">
              El bracket ya fue generado — anda a la pestaña "CUADRO / BRACKET" para cargar resultados y avanzar rondas.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: STANDINGS */}
      {activeTab === 'STANDINGS' && (
        <div className="space-y-6">
          {selectedTournament.format !== 'GROUP_STAGE_PLAYOFFS' ? (
            <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] text-center text-sm text-slate-400">
              Este torneo usa eliminación directa: no tiene tabla de posiciones de fase de grupos.
            </div>
          ) : groupsLoading ? (
            <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] text-center text-sm text-slate-400">
              Cargando clasificación…
            </div>
          ) : groups.length === 0 ? (
            <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] text-center text-sm text-slate-400">
              Todavía no se generaron los grupos de este torneo.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
                <h3 className="font-display font-bold text-xl text-white uppercase">{group.name}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1e2230] text-slate-400 font-mono-code">
                        <th className="py-3 px-4">POS</th>
                        <th className="py-3 px-4">EQUIPO</th>
                        <th className="py-3 px-4">PJ</th>
                        <th className="py-3 px-4">V</th>
                        <th className="py-3 px-4">E</th>
                        <th className="py-3 px-4">D</th>
                        <th className="py-3 px-4">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2230]">
                      {group.standings.map((row, index) => (
                        <tr key={row.participantId} className="text-white hover:bg-[#141724]">
                          <td className={`py-3 px-4 font-bold ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : 'text-slate-500'}`}>{index + 1}</td>
                          <td className="py-3 px-4 font-bold">{row.name}</td>
                          <td className="py-3 px-4 font-mono-code">{row.played}</td>
                          <td className="py-3 px-4 font-mono-code text-emerald-400">{row.won}</td>
                          <td className="py-3 px-4 font-mono-code text-slate-400">{row.drawn}</td>
                          <td className="py-3 px-4 font-mono-code text-slate-400">{row.lost}</td>
                          <td className="py-3 px-4 font-mono-code font-bold">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: MATCH DETAILS & SCORE EDIT */}
      {selectedMatch && (
        <div
          id="modal-match-details"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#12141e] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <div>
                <span className="text-[10px] font-mono-code text-[#ff2e83] uppercase font-bold">
                  {selectedTournament.name}
                </span>
                <h3 className="font-display font-black text-2xl text-white">
                  Detalles del Enfrentamiento
                </h3>
              </div>
              <button
                onClick={() => { setSelectedMatch(null); setSelectedMatchKind(null); }}
                className="text-slate-400 hover:text-white font-mono-code text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0d13] border border-[#1e2230] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{selectedMatch.team1.name}</span>
                {canEditScores ? (
                  <input
                    type="number"
                    value={tempScore1}
                    onChange={(e) => setTempScore1(parseInt(e.target.value) || 0)}
                    className="w-16 bg-[#1b1f2e] text-center font-mono-code font-bold text-lg text-white border border-[#2e354d] rounded-lg p-1"
                  />
                ) : (
                  <span className="font-mono-code font-bold text-lg text-white">{selectedMatch.team1.score}</span>
                )}
              </div>

              <div className="text-center font-mono-code text-xs text-slate-500">VS</div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{selectedMatch.team2.name}</span>
                {canEditScores ? (
                  <input
                    type="number"
                    value={tempScore2}
                    onChange={(e) => setTempScore2(parseInt(e.target.value) || 0)}
                    className="w-16 bg-[#1b1f2e] text-center font-mono-code font-bold text-lg text-white border border-[#2e354d] rounded-lg p-1"
                  />
                ) : (
                  <span className="font-mono-code font-bold text-lg text-white">{selectedMatch.team2.score}</span>
                )}
              </div>
            </div>

            {selectedMatchKind === 'knockout' && (
              <p className="text-[11px] text-slate-500">Los partidos de eliminación directa no permiten empates.</p>
            )}

            {scoreError && (
              <p className="text-xs font-semibold text-red-400">{scoreError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setSelectedMatch(null); setSelectedMatchKind(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
              {canEditScores && (
                <button
                  onClick={handleSaveScore}
                  disabled={isSavingScore}
                  className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingScore ? 'Guardando…' : selectedMatchKind === 'knockout' ? 'Guardar y Avanzar Llave' : 'Guardar Resultado'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

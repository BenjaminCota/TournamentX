import React, { useState } from 'react';
import { 
  Trophy, 
  DollarSign, 
  Flame,
  Sparkles
} from 'lucide-react';
import { Tournament, BracketMatch, UserRole } from '../../types';
import { MOCK_TOURNAMENTS } from '../../data/mockData';
import { TabId } from '../shell/Sidebar';

interface TournamentsViewProps {
  onNavigate: (tab: TabId, targetId?: string) => void;
  currentUserRole: UserRole;
  onOpenCreateWizard: () => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  onNavigate,
  currentUserRole,
  onOpenCreateWizard
}) => {
  const [selectedTournament, setSelectedTournament] = useState<Tournament>(MOCK_TOURNAMENTS[0]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BRACKET' | 'MATCHES' | 'STANDINGS'>('BRACKET');
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [tempScore1, setTempScore1] = useState<number>(0);
  const [tempScore2, setTempScore2] = useState<number>(0);

  const canEditScores = currentUserRole === 'Admin' || currentUserRole === 'Organizador' || currentUserRole === 'Árbitro';

  const handleOpenMatch = (match: BracketMatch) => {
    setSelectedMatch(match);
    setTempScore1(match.team1.score);
    setTempScore2(match.team2.score);
  };

  const handleSaveScore = () => {
    if (!selectedMatch || !selectedTournament.rounds) return;
    
    // Update match score in state
    const updatedRounds = selectedTournament.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((m) => {
        if (m.id === selectedMatch.id) {
          const winner1 = tempScore1 > tempScore2;
          const winner2 = tempScore2 > tempScore1;
          return {
            ...m,
            team1: { ...m.team1, score: tempScore1, winner: winner1 },
            team2: { ...m.team2, score: tempScore2, winner: winner2 },
            status: 'FINISHED' as const
          };
        }
        return m;
      })
    }));

    setSelectedTournament({
      ...selectedTournament,
      rounds: updatedRounds
    });
    setSelectedMatch(null);
  };

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
            onChange={(e) => {
              const found = MOCK_TOURNAMENTS.find(t => t.id === e.target.value);
              if (found) setSelectedTournament(found);
            }}
            className="bg-[#141724] border border-[#232738] rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#ff2e83] cursor-pointer"
          >
            {MOCK_TOURNAMENTS.map(t => (
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

      {/* TOURNAMENT HEADER (Image 7) */}
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

        {/* TABS (Image 7: OVERVIEW, BRACKET, MATCHES, STANDINGS) */}
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

      {/* TAB CONTENT: BRACKET VIEW (Image 7) */}
      {activeTab === 'BRACKET' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#10121a] border border-[#1e2230]">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <Sparkles className="w-4 h-4 text-[#ff2e83]" />
              <span className="font-tech">Árbol de Llaves Interactivo • Formato Eliminación Directa</span>
            </div>

            <div className="flex items-center gap-3">
              {canEditScores && (
                <span className="text-[11px] font-mono-code text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  Modo {currentUserRole}: Clic en partida para editar marcador
                </span>
              )}
            </div>
          </div>

          {/* BRACKET CANVAS (Image 7) */}
          <div className="p-6 lg:p-8 rounded-3xl bg-[#0e1017] border border-[#1e2230] overflow-x-auto min-h-[500px]">
            <div className="flex items-stretch gap-12 sm:gap-16 min-w-[760px] justify-between py-4">
              {/* Round 1: Cuartos de Final (4 matches) */}
              <div className="flex-1 flex flex-col justify-around space-y-8">
                <div className="text-center mb-2">
                  <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
                    Cuartos de Final (BO1)
                  </span>
                </div>

                {selectedTournament.rounds?.[0]?.matches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleOpenMatch(m)}
                    className="relative group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-[#141724] border border-[#202538] hover:border-[#ff2e83] transition-all shadow-md">
                      {/* Team 1 */}
                      <div className={`flex items-center justify-between py-1.5 px-2 rounded ${
                        m.team1.winner ? 'bg-emerald-500/10 font-bold text-white' : 'text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono-code text-slate-500">#{m.team1.seed}</span>
                          <span className="text-xs truncate max-w-[110px]">{m.team1.name}</span>
                        </div>
                        <span className={`font-mono-code text-xs font-bold ${
                          m.team1.winner ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {m.team1.score}
                        </span>
                      </div>

                      {/* Team 2 */}
                      <div className={`flex items-center justify-between py-1.5 px-2 rounded mt-1 ${
                        m.team2.winner ? 'bg-emerald-500/10 font-bold text-white' : 'text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono-code text-slate-500">#{m.team2.seed}</span>
                          <span className="text-xs truncate max-w-[110px]">{m.team2.name}</span>
                        </div>
                        <span className={`font-mono-code text-xs font-bold ${
                          m.team2.winner ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {m.team2.score}
                        </span>
                      </div>
                    </div>

                    {/* Bracket Connector Line to right */}
                    <div className="hidden sm:block absolute -right-6 top-1/2 w-6 h-0.5 bg-[#2a3047] group-hover:bg-[#ff2e83]/60 transition-colors"></div>
                  </div>
                ))}
              </div>

              {/* Round 2: Semifinales (2 matches) */}
              <div className="flex-1 flex flex-col justify-around space-y-12">
                <div className="text-center mb-2">
                  <span className="font-display font-bold text-sm tracking-wider uppercase text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
                    Semifinales (BO3)
                  </span>
                </div>

                {selectedTournament.rounds?.[1]?.matches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleOpenMatch(m)}
                    className="relative group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-[#141724] border border-[#202538] hover:border-[#ff2e83] transition-all shadow-md">
                      {m.status === 'LIVE' && (
                        <div className="pb-1 text-[10px] font-mono-code text-red-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                          EN JUEGO (MAPA 3)
                        </div>
                      )}

                      {/* Team 1 */}
                      <div className={`flex items-center justify-between py-1.5 px-2 rounded ${
                        m.team1.winner ? 'bg-emerald-500/10 font-bold text-white' : 'text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs truncate max-w-[120px]">{m.team1.name}</span>
                        </div>
                        <span className={`font-mono-code text-xs font-bold ${
                          m.team1.winner ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {m.team1.score}
                        </span>
                      </div>

                      {/* Team 2 */}
                      <div className={`flex items-center justify-between py-1.5 px-2 rounded mt-1 ${
                        m.team2.winner ? 'bg-emerald-500/10 font-bold text-white' : 'text-slate-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs truncate max-w-[120px]">{m.team2.name}</span>
                        </div>
                        <span className={`font-mono-code text-xs font-bold ${
                          m.team2.winner ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {m.team2.score}
                        </span>
                      </div>
                    </div>

                    {/* Bracket Connector Line to right */}
                    <div className="hidden sm:block absolute -right-6 top-1/2 w-6 h-0.5 bg-[#2a3047] group-hover:bg-[#ff2e83]/60 transition-colors"></div>
                  </div>
                ))}
              </div>

              {/* Round 3: Gran Final (1 match) */}
              <div className="flex-1 flex flex-col justify-center space-y-6">
                <div className="text-center mb-2">
                  <span className="font-display font-bold text-sm tracking-wider uppercase text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30 flex items-center justify-center gap-1.5 w-fit mx-auto">
                    <Trophy className="w-4 h-4" />
                    Gran Final (BO5)
                  </span>
                </div>

                {selectedTournament.rounds?.[2]?.matches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleOpenMatch(m)}
                    className="p-4 rounded-2xl bg-gradient-to-br from-[#1c1a2e] to-[#141624] border-2 border-amber-500/40 hover:border-amber-400 transition-all shadow-xl cursor-pointer"
                  >
                    <div className="text-[10px] font-mono-code text-slate-400 text-center pb-2 uppercase tracking-widest">
                      {m.scheduledTime || 'POR DISPUTAR'}
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40 text-white font-bold">
                      <span className="text-sm">{m.team1.name}</span>
                      <span className="font-mono-code text-sm text-amber-400">{m.team1.score}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 rounded bg-black/40 text-white font-bold mt-2">
                      <span className="text-sm">{m.team2.name}</span>
                      <span className="font-mono-code text-sm text-amber-400">{m.team2.score}</span>
                    </div>

                    <div className="mt-3 pt-2 text-center border-t border-white/10">
                      <span className="text-[11px] font-mono-code font-bold text-emerald-400">
                        Premio Campeón: $30,000 USD
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                <span className="text-slate-400">Equipos Máximos:</span>
                <span className="font-bold">{selectedTournament.maxTeams}</span>
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
            <h3 className="font-display font-bold text-lg text-white">Distribución de Premios</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-[#141724]">
                <span className="font-bold text-amber-400">1er Lugar (60%)</span>
                <span className="font-mono-code font-bold text-white">$30,000 USD</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141724]">
                <span className="font-bold text-slate-300">2do Lugar (25%)</span>
                <span className="font-mono-code font-bold text-white">$12,500 USD</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141724]">
                <span className="font-bold text-amber-600">3er Lugar (15%)</span>
                <span className="font-mono-code font-bold text-white">$7,500 USD</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Reglamento Oficial</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todos los equipos deben conectarse al servidor 15 minutos antes de la hora estipulada. El anti-cheat Vanguard debe estar activo. Se permite 1 pausa táctica de 60s por mapa.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STANDINGS */}
      {activeTab === 'STANDINGS' && (
        <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
          <h3 className="font-display font-bold text-xl text-white uppercase">Tabla de Posiciones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1e2230] text-slate-400 font-mono-code">
                  <th className="py-3 px-4">POS</th>
                  <th className="py-3 px-4">EQUIPO</th>
                  <th className="py-3 px-4">PJ</th>
                  <th className="py-3 px-4">V</th>
                  <th className="py-3 px-4">D</th>
                  <th className="py-3 px-4">WIN RATE</th>
                  <th className="py-3 px-4">PREMIO ESTIMADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2230]">
                <tr className="text-white hover:bg-[#141724]">
                  <td className="py-3 px-4 font-bold text-amber-400">1</td>
                  <td className="py-3 px-4 font-bold">Team Nova</td>
                  <td className="py-3 px-4 font-mono-code">3</td>
                  <td className="py-3 px-4 font-mono-code text-emerald-400">3</td>
                  <td className="py-3 px-4 font-mono-code text-slate-400">0</td>
                  <td className="py-3 px-4 font-mono-code">100%</td>
                  <td className="py-3 px-4 font-mono-code text-emerald-400 font-bold">$30,000</td>
                </tr>
                <tr className="text-white hover:bg-[#141724]">
                  <td className="py-3 px-4 font-bold text-slate-300">2</td>
                  <td className="py-3 px-4 font-bold">Team Beta</td>
                  <td className="py-3 px-4 font-mono-code">3</td>
                  <td className="py-3 px-4 font-mono-code text-emerald-400">2</td>
                  <td className="py-3 px-4 font-mono-code text-slate-400">1</td>
                  <td className="py-3 px-4 font-mono-code">66.7%</td>
                  <td className="py-3 px-4 font-mono-code text-emerald-400 font-bold">$12,500</td>
                </tr>
                <tr className="text-white hover:bg-[#141724]">
                  <td className="py-3 px-4 font-bold text-amber-600">3</td>
                  <td className="py-3 px-4 font-bold">Delta Force</td>
                  <td className="py-3 px-4 font-mono-code">2</td>
                  <td className="py-3 px-4 font-mono-code text-emerald-400">1</td>
                  <td className="py-3 px-4 font-mono-code text-slate-400">1</td>
                  <td className="py-3 px-4 font-mono-code">50%</td>
                  <td className="py-3 px-4 font-mono-code text-emerald-400 font-bold">$7,500</td>
                </tr>
              </tbody>
            </table>
          </div>
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
                onClick={() => setSelectedMatch(null)}
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

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
              {canEditScores && (
                <button
                  onClick={handleSaveScore}
                  className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30"
                >
                  Guardar y Avanzar Llave
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

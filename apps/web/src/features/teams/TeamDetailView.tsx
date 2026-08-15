import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Swords, 
  Share2, 
  Star
} from 'lucide-react';
import { Team } from '../../types';
import { MOCK_TEAMS } from '../../data/mockData';
import { TabId } from '../shell/Sidebar';

interface TeamDetailViewProps {
  teamId?: string;
  onNavigate: (tab: TabId) => void;
}

export const TeamDetailView: React.FC<TeamDetailViewProps> = ({
  teamId = 'team-lnx',
  onNavigate
}) => {
  const team: Team = MOCK_TEAMS.find(t => t.id === teamId) || MOCK_TEAMS[0];
  const [activeTab, setActiveTab] = useState<'RESUMEN' | 'ROSTER' | 'PARTIDOS' | 'ESTADÍSTICAS' | 'HISTORIAL'>('ROSTER');
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div id="team-profile-detail-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back Button (Image 15) */}
      <button
        onClick={() => onNavigate('teams')}
        className="inline-flex items-center gap-2 text-xs font-mono-code font-bold uppercase text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>← VOLVER A EQUIPOS</span>
      </button>

      {/* TEAM HEADER CARD (Image 15) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#171927] via-[#12141f] to-[#1a1524] border border-[#ff2e83]/30 p-6 lg:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Team Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#202438] border-2 border-[#ff2e83]/50 p-2 flex items-center justify-center font-display font-black text-3xl text-white shadow-xl">
              <img
                src={team.logo}
                alt={team.name}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#ff2e83]/20 border border-[#ff2e83]/40 text-[#ff2e83] font-mono-code font-bold text-[11px]">
                  {team.tier} [{team.tag}]
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Región: {team.region}
                </span>
              </div>

              <h1 className="font-brand font-black text-4xl sm:text-5xl text-white uppercase tracking-tight italic">
                {team.name}
              </h1>

              <p className="text-xs text-slate-300 max-w-xl line-clamp-2 leading-relaxed">
                {team.bio}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`px-6 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer font-tech ${
                isFollowing
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#ff2e83] hover:bg-[#e11d48] text-white shadow-lg shadow-[#ff2e83]/30'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>{isFollowing ? 'SIGUIENDO' : '＋ SEGUIR'}</span>
            </button>
            <button className="p-2.5 rounded-xl bg-[#181b28] hover:bg-[#222638] text-slate-300 border border-[#282d42]">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRICS ROW (Image 15) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1e2230]">
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center">
            <div className="text-[10px] font-tech uppercase text-slate-400 font-bold">RANGO GLOBAL</div>
            <div className="font-brand font-black text-3xl text-amber-400 mt-1">#{team.globalRank}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center">
            <div className="text-[10px] font-tech uppercase text-slate-400 font-bold">WIN RATE</div>
            <div className="font-brand font-black text-3xl text-emerald-400 mt-1">{team.winRate}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center">
            <div className="text-[10px] font-tech uppercase text-slate-400 font-bold">PARTIDOS JUGADOS</div>
            <div className="font-brand font-black text-3xl text-white mt-1">{team.matchesPlayed}</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center">
            <div className="text-[10px] font-tech uppercase text-slate-400 font-bold">W / L / T</div>
            <div className="font-brand font-black text-3xl text-slate-200 mt-1">
              {team.record.wins} / {team.record.losses} / {team.record.ties}
            </div>
          </div>
        </div>

        {/* TABS (Image 15) */}
        <div className="flex items-center gap-2 border-b border-[#1e2230] pt-2 overflow-x-auto">
          {(['RESUMEN', 'ROSTER', 'PARTIDOS', 'ESTADÍSTICAS', 'HISTORIAL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-bold tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'border-[#ff2e83] text-[#ff2e83] bg-[#ff2e83]/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: ACTIVE ROSTER GRID (Image 15) */}
      {activeTab === 'ROSTER' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ff2e83]" />
              PLANTILLA ACTIVA ({team.roster.length} JUGADORES)
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              OVR Promedio de Escuadra: <strong className="text-amber-400">90.5</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.roster.map((player) => (
              <div
                key={player.id}
                className="group rounded-3xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83] transition-all overflow-hidden p-5 flex flex-col justify-between space-y-4 shadow-xl hover:shadow-[#ff2e83]/10"
              >
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#ff2e83]/40 group-hover:ring-[#ff2e83] transition-all"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-[#10121a]"></span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-[#1f2438] to-[#151825] border border-amber-500/30 text-center">
                    <div className="text-[9px] font-mono-code text-slate-400">OVR</div>
                    <div className="font-display font-black text-xl text-amber-400 leading-none">
                      {player.ovr}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-[#ff2e83] transition-colors">
                    {player.nickname}
                  </h3>
                  <div className="text-[11px] font-mono-code text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                    {player.role}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e2230] flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-500">K/D Ratio:</span>
                  <span className="font-bold text-emerald-400">{player.kda}</span>
                </div>
              </div>
            ))}
          </div>

          {/* NEXT MATCH PROMOTION (Image 15) */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141724] to-[#1a1224] border border-[#282d42] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#23283d] flex items-center justify-center text-[#ff2e83]">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono-code uppercase font-bold text-red-400 animate-pulse">
                  ● PRÓXIMO PARTIDO • HOY 20:00 EST
                </span>
                <h4 className="font-display font-bold text-lg text-white">
                  LUMINEX ESPORTS [LNX] VS AERO CLAN [AER]
                </h4>
                <p className="text-xs text-slate-400">Pro League S5 • Semifinales (BO3)</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('live_match')}
              className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 transition-all cursor-pointer whitespace-nowrap"
            >
              VER DETALLES →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

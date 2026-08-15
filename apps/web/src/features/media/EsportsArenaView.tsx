import React, { useState } from 'react';
import { Gamepad2, Radio, Server, Globe } from 'lucide-react';
import { MOCK_SERVER_LOBBIES } from '../../data/mockData';
import { ServerLobby } from '../../types';

interface EsportsArenaViewProps {
  onWatchLiveMatch: () => void;
}

export const EsportsArenaView: React.FC<EsportsArenaViewProps> = ({
  onWatchLiveMatch
}) => {
  const [lobbies] = useState<ServerLobby[]>(MOCK_SERVER_LOBBIES);
  const [activeGameFilter, setActiveGameFilter] = useState('ALL');

  const games = [
    { name: 'Valorant', category: 'FPS', activeCount: 12, icon: '🎯' },
    { name: 'League of Legends', category: 'MOBA', activeCount: 8, icon: '⚔️' },
    { name: 'Rocket League', category: 'SPORTS', activeCount: 5, icon: '🚗' },
    { name: 'Counter-Strike 2', category: 'FPS', activeCount: 10, icon: '💣' },
    { name: 'Street Fighter 6', category: 'FIGHTING', activeCount: 6, icon: '🥊' }
  ];

  const filteredLobbies = activeGameFilter === 'ALL'
    ? lobbies
    : lobbies.filter(l => l.game === activeGameFilter);

  return (
    <div id="esports-arena-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER (Image 19) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-tight italic flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-[#ff2e83]" />
            ARENA DE TRANSMISIÓN & SERVIDORES LAN
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-tech">
            Monitoreo en tiempo real de lobbies dedicados, servidores LAN y streams multicanal
          </p>
        </div>

        <button
          onClick={onWatchLiveMatch}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-[#ff2e83] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-red-600/30 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto font-tech"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>TRANSMISIÓN PRINCIPAL EN VIVO</span>
        </button>
      </div>

      {/* SUPPORTED TITLES CARDS (Image 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveGameFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeGameFilter === 'ALL'
              ? 'bg-[#ff2e83]/15 border-[#ff2e83] text-white shadow-lg'
              : 'bg-[#10121a] border-[#1e2230] text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-xl mb-1">🎮</div>
          <div className="font-bold text-sm text-white">Todos los Títulos</div>
          <div className="text-[10px] font-mono-code text-slate-400 mt-0.5">41 Lobbies Activos</div>
        </button>

        {games.map((g) => (
          <button
            key={g.name}
            onClick={() => setActiveGameFilter(g.name)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeGameFilter === g.name
                ? 'bg-[#ff2e83]/15 border-[#ff2e83] text-white shadow-lg'
                : 'bg-[#10121a] border-[#1e2230] text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xl mb-1">{g.icon}</div>
            <div className="font-bold text-sm text-white truncate">{g.name}</div>
            <div className="text-[10px] font-mono-code text-[#ff2e83] mt-0.5">
              {g.activeCount} Lobbies • {g.category}
            </div>
          </button>
        ))}
      </div>

      {/* 2-COLUMN: LOBBIES TABLE & LIVE BROADCASTS (Image 19) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Server Lobbies Table (Image 19) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              SALAS DE JUEGO Y LOBBIES OFICIALES
            </h2>
            <span className="text-xs font-mono-code text-slate-400">
              Sincronizado vía Socket.IO
            </span>
          </div>

          <div className="rounded-3xl bg-[#10121a] border border-[#1e2230] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1e2230] bg-[#141724] text-slate-400 font-mono-code">
                    <th className="py-4 px-4">LOBBY ID</th>
                    <th className="py-4 px-4">JUEGO / SERVIDOR</th>
                    <th className="py-4 px-4">MAPA</th>
                    <th className="py-4 px-4">ENFRENTAMIENTO</th>
                    <th className="py-4 px-4">ESTADO</th>
                    <th className="py-4 px-4 text-right">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2230]">
                  {filteredLobbies.map((lobby) => (
                    <tr key={lobby.id} className="hover:bg-[#141724]/80 transition-colors">
                      {/* Lobby ID */}
                      <td className="py-4 px-4 font-mono-code font-bold text-slate-200">
                        {lobby.id}
                      </td>

                      {/* Game & Server */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white">{lobby.game}</div>
                        <div className="text-[10px] font-mono-code text-slate-500 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-500" />
                          {lobby.server}
                        </div>
                      </td>

                      {/* Map */}
                      <td className="py-4 px-4 text-slate-300 font-mono-code">
                        {lobby.map}
                      </td>

                      {/* Teams */}
                      <td className="py-4 px-4 font-bold text-slate-200">
                        {lobby.teams}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit ${
                          lobby.status === 'In Game'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : lobby.status === 'Waiting'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            lobby.status === 'In Game' ? 'bg-emerald-400 animate-pulse' : lobby.status === 'Waiting' ? 'bg-amber-400' : 'bg-blue-400'
                          }`}></span>
                          {lobby.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={onWatchLiveMatch}
                          className="px-3 py-1.5 rounded-lg bg-[#181b28] hover:bg-[#ff2e83] text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Espectar ({lobby.ping}ms)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Live Media Broadcast Feeds (Image 19) */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#ff2e83]" />
            TRANSMISIONES DESTACADAS
          </h2>

          <div className="space-y-4">
            {/* Stream Card 1: Twitch */}
            <div 
              onClick={onWatchLiveMatch}
              className="p-4 rounded-3xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83] transition-all cursor-pointer group space-y-3"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-video">
                <img
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"
                  alt="VCT Stream"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded bg-[#9146FF] text-white text-[10px] font-bold font-mono-code flex items-center gap-1">
                  TWITCH STREAM
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-red-400 text-[10px] font-bold font-mono-code">
                  ● 124.5K VIENDO
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-white group-hover:text-[#ff2e83] transition-colors">
                  VCT 2024: Masters Madrid - Grand Final
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Canal Oficial: /Valorant_Esports_LATAM</p>
              </div>
            </div>

            {/* Stream Card 2: YouTube */}
            <div 
              onClick={onWatchLiveMatch}
              className="p-4 rounded-3xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83] transition-all cursor-pointer group space-y-3"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-video">
                <img
                  src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80"
                  alt="LEC Stream"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded bg-[#FF0000] text-white text-[10px] font-bold font-mono-code flex items-center gap-1">
                  YOUTUBE GAMING
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-red-400 text-[10px] font-bold font-mono-code">
                  ● 89.2K VIENDO
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-white group-hover:text-[#ff2e83] transition-colors">
                  LEC Spring Split 2024 - Week 3
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Canal Oficial: Riot Games Esports</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  Minus
} from 'lucide-react';
import { MOCK_LIVE_MATCH } from '../../data/mockData';
import { UserRole } from '../../types';

interface LiveMatchViewProps {
  currentUserRole: UserRole;
}

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({ currentUserRole }) => {
  const [matchData, setMatchData] = useState(MOCK_LIVE_MATCH);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [seconds, setSeconds] = useState(45 * 60 + 12);
  const [feed, setFeed] = useState(matchData.killFeed);

  const canControlScore = currentUserRole === 'Admin' || currentUserRole === 'Organizador' || currentUserRole === 'Árbitro';

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

  const handleAdjustScore = (team: 1 | 2, delta: number) => {
    if (team === 1) {
      setMatchData(prev => ({
        ...prev,
        team1: { ...prev.team1, score: Math.max(0, prev.team1.score + delta) }
      }));
    } else {
      setMatchData(prev => ({
        ...prev,
        team2: { ...prev.team2, score: Math.max(0, prev.team2.score + delta) }
      }));
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
              ● EN VIVO | Grand Finals - Mapa 3
            </span>
            <span className="text-xs font-mono-code text-slate-400 bg-[#161926] px-3 py-1 rounded-full border border-[#232738]">
              {matchData.map}
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
              <div className="text-[11px] font-tech text-[#ff2e83] font-bold uppercase tracking-wider">SEED #{matchData.team1.seed}</div>
              <h2 className="font-brand font-black text-3xl sm:text-5xl text-white uppercase tracking-tight italic">
                {matchData.team1.name}
              </h2>
            </div>
          </div>

          {/* Central Score Block with Scorekeeper Buttons */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-[#0b0c12] border border-[#23273b] shadow-2xl">
              {canControlScore && (
                <button
                  onClick={() => handleAdjustScore(1, -1)}
                  className="p-1 rounded bg-[#1e2230] text-slate-400 hover:text-white"
                  title="Restar punto Nova"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}

              <span className="font-brand font-black text-5xl sm:text-6xl text-white">
                {matchData.team1.score}
              </span>

              <span className="font-tech text-xs font-bold text-slate-500 px-1 uppercase">
                {matchData.bestOf}
              </span>

              <span className="font-brand font-black text-5xl sm:text-6xl text-[#ff2e83]">
                {matchData.team2.score}
              </span>

              {canControlScore && (
                <button
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
              <div className="text-[11px] font-tech text-slate-400 font-bold uppercase tracking-wider">SEED #{matchData.team2.seed}</div>
              <h2 className="font-brand font-black text-3xl sm:text-5xl text-white uppercase tracking-tight italic">
                {matchData.team2.name}
              </h2>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-2xl text-white shadow-inner">
              RVN
            </div>
          </div>
        </div>
      </div>

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

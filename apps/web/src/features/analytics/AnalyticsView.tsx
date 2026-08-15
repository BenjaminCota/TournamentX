import React, { useState } from 'react';
import { Activity, BarChart3, Medal, Target, TrendingUp, Trophy } from 'lucide-react';

const RANKING = [
  { team: 'Luminex Esports', played: 32, wins: 25, points: 78, rate: 78 },
  { team: 'Team Nova', played: 30, wins: 22, points: 69, rate: 73 },
  { team: 'Crimson Wolves', played: 29, wins: 19, points: 61, rate: 66 },
  { team: 'Velocity Gaming', played: 31, wins: 18, points: 58, rate: 58 },
];

export const AnalyticsView: React.FC = () => {
  const [scope, setScope] = useState<'GLOBAL' | 'REGIONAL'>('GLOBAL');
  const cards = [
    { label: 'Partidos registrados', value: '1,284', change: '+12.5%', icon: Activity },
    { label: 'Equipos activos', value: '368', change: '+8.2%', icon: Trophy },
    { label: 'Win rate líder', value: '78%', change: 'Luminex', icon: Target },
    { label: 'Participación', value: '92%', change: '+4.1%', icon: TrendingUp },
  ];
  return (
    <div id="analytics-view" className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div><h1 className="font-brand font-black text-4xl text-white uppercase italic flex items-center gap-3"><BarChart3 className="w-8 h-8 text-[#ff2e83]" /> Estadísticas</h1><p className="text-sm text-slate-400 mt-2">Rendimiento consolidado de torneos, equipos y jugadores.</p></div>
        <div className="flex bg-[#141724] border border-[#252a3d] rounded-xl p-1">{(['GLOBAL', 'REGIONAL'] as const).map((item) => <button key={item} onClick={() => setScope(item)} className={`px-4 py-2 rounded-lg text-xs font-bold ${scope === item ? 'bg-[#ff2e83] text-white' : 'text-slate-400'}`}>{item}</button>)}</div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(({ label, value, change, icon: Icon }) => <div key={label} className="bg-[#11131c] border border-[#222638] rounded-2xl p-5"><Icon className="w-5 h-5 text-[#ff2e83]" /><div className="text-3xl font-black text-white mt-4">{value}</div><div className="text-sm text-slate-400 mt-1">{label}</div><div className="text-xs text-emerald-400 mt-3">{change}</div></div>)}</div>
      <section className="bg-[#11131c] border border-[#222638] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#222638] flex items-center gap-2"><Medal className="w-5 h-5 text-amber-400" /><h2 className="font-bold text-white">Ranking {scope.toLowerCase()}</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs uppercase text-slate-500 bg-[#0d0f16]"><tr><th className="text-left p-4">Posición</th><th className="text-left p-4">Equipo</th><th className="text-right p-4">Partidos</th><th className="text-right p-4">Victorias</th><th className="text-right p-4">Win rate</th><th className="text-right p-4">Puntos</th></tr></thead><tbody>{RANKING.map((row, index) => <tr key={row.team} className="border-t border-[#1e2230]"><td className="p-4 font-black text-[#ff2e83]">#{index + 1}</td><td className="p-4 font-bold text-white">{row.team}</td><td className="p-4 text-right text-slate-300">{row.played}</td><td className="p-4 text-right text-slate-300">{row.wins}</td><td className="p-4 text-right"><span className="inline-block w-20 h-1.5 bg-[#252a3d] rounded-full mr-2"><span className="block h-full bg-[#ff2e83] rounded-full" style={{ width: `${row.rate}%` }} /></span>{row.rate}%</td><td className="p-4 text-right font-black text-white">{row.points}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
};

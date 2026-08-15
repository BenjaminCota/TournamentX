import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Gamepad2, MapPin, Radio, Search } from 'lucide-react';
import { TabId } from '../shell/Sidebar';

interface CalendarViewProps { onNavigate: (tab: TabId) => void; }

const MATCHES = [
  { id: 'm-201', day: '14 AGO', time: '18:00', tournament: 'Valorant Masters LATAM', match: 'Luminex vs Team Nova', venue: 'Lobby MX-01', type: 'Esports', status: 'EN VIVO' },
  { id: 'm-202', day: '14 AGO', time: '20:30', tournament: 'Copa Metropolitana', match: 'Halcones vs Titanes', venue: 'Arena CDMX', type: 'Presencial', status: 'PROGRAMADO' },
  { id: 'm-203', day: '15 AGO', time: '17:00', tournament: 'Rocket League Open', match: 'Orbit vs Velocity', venue: 'Servidor US-East', type: 'Esports', status: 'PROGRAMADO' },
  { id: 'm-204', day: '16 AGO', time: '12:00', tournament: 'Liga Universitaria', match: 'UTM vs UTEZ', venue: 'Polideportivo Central', type: 'Presencial', status: 'PROGRAMADO' },
];

export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'TODOS' | 'ESPORTS' | 'PRESENCIAL'>('TODOS');
  const visible = useMemo(() => MATCHES.filter((item) => {
    const matchesQuery = `${item.tournament} ${item.match} ${item.venue}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === 'TODOS' || item.type.toUpperCase() === filter);
  }), [query, filter]);

  return (
    <div id="calendar-view" className="p-6 lg:p-8 max-w-7xl mx-auto space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase italic flex items-center gap-3"><CalendarDays className="w-8 h-8 text-[#ff2e83]" /> Calendario de partidos</h1>
          <p className="text-sm text-slate-400 mt-2">Agenda unificada de encuentros presenciales y esports.</p>
        </div>
        <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar torneo, equipo o sede" className="w-full bg-[#141724] border border-[#252a3d] rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#ff2e83]" /></div>
      </div>

      <div className="flex gap-2">{(['TODOS', 'ESPORTS', 'PRESENCIAL'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === item ? 'bg-[#ff2e83] text-white' : 'bg-[#141724] text-slate-400 border border-[#252a3d]'}`}>{item}</button>)}</div>

      <div className="grid gap-3">
        {visible.map((item) => (
          <article key={item.id} className="grid grid-cols-[88px_1fr] lg:grid-cols-[88px_120px_1fr_220px_120px] items-center gap-4 bg-[#11131c] border border-[#222638] rounded-2xl p-4 hover:border-[#ff2e83]/50 transition-colors">
            <div className="text-center border-r border-[#292e42] pr-4"><div className="text-xs text-[#ff2e83] font-bold">{item.day}</div><div className="text-xl font-black text-white">{item.time}</div></div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">{item.type === 'Esports' ? <Gamepad2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}{item.type}</div>
            <div><div className="text-xs text-slate-500">{item.tournament}</div><div className="font-bold text-white mt-1">{item.match}</div></div>
            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-300"><MapPin className="w-4 h-4 text-slate-500" />{item.venue}</div>
            <button onClick={() => onNavigate(item.status === 'EN VIVO' ? 'live_match' : 'tournaments')} className={`rounded-xl px-3 py-2 text-xs font-bold ${item.status === 'EN VIVO' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#1a1d2a] text-slate-300'}`}>{item.status === 'EN VIVO' ? <span className="flex items-center justify-center gap-1"><Radio className="w-3 h-3" /> VER</span> : <span className="flex items-center justify-center gap-1"><Clock3 className="w-3 h-3" /> DETALLE</span>}</button>
          </article>
        ))}
      </div>
    </div>
  );
};

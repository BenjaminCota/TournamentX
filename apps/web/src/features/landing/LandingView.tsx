import React from 'react';
import { ArrowRight, BarChart3, CalendarDays, Gamepad2, Gift, LayoutDashboard, MapPin, Trophy, Users, UsersRound } from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { TabId } from '../shell/Sidebar';

interface LandingViewProps {
  onEnterApp: (tab?: TabId) => void;
  onOpenCreateWizard: () => void;
  onOpenAuth: () => void;
}

const tournaments = [
  { sport: 'Fútbol', name: 'Liga Universitaria', date: '24 AGO', place: 'Estadio Central', teams: 16 },
  { sport: 'Baloncesto', name: 'Copa Regional', date: '30 AGO', place: 'Arena Norte', teams: 12 },
  { sport: 'Esports', name: 'TournamentX Open', date: '06 SEP', place: 'En línea', teams: 32 }
];

const visitorNavigation: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'tournaments', label: 'Torneos', icon: Trophy },
  { id: 'calendar', label: 'Partidos', icon: CalendarDays },
  { id: 'teams', label: 'Equipos', icon: UsersRound },
  { id: 'analytics', label: 'Estadísticas', icon: BarChart3 },
  { id: 'venues', label: 'Sedes', icon: MapPin },
  { id: 'rewards', label: 'Premios', icon: Gift },
];

export const LandingView: React.FC<LandingViewProps> = ({ onEnterApp, onOpenCreateWizard, onOpenAuth }) => (
  <div className="min-h-screen bg-[#0b0c10] text-white">
    <header className="sticky top-0 z-40 border-b border-white/[.08] bg-[#090a0e]/95 shadow-[0_8px_30px_rgba(0,0,0,.28)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1540px] items-center gap-3 px-4 lg:gap-5 lg:px-7">
        <div className="shrink-0 border-r border-white/[.08] pr-4"><TournamentXLogo size="sm" /></div>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2" aria-label="Navegación pública">
          {visitorNavigation.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => onEnterApp(id)} className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-400 transition-all hover:bg-white/[.05] hover:text-white">
              <Icon className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button type="button" onClick={onOpenAuth} className="shrink-0 rounded-xl bg-[#ff2e83] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#ff2e83]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ef2778]">Iniciar sesión</button>
      </div>
    </header>

    <main>
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-[1.1fr_.9fr] gap-14 items-center">
        <div>
          <p className="text-sm font-semibold text-[#ff2e83] mb-5">Deportes y esports en un solo lugar</p>
          <h1 className="font-brand text-6xl sm:text-7xl lg:text-8xl font-black uppercase leading-[.9] tracking-tight">Organiza.<br />Compite.<br /><span className="text-[#ff2e83]">Gana.</span></h1>
          <p className="mt-7 max-w-xl text-lg text-slate-400 leading-relaxed">Crea torneos, administra equipos, programa partidos y entrega premios desde una plataforma sencilla.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={onOpenCreateWizard} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#ff2e83] text-white font-semibold hover:bg-[#e11d48]">Crear un torneo <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => onEnterApp('tournaments')} className="px-6 py-3 rounded-lg border border-white/15 text-white font-semibold hover:bg-white/5">Ver torneos</button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#111218] p-7">
          <div className="flex items-center justify-between mb-6"><div><p className="text-sm text-slate-400">Próximo partido</p><h2 className="mt-1 text-xl font-bold">Final — Copa Universitaria</h2></div><span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold">Hoy</span></div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 py-8 border-y border-white/10 text-center"><div><div className="mx-auto w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center text-xl font-bold">AN</div><p className="mt-3 font-semibold">Atlético Norte</p></div><div className="text-slate-500 font-semibold">VS</div><div><div className="mx-auto w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center text-xl font-bold">RC</div><p className="mt-3 font-semibold">Real Central</p></div></div>
          <div className="pt-5 flex items-center justify-between text-sm text-slate-400"><span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> 19:30</span><span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Estadio Central</span></div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[.02]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[['48', 'Torneos activos'], ['320', 'Equipos'], ['1,840', 'Jugadores'], ['12', 'Sedes']].map(([value, label]) => <div key={label}><p className="text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-9"><div><p className="text-sm text-[#ff2e83] font-semibold">Próximamente</p><h2 className="mt-2 text-3xl font-bold">Torneos destacados</h2></div><button onClick={() => onEnterApp('tournaments')} className="text-sm text-slate-400 hover:text-white">Ver todos</button></div>
        <div className="grid md:grid-cols-3 gap-5">
          {tournaments.map((item) => <article key={item.name} className="rounded-xl border border-white/10 bg-[#111218] p-6 hover:border-white/20 transition-colors"><div className="flex justify-between"><span className="text-sm font-semibold text-[#ff2e83]">{item.sport}</span><span className="text-sm text-slate-500">{item.date}</span></div><h3 className="mt-6 text-xl font-bold">{item.name}</h3><div className="mt-5 flex items-center justify-between text-sm text-slate-400"><span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{item.place}</span><span className="flex items-center gap-2"><Users className="w-4 h-4" />{item.teams}</span></div></article>)}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20 grid sm:grid-cols-3 gap-5">
        {[{ icon: Trophy, title: 'Torneos y brackets', text: 'Organiza competencias y consulta el avance de cada ronda.' }, { icon: CalendarDays, title: 'Partidos y resultados', text: 'Programa encuentros y mantén los marcadores actualizados.' }, { icon: Gamepad2, title: 'Deporte y esports', text: 'Gestiona eventos presenciales, en línea o híbridos.' }].map(({ icon: Icon, title, text }) => <div key={title} className="p-6"><Icon className="w-6 h-6 text-[#ff2e83]" /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm text-slate-500 leading-relaxed">{text}</p></div>)}
      </section>
    </main>
    <footer className="border-t border-white/10"><div className="max-w-7xl mx-auto px-6 py-8"><TournamentXLogo size="sm" /></div></footer>
  </div>
);

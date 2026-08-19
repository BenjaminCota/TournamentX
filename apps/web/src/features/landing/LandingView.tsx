import React from 'react';
import { ArrowRight, CalendarDays, Gamepad2, Gift, MapPin, Trophy, Users, UsersRound } from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { Team, Tournament } from '../../types';
import { TabId } from '../shell/Sidebar';

interface LandingViewProps {
  onEnterApp: (tab?: TabId) => void;
  onOpenCreateWizard: () => void;
  onOpenAuth: () => void;
  teams: Team[];
  tournaments: Tournament[];
}

const visitorNavigation: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'tournaments', label: 'Torneos', icon: Trophy },
  { id: 'calendar', label: 'Partidos', icon: CalendarDays },
  { id: 'teams', label: 'Equipos', icon: UsersRound },
  { id: 'venues', label: 'Sedes', icon: MapPin },
  { id: 'rewards', label: 'Premios', icon: Gift },
];

export const LandingView: React.FC<LandingViewProps> = ({ onEnterApp, onOpenCreateWizard, onOpenAuth, teams, tournaments }) => {
  const publicTournaments = tournaments.filter((item) => item.status !== 'CANCELLED');
  const featured = publicTournaments.find((item) => ['OPEN', 'IN_PROGRESS', 'UPCOMING'].includes(item.status)) || publicTournaments[0];
  const rosterCount = teams.reduce((sum, team) => sum + team.roster.length, 0);
  const highlights = publicTournaments.slice(0, 3);
  return (
  <div className="tx-module-shell min-h-screen bg-[#0b0c10] text-white">
    <header className="sticky top-0 z-40 border-b border-white/[.08] bg-[#090a0e]/95 shadow-[0_8px_30px_rgba(0,0,0,.28)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1540px] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:gap-5 lg:px-7">
        <div className="shrink-0 border-r border-white/[.08] pr-2 sm:pr-4"><TournamentXLogo variant="icon" size="sm" className="sm:hidden"/><TournamentXLogo size="sm" className="hidden sm:flex" /></div>
        <nav className="tx-nav-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2" aria-label="Navegación pública">
          {visitorNavigation.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => onEnterApp(id)} className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-400 transition-all hover:bg-white/[.05] hover:text-white">
              <Icon className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button type="button" onClick={onOpenAuth} className="shrink-0 rounded-xl bg-[#ff2e83] px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#ff2e83]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ef2778] sm:px-4"><span className="sm:hidden">Entrar</span><span className="hidden sm:inline">Iniciar sesión</span></button>
      </div>
    </header>

    <main>
      <section className="tx-landing-hero mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:gap-14 lg:py-28">
        <div>
          <p className="tx-kicker mb-5">Deportes y esports en un solo lugar</p>
          <h1 className="tx-hero-title font-brand text-5xl min-[380px]:text-6xl sm:text-7xl lg:text-8xl font-black uppercase">Organiza.<br />Compite.<br /><span className="text-[#ff2e83]">Gana.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:mt-7 sm:text-lg">Crea torneos, administra equipos, programa partidos y entrega premios desde una plataforma sencilla.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={onOpenCreateWizard} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#ff2e83] text-white font-semibold hover:bg-[#e11d48]">Crear un torneo <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => onEnterApp('tournaments')} className="px-6 py-3 rounded-lg border border-white/15 text-white font-semibold hover:bg-white/5">Ver torneos</button>
          </div>
        </div>
        <div className="tx-spotlight rounded-3xl border border-[#8b5cf6]/25 bg-[radial-gradient(circle_at_100%_0,rgba(139,92,246,.16),transparent_38%),radial-gradient(circle_at_0_100%,rgba(79,124,255,.1),transparent_38%),#111218] p-5 sm:p-7">
          {featured ? <><div className="flex items-start justify-between gap-4 mb-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff69a8]">Competencia destacada</p><h2 className="mt-2 text-2xl font-black">{featured.name}</h2><p className="mt-1 text-sm text-slate-500">{featured.game} · {featured.format.replaceAll('_', ' ')}</p></div><span className="status-chip text-emerald-300">{featured.status}</span></div>
          <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-6"><div className="min-w-0 rounded-2xl bg-black/20 p-3 sm:p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Inscripciones</p><strong className="mt-2 block text-xl sm:text-2xl">{featured.registeredTeams}/{featured.maxTeams}</strong></div><div className="min-w-0 rounded-2xl bg-black/20 p-3 sm:p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Premio</p><strong className="mt-2 block break-words text-xl text-[#d6b15e] sm:text-2xl">{featured.prizePool || `$${featured.prizeAmountUSD.toLocaleString()}`}</strong></div></div>
          <div className="pt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"><span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {featured.dates || 'Fechas por confirmar'}</span><span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {featured.venue || 'Modalidad en línea'}</span></div></> : <div className="py-12 text-center"><Trophy className="mx-auto h-9 w-9 text-[#ff2e83]"/><h2 className="mt-4 text-xl font-bold">La próxima competencia empieza aquí</h2><p className="mt-2 text-sm text-slate-500">Crea un torneo para publicar su ficha en portada.</p></div>}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 py-10 sm:gap-8 sm:px-6 md:grid-cols-4">
          {[[String(tournaments.length), 'Torneos registrados', '#ff2e83'], [String(teams.length), 'Equipos', '#8b5cf6'], [String(rosterCount), 'Jugadores en plantilla', '#22d3ee'], ['10', 'Señales oficiales', '#f5b942']].map(([value, label, color]) => <div key={label} className="border-l-2 pl-4" style={{ borderColor: color }}><p className="text-3xl font-black text-white">{value}</p><p className="mt-1 text-sm text-slate-400">{label}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-9 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-[#ff2e83] font-semibold">Circuito TournamentX</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Competencias registradas</h2></div><button onClick={() => onEnterApp('tournaments')} className="text-sm text-slate-400 hover:text-white">Ver todas</button></div>
        <div className="grid md:grid-cols-3 gap-5">
          {highlights.map((item) => <article key={item.id} className="tx-card rounded-2xl border border-white/10 bg-[#111218] p-6"><div className="flex justify-between gap-3"><span className="text-sm font-semibold text-[#ff2e83]">{item.game}</span><span className="text-[10px] font-bold text-slate-500">{item.status}</span></div><h3 className="mt-6 text-xl font-bold">{item.name}</h3><div className="mt-5 flex items-center justify-between text-sm text-slate-400"><span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{item.venue || 'En línea'}</span><span className="flex items-center gap-2"><Users className="w-4 h-4" />{item.registeredTeams}/{item.maxTeams}</span></div></article>)}
          {highlights.length === 0 && <div className="md:col-span-3 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Aún no hay competencias publicadas.</div>}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-14 sm:grid-cols-3 sm:px-6 sm:pb-20">
        {[{ icon: Trophy, title: 'Torneos y brackets', text: 'Organiza competencias y consulta el avance de cada ronda.' }, { icon: CalendarDays, title: 'Partidos y resultados', text: 'Programa encuentros y mantén los marcadores actualizados.' }, { icon: Gamepad2, title: 'Deporte y esports', text: 'Gestiona eventos presenciales, en línea o híbridos.' }].map(({ icon: Icon, title, text }) => <div key={title} className="p-6"><Icon className="w-6 h-6 text-[#ff2e83]" /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm text-slate-500 leading-relaxed">{text}</p></div>)}
      </section>
    </main>
    <footer className="border-t border-white/10"><div className="max-w-7xl mx-auto px-6 py-8"><TournamentXLogo size="sm" /></div></footer>
  </div>
  );
};

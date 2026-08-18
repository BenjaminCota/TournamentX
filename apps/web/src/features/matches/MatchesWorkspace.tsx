import React from 'react';
import { ArrowLeft, CalendarDays, Radio, Tv2 } from 'lucide-react';
import { UserRole } from '../../types';
import { TabId } from '../shell/Sidebar';
import { EsportsArenaView } from '../media/EsportsArenaView';
import { CalendarView } from './CalendarView';
import { LiveMatchView } from './LiveMatchView';

interface MatchesWorkspaceProps {
  section: 'calendar' | 'esports' | 'live_match';
  currentUserRole: UserRole;
  currentUserId?: string;
  selectedMatchId?: string;
  onNavigate: (tab: TabId) => void;
  onOpenMatch: (matchId: string) => void;
}

const sections = [
  { id: 'calendar' as const, label: 'Agenda', helper: 'Calendario y resultados', icon: CalendarDays },
  { id: 'esports' as const, label: 'Transmisiones', helper: 'Directos, marcador y salas', icon: Tv2 },
];

export const MatchesWorkspace: React.FC<MatchesWorkspaceProps> = ({ section, currentUserRole, currentUserId, selectedMatchId, onNavigate, onOpenMatch }) => (
  <div className="tx-module-shell min-h-screen bg-[#0a0b0e]">
    <section className="border-b border-white/[.07] bg-[radial-gradient(circle_at_76%_0%,rgba(255,46,131,.11),transparent_32%),#0d0e13] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#ff69a8]"><Radio className="h-3.5 w-3.5" /> Centro de competencia</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Partidos y transmisiones</h1>
          <p className="mt-1 text-xs leading-5 text-slate-400">Consulta la agenda, sigue el marcador y cambia a la señal oficial sin salir del partido.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section === 'live_match' && <button type="button" onClick={() => onNavigate('calendar')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-[#ff2e83]/40 hover:text-white"><ArrowLeft className="h-4 w-4"/> Volver a la agenda</button>}
          <div className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-white/[.08] bg-black/25 p-1.5 sm:w-auto" role="tablist" aria-label="Secciones de partidos">
          {sections.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button type="button" role="tab" aria-selected={active} key={item.id} onClick={() => onNavigate(item.id)} className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left sm:min-w-44 sm:gap-3 sm:px-4 ${active ? 'bg-white/[.09] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}>
                <Icon className={`h-4 w-4 ${active ? 'text-[#ff4b94]' : ''}`} />
                <span><b className="block text-xs">{item.label}</b><small className="block text-[10px] font-normal text-slate-500">{item.helper}</small></span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </section>

    {section === 'calendar' && <CalendarView onOpenMatch={onOpenMatch} />}
    {section === 'esports' && <EsportsArenaView currentUserRole={currentUserRole} />}
    {section === 'live_match' && <LiveMatchView currentUserRole={currentUserRole} currentUserId={currentUserId} matchId={selectedMatchId} />}
  </div>
);

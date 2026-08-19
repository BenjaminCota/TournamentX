import React, { useMemo, useState } from 'react';
import { Trash2, UsersRound } from 'lucide-react';
import { Team, UserRole } from '../../types';

interface AdminTeamsViewProps {
  currentUserRole: UserRole;
  teams: Team[];
  onDissolveTeam: (id: string) => Promise<void> | void;
}

export const AdminTeamsView: React.FC<AdminTeamsViewProps> = ({ currentUserRole, teams, onDissolveTeam }) => {
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const activeTeams = useMemo(() => teams.filter((team) => team.status === 'active'), [teams]);

  if (currentUserRole !== 'Admin') return null;

  const removeTeam = async (team: Team) => {
    if (!window.confirm(`¿Eliminar el equipo "${team.name}"? Sus integrantes quedarán sin equipo y el historial se conservará.`)) return;
    setBusyId(team.id);
    try {
      await onDissolveTeam(team.id);
      setMessage(`El equipo "${team.name}" fue dado de baja.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo dar de baja el equipo.');
    } finally {
      setBusyId('');
    }
  };

  return <section className="surface mx-auto mt-6 max-w-7xl overflow-hidden rounded-3xl">
    <header className="flex items-center gap-2 border-b border-white/10 p-5">
      <UsersRound className="h-5 w-5 text-[#ff2e83]"/>
      <div><h2 className="font-bold text-white">Equipos activos</h2><p className="text-xs text-slate-500">Dar de baja conserva el historial y deja a los integrantes sin equipo.</p></div>
    </header>
    {message && <div role="status" className="mx-5 mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{message}</div>}
    {activeTeams.length === 0 ? <p className="p-6 text-sm text-slate-500">No hay equipos activos.</p> : <div className="divide-y divide-white/[.06]">{activeTeams.map((team) => <article key={team.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{team.name}</h3><span className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300">{team.tag}</span></div><p className="mt-1 text-xs text-slate-400">{team.sport || 'Sin deporte'} · {team.region || 'Sin región'} · {team.roster.length} integrante(s)</p><p className="mt-2 text-xs text-slate-300"><strong>Capitán:</strong> {team.roster.find((member) => member.role === 'Capitán' || member.role === 'Captain')?.name || 'Por asignar'}</p></div><button disabled={busyId === team.id} onClick={() => void removeTeam(team)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/[.08] px-4 py-2.5 text-xs font-bold text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4"/>{busyId === team.id ? 'ELIMINANDO…' : 'ELIMINAR EQUIPO'}</button></article>)}</div>}
  </section>;
};

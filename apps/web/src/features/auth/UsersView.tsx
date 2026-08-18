import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { AuthUser, OrganizerRequest, UserRole } from '../../types';
import { tournamentXApi } from '../../services/apiClient';

interface UsersViewProps { currentUserRole: UserRole }
const roles: Array<{ value: AuthUser['role']; label: UserRole }> = [
  { value: 'admin', label: 'Admin' }, { value: 'organizer', label: 'Organizador' },
  { value: 'referee', label: 'Árbitro' }, { value: 'captain', label: 'Capitán' },
  { value: 'player', label: 'Jugador' }, { value: 'spectator', label: 'Espectador' },
];

export const UsersView: React.FC<UsersViewProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [requests, setRequests] = useState<OrganizerRequest[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [accounts, organizerRequests] = await Promise.all([tournamentXApi.users(), tournamentXApi.organizerRequests()]);
      setUsers(accounts.data); setRequests(organizerRequests.data); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const update = async (user: AuthUser, changes: Partial<AuthUser>) => {
    try { const body = await tournamentXApi.updateUser(user.id, changes); setUsers((current) => current.map((item) => item.id === user.id ? body.user : item)); setMessage('Permisos actualizados'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar'); }
  };
  const decide = async (request: OrganizerRequest, decision: 'approve' | 'reject') => {
    try {
      const body = await tournamentXApi.decideOrganizerRequest(request.id, { decision, reviewNote: decision === 'approve' ? 'Credencial aprobada desde el panel' : 'Credencial rechazada desde el panel' });
      setRequests((current) => current.map((item) => item.id === request.id ? body.request : item));
      if (decision === 'approve') setUsers((current) => current.map((item) => item.id === body.request.applicant.id ? body.request.applicant : item));
      setMessage(decision === 'approve' ? 'Organizador aprobado.' : 'Solicitud rechazada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo revisar la solicitud'); }
  };

  if (currentUserRole !== 'Admin') return <div className="surface mx-auto mt-16 max-w-xl rounded-3xl p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#ff2e83]"/><h1 className="mt-4 text-2xl font-black">Acceso administrativo</h1><p className="mt-2 text-sm text-slate-400">Solo un administrador puede cambiar cuentas y roles.</p></div>;
  const shown = users.filter((user) => `${user.name} ${user.email} ${user.roleLabel}`.toLowerCase().includes(query.toLowerCase()));
  const pending = requests.filter((request) => request.status === 'PENDING');

  return <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="text-[11px] font-black tracking-[.2em] text-[#ff5ba0]">IDENTIDAD Y PERMISOS</span><h1 className="mt-1 font-brand text-5xl font-black uppercase italic">Usuarios y roles</h1><p className="mt-2 text-sm text-slate-400">Las cuentas y solicitudes se validan desde el servidor.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/> Actualizar</button></header>
    {message && <div className="rounded-xl border border-[#ff2e83]/20 bg-[#ff2e83]/10 p-3 text-sm text-slate-200">{message}</div>}

    <section className="surface rounded-3xl p-5"><div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-[#ff2e83]"/><h2 className="font-bold text-white">Solicitudes de organizador</h2><span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">{pending.length} pendientes</span></div>
      {pending.length === 0 ? <p className="text-sm text-slate-500">No hay solicitudes pendientes.</p> : <div className="space-y-3">{pending.map((request) => <article key={request.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center"><div><strong className="text-white">{request.organizationName}</strong><p className="mt-1 text-xs text-slate-400">{request.applicant.name} · {request.applicant.email}</p><p className="mt-1 text-xs text-slate-500">Credencial: {request.credentialReference}</p></div><div className="flex gap-2"><button onClick={() => void decide(request, 'reject')} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">Rechazar</button><button onClick={() => void decide(request, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Aprobar organizador</button></div></article>)}</div>}
    </section>

    <section className="surface overflow-hidden rounded-3xl"><div className="flex flex-col justify-between gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-[#ff2e83]"/><strong>{users.length} cuentas</strong></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm" placeholder="Buscar cuenta"/></label></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-white/[.02] text-[10px] uppercase text-slate-500"><tr><th className="p-4 text-left">Usuario</th><th className="p-4 text-left">Rol</th><th className="p-4 text-left">Estado</th><th className="p-4 text-right">Control</th></tr></thead><tbody>{shown.map((user) => <tr key={user.id} className="border-t border-white/[.06]"><td className="p-4"><strong className="block text-white">{user.name}</strong><span className="text-xs text-slate-500">{user.email}</span></td><td className="p-4"><select value={user.role} onChange={(event) => void update(user, { role: event.target.value as AuthUser['role'] })} className="rounded-lg border border-white/10 bg-[#141721] px-3 py-2 text-xs">{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></td><td className="p-4"><span className={`text-xs font-bold ${user.status === 'ACTIVE' ? 'text-emerald-400' : user.status === 'SUSPENDED' ? 'text-red-400' : 'text-slate-400'}`}>{user.status}</span></td><td className="p-4 text-right"><button onClick={() => void update(user, { status: user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' })} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-[#ff2e83]/50"><UserCog className="h-3.5 w-3.5"/>{user.status === 'SUSPENDED' ? 'Reactivar' : 'Suspender'}</button></td></tr>)}</tbody></table></div>
    </section>
  </div>;
};

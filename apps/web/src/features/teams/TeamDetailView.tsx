import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Link2, Pencil, Plus, Share2, Star, Swords, Trash2, Users } from 'lucide-react';
import { Team, User, UserRole } from '../../types';
import { MOCK_TEAMS } from '../../data/mockData';
import { TabId } from '../shell/Sidebar';
import { tournamentXApi } from '../../services/apiClient';

interface TeamDetailViewProps {
  teamId?: string;
  teams?: Team[];
  players?: User[];
  currentUserRole: UserRole;
  currentUserId?: string;
  onNavigate: (tab: TabId) => void;
  onSelectTeam?: (teamId: string) => void;
  onCreateTeam?: (team: Partial<Team>) => Promise<Team> | Team;
  onUpdateTeam?: (teamId: string, team: Partial<Team>) => Promise<Team> | Team;
  onAddRosterMember?: (teamId: string, playerId: string, role: string) => Promise<{ ok: boolean; message: string }> | { ok: boolean; message: string };
  onRemoveRosterMember?: (teamId: string, playerId: string) => void | Promise<void>;
}

export const TeamDetailView: React.FC<TeamDetailViewProps> = ({
  teamId = 'team-lnx',
  teams = MOCK_TEAMS,
  players = [],
  currentUserRole,
  currentUserId,
  onNavigate,
  onSelectTeam,
  onCreateTeam,
  onUpdateTeam,
  onAddRosterMember,
  onRemoveRosterMember,
}) => {
  const [activeTab, setActiveTab] = useState<'RESUMEN' | 'ROSTER' | 'PARTIDOS' | 'ESTADÍSTICAS' | 'HISTORIAL'>('ROSTER');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [teamForm, setTeamForm] = useState<Partial<Team>>({});
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('Capitán');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [invitationCode, setInvitationCode] = useState('');
  const [joinRequests, setJoinRequests] = useState<Array<{ id: string; playerId: string; status: string; player?: User }>>([]);
  const [teamFlowMessage, setTeamFlowMessage] = useState('');

  const currentTeam = useMemo(() => teams.find((team) => team.id === teamId) || teams[0] || MOCK_TEAMS[0], [teamId, teams]);
  const canManage = currentUserRole === 'Admin' || currentUserRole === 'Organizador' || (currentUserRole === 'Capitán' && currentTeam.captainUserId === currentUserId);

  useEffect(() => {
    if (!canManage || !currentTeam.id) { setJoinRequests([]); return; }
    tournamentXApi.teamJoinRequests(currentTeam.id).then((response) => setJoinRequests(response.data)).catch(() => setJoinRequests([]));
  }, [canManage, currentTeam.id]);

  const createInvitation = async () => {
    try { const result = await tournamentXApi.createTeamInvitation(currentTeam.id, { expiresInHours: 72, rosterRole: 'Jugador' }); setInvitationCode(result.invitation.code); setTeamFlowMessage('Invitación creada. Comparte el código con el jugador.'); }
    catch (error) { setTeamFlowMessage(error instanceof Error ? error.message : 'No se pudo crear la invitación'); }
  };
  const decideJoinRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    try { await tournamentXApi.decideTeamJoinRequest(currentTeam.id, requestId, decision); setJoinRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: decision === 'approve' ? 'APPROVED' : 'REJECTED' } : item)); setTeamFlowMessage(decision === 'approve' ? 'Jugador agregado al roster.' : 'Solicitud rechazada.'); }
    catch (error) { setTeamFlowMessage(error instanceof Error ? error.message : 'No se pudo revisar la solicitud'); }
  };

  const availablePlayers = useMemo(() => {
    return players.filter((player) => !currentTeam.roster.some((member) => member.playerId === player.id));
  }, [currentTeam.roster, players]);

  const filteredAvailablePlayers = useMemo(() => availablePlayers.filter((player) => {
    const term = searchText.toLowerCase();
    return (
      player.name.toLowerCase().includes(term) ||
      (player.username ?? '').toLowerCase().includes(term) ||
      (player.teamName ?? '').toLowerCase().includes(term)
    );
  }), [availablePlayers, searchText]);

  const openTeamModal = (mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setTeamForm({
        name: '',
        abbreviation: '',
        logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
        sport: 'Valorant',
        region: 'LATAM',
        competitionType: 'Regional',
        description: '',
        status: 'active',
      });
    } else {
      setTeamForm({
        ...currentTeam,
        tag: currentTeam.tag || currentTeam.abbreviation || 'NEW',
        abbreviation: currentTeam.abbreviation || currentTeam.tag || 'NEW',
        description: currentTeam.description || currentTeam.bio,
      });
    }
    setShowTeamModal(true);
  };

  const saveTeam = async () => {
    const payload = {
      ...teamForm,
      id: teamForm.id || currentTeam.id || `team-${Date.now()}`,
      name: teamForm.name || currentTeam.name,
      abbreviation: teamForm.abbreviation || teamForm.tag || currentTeam.tag,
      tag: teamForm.tag || teamForm.abbreviation || currentTeam.tag,
      logo: teamForm.logo || currentTeam.logo,
      sport: teamForm.sport || currentTeam.sport || 'Valorant',
      region: teamForm.region || currentTeam.region,
      competitionType: teamForm.competitionType || currentTeam.competitionType || 'Regional',
      description: teamForm.description || currentTeam.description || currentTeam.bio,
      bio: teamForm.description || currentTeam.description || currentTeam.bio,
      status: teamForm.status || currentTeam.status || 'active',
      roster: currentTeam.roster,
    } as Team;

    if (teamForm.id || currentTeam.id) {
      if (onUpdateTeam) {
        await onUpdateTeam(currentTeam.id, payload);
      }
    } else if (onCreateTeam) {
      const created = await onCreateTeam(payload);
      if (onSelectTeam && created.id) onSelectTeam(created.id);
    }

    setShowTeamModal(false);
  };

  const addRosterMember = async () => {
    if (!selectedPlayerId || !onAddRosterMember) return;
    const result = await onAddRosterMember(currentTeam.id, selectedPlayerId, selectedRole);
    if (result.ok) {
      setShowRosterModal(false);
      setSelectedPlayerId('');
      setSelectedRole('Capitán');
      setSearchText('');
    }
  };

  const removeRosterMember = async (playerId: string) => {
    if (!onRemoveRosterMember) return;
    await onRemoveRosterMember(currentTeam.id, playerId);
  };

  return (
    <div id="team-profile-detail-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <button onClick={() => onNavigate('teams')} className="inline-flex items-center gap-2 text-xs font-mono-code font-bold uppercase text-slate-400 hover:text-white transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" />
        <span>← VOLVER A EQUIPOS</span>
      </button>

      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#171927] via-[#12141f] to-[#1a1524] border border-[#ff2e83]/30 p-6 lg:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#202438] border-2 border-[#ff2e83]/50 p-2 flex items-center justify-center font-display font-black text-3xl text-white shadow-xl">
              <img src={currentTeam.logo} alt={currentTeam.name} className="w-full h-full object-cover rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-[#ff2e83]/20 border border-[#ff2e83]/40 text-[#ff2e83] font-mono-code font-bold text-[11px]">{currentTeam.tier} [{currentTeam.tag}]</span>
                <span className="text-xs font-mono-code text-slate-400">Región: {currentTeam.region}</span>
              </div>

              <h1 className="font-brand font-black text-4xl sm:text-5xl text-white uppercase tracking-tight italic">{currentTeam.name}</h1>
              <p className="text-xs text-slate-300 max-w-xl line-clamp-2 leading-relaxed">{currentTeam.bio || currentTeam.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {canManage && <button onClick={() => openTeamModal('edit')} className="px-4 py-2.5 rounded-xl border border-[#ff2e83]/40 bg-[#ff2e83]/10 text-[#ff2e83] font-black text-xs uppercase flex items-center gap-2"><Pencil className="w-4 h-4" /> Editar equipo</button>}
            <button onClick={() => setIsFollowing(!isFollowing)} className={`px-6 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer font-tech ${isFollowing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#ff2e83] hover:bg-[#e11d48] text-white shadow-lg shadow-[#ff2e83]/30'}`}>
              <Star className="w-4 h-4" />
              <span>{isFollowing ? 'SIGUIENDO' : '＋ SEGUIR'}</span>
            </button>
            <button className="p-2.5 rounded-xl bg-[#181b28] hover:bg-[#222638] text-slate-300 border border-[#282d42]"><Share2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1e2230]">
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center"><div className="text-[10px] font-tech uppercase text-slate-400 font-bold">RANGO GLOBAL</div><div className="font-brand font-black text-3xl text-amber-400 mt-1">#{currentTeam.globalRank || 0}</div></div>
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center"><div className="text-[10px] font-tech uppercase text-slate-400 font-bold">WIN RATE</div><div className="font-brand font-black text-3xl text-emerald-400 mt-1">{currentTeam.winRate || 0}%</div></div>
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center"><div className="text-[10px] font-tech uppercase text-slate-400 font-bold">PARTIDOS JUGADOS</div><div className="font-brand font-black text-3xl text-white mt-1">{currentTeam.matchesPlayed || 0}</div></div>
          <div className="p-4 rounded-2xl bg-[#0f111a] border border-[#1e2230] text-center"><div className="text-[10px] font-tech uppercase text-slate-400 font-bold">W / L / T</div><div className="font-brand font-black text-3xl text-slate-200 mt-1">{currentTeam.record?.wins ?? 0} / {currentTeam.record?.losses ?? 0} / {currentTeam.record?.ties ?? 0}</div></div>
        </div>

        <div className="flex items-center gap-2 border-b border-[#1e2230] pt-2 overflow-x-auto">
          {(['RESUMEN', 'ROSTER', 'PARTIDOS', 'ESTADÍSTICAS', 'HISTORIAL'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 text-xs font-bold tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${activeTab === tab ? 'border-[#ff2e83] text-[#ff2e83] bg-[#ff2e83]/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {canManage && <section className="rounded-3xl border border-[#ff2e83]/25 bg-[#10121a] p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-white"><Link2 className="h-5 w-5 text-[#ff2e83]"/> Invitaciones del equipo</h2><p className="mt-1 text-xs text-slate-400">El capitán comparte un código y aprueba la entrada al roster.</p></div><button onClick={() => void createInvitation()} className="rounded-xl bg-[#ff2e83] px-4 py-2.5 text-xs font-bold text-white">CREAR CÓDIGO</button></div>{invitationCode && <button onClick={() => void navigator.clipboard?.writeText(invitationCode)} className="flex w-full items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/[.06] px-4 py-3 text-left"><span className="font-mono text-lg font-black tracking-[.25em] text-emerald-300">{invitationCode}</span><Copy className="h-4 w-4 text-emerald-300"/></button>}{joinRequests.filter((item) => item.status === 'PENDING').map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span className="text-sm text-slate-300">{item.player?.name || item.playerId} quiere entrar</span><span className="flex gap-2"><button onClick={() => void decideJoinRequest(item.id, 'reject')} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">Rechazar</button><button onClick={() => void decideJoinRequest(item.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Aceptar</button></span></div>)}{teamFlowMessage && <p className="text-xs text-slate-300">{teamFlowMessage}</p>}</section>}

      {activeTab === 'ROSTER' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2"><Users className="w-5 h-5 text-[#ff2e83]" /> PLANTILLA ACTIVA ({currentTeam.roster.length} JUGADORES)</h2>
            <div className="flex items-center gap-3">
              {canManage && <button onClick={() => setShowRosterModal(true)} className="px-4 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-black text-xs uppercase flex items-center gap-2"><Plus className="w-4 h-4" /> + AGREGAR JUGADOR</button>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentTeam.roster.map((player) => (
              <div key={player.playerId || player.id} className="group rounded-3xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83] transition-all overflow-hidden p-5 flex flex-col justify-between space-y-4 shadow-xl hover:shadow-[#ff2e83]/10">
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <img src={player.avatar} alt={player.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#ff2e83]/40 group-hover:ring-[#ff2e83] transition-all" />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-[#10121a]"></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate('players')} className="p-1.5 rounded-lg bg-[#181b28] hover:bg-[#202435] text-slate-300"><Pencil className="w-3.5 h-3.5" /></button>
                    {canManage && <button onClick={() => removeRosterMember(player.playerId || player.id)} className="p-1.5 rounded-lg bg-[#181b28] hover:bg-red-900/40 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-[#ff2e83] transition-colors">{player.nickname}</h3>
                  <div className="text-[11px] font-mono-code text-slate-400 uppercase font-bold tracking-wider mt-0.5">{player.role}</div>
                </div>

                <div className="pt-3 border-t border-[#1e2230] flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-500">K/D Ratio:</span>
                  <span className="font-bold text-emerald-400">{player.kda}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141724] to-[#1a1224] border border-[#282d42] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#23283d] flex items-center justify-center text-[#ff2e83]"><Swords className="w-6 h-6" /></div>
              <div>
                <span className="text-[10px] font-mono-code uppercase font-bold text-red-400 animate-pulse">● PRÓXIMO PARTIDO • HOY 20:00 EST</span>
                <h4 className="font-display font-bold text-lg text-white">{currentTeam.name.toUpperCase()} [LNX] VS AERO CLAN [AER]</h4>
                <p className="text-xs text-slate-400">Pro League S5 • Semifinales (BO3)</p>
              </div>
            </div>

            <button onClick={() => onNavigate('live_match')} className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 transition-all cursor-pointer whitespace-nowrap">VER DETALLES →</button>
          </div>
        </div>
      )}

      {showTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141e] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <h3 className="font-display font-black text-2xl text-white">{teamForm.id || currentTeam.id ? 'EDITAR EQUIPO' : '＋ CREAR EQUIPO'}</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Nombre</label>
                <input value={teamForm.name ?? ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Abreviatura</label>
                <input value={teamForm.abbreviation ?? teamForm.tag ?? ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, abbreviation: e.target.value, tag: e.target.value }))} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Logo</label>
              <input value={teamForm.logo ?? ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, logo: e.target.value }))} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Videojuego</label>
                <input value={teamForm.sport ?? 'Valorant'} onChange={(e) => setTeamForm((prev) => ({ ...prev, sport: e.target.value }))} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Región</label>
                <input value={teamForm.region ?? 'LATAM'} onChange={(e) => setTeamForm((prev) => ({ ...prev, region: e.target.value }))} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Tipo de competencia</label>
              <input value={teamForm.competitionType ?? 'Regional'} onChange={(e) => setTeamForm((prev) => ({ ...prev, competitionType: e.target.value }))} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
            </div>

            <div>
              <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Descripción</label>
              <textarea value={teamForm.description ?? teamForm.bio ?? ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, description: e.target.value, bio: e.target.value }))} rows={4} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1" />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e2230]">
              <button type="button" onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancelar</button>
              <button type="button" onClick={saveTeam} className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141e] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <h3 className="font-display font-black text-2xl text-white">＋ AGREGAR JUGADOR</h3>
              <button onClick={() => setShowRosterModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Buscar jugador</label>
                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por nombre o nickname..." className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1" />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredAvailablePlayers.length > 0 ? filteredAvailablePlayers.map((player) => (
                  <button key={player.id} type="button" onClick={() => setSelectedPlayerId(player.id)} className={`w-full rounded-2xl border p-3 flex items-center justify-between text-left ${selectedPlayerId === player.id ? 'border-[#ff2e83] bg-[#ff2e83]/5' : 'border-[#1e2230] bg-[#10121a]'}`}>
                    <div className="flex items-center gap-3">
                      <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-white">{player.name}</div>
                        <div className="text-[11px] font-mono-code text-slate-400">{player.username}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase text-slate-300 font-mono-code">{player.role}</span>
                  </button>
                )) : <div className="text-sm text-slate-400">No hay jugadores disponibles para añadir.</div>}
              </div>

              {selectedPlayerId && (
                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Rol</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1">
                    <option value="Capitán">Capitán</option>
                    <option value="Duelista">Duelista</option>
                    <option value="Entry Fragger">Entry Fragger</option>
                    <option value="Support">Support</option>
                    <option value="Controlador">Controlador</option>
                    <option value="Jugador">Jugador</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e2230]">
              <button type="button" onClick={() => setShowRosterModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancelar</button>
              <button type="button" onClick={addRosterMember} className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30">Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

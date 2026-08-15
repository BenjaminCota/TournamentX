import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Ban, 
  CheckCircle,
  Trash2
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { INITIAL_USERS } from '../../data/mockData';

interface PlayersViewProps {
  currentUserRole: UserRole;
}

export const PlayersView: React.FC<PlayersViewProps> = ({ currentUserRole }) => {
  const [players, setPlayers] = useState<User[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Player Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Jugador');
  const [formTeam, setFormTeam] = useState('Luminex Esports');
  const formStatus: 'ACTIVE' = 'ACTIVE';

  const canManage = currentUserRole === 'Admin' || currentUserRole === 'Organizador' || currentUserRole === 'Capitán';

  // Filter logic
  const filteredPlayers = players.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlayer: User = {
      id: `usr-${Date.now()}`,
      name: formName,
      username: formUsername.startsWith('@') ? formUsername : `@${formUsername}`,
      email: formEmail,
      role: formRole,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      teamName: formTeam,
      status: formStatus,
      lastActivity: 'Just now',
      ratingOVR: 85
    };

    setPlayers([newPlayer, ...players]);
    setShowAddModal(false);
    // Reset form
    setFormName('');
    setFormUsername('');
    setFormEmail('');
  };

  const handleToggleStatus = (id: string) => {
    if (!canManage) return;
    setPlayers(players.map(p => {
      if (p.id === id) {
        const nextStatus = p.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  const handleDeletePlayer = (id: string) => {
    if (!canManage) return;
    if (confirm('¿Estás seguro de eliminar este jugador del roster oficial?')) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  return (
    <div id="players-management-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER (Image 13) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-tight italic">
            GESTIÓN DE JUGADORES & ROSTERS
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-tech">
            Control de altas, roles competitivos, ratings OVR y asignación de plantillas
          </p>
        </div>

        {canManage && (
          <button
            id="btn-add-player"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto font-tech"
          >
            <Plus className="w-4 h-4" />
            <span>＋ REGISTRAR JUGADOR</span>
          </button>
        )}
      </div>

      {/* FILTER CONTROLS BAR (Image 13) */}
      <div className="p-4 rounded-2xl bg-[#10121a] border border-[#1e2230] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search players by name, @user, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141724] text-xs text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 border border-[#1e2230] focus:border-[#ff2e83] focus:outline-none transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code text-slate-400">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#141724] border border-[#1e2230] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff2e83] cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Organizador">Organizador</option>
              <option value="Árbitro">Árbitro</option>
              <option value="Capitán">Capitán</option>
              <option value="Jugador">Jugador</option>
              <option value="Espectador">Espectador</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#141724] border border-[#1e2230] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff2e83] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>
        </div>
      </div>

      {/* PLAYERS TABLE (Image 13) */}
      <div className="rounded-3xl bg-[#10121a] border border-[#1e2230] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e2230] bg-[#141724] text-slate-400 font-mono-code">
                <th className="py-4 px-6">PLAYER</th>
                <th className="py-4 px-4">ROLE</th>
                <th className="py-4 px-4">TEAM</th>
                <th className="py-4 px-4">STATUS</th>
                <th className="py-4 px-4">LAST ACTIVITY</th>
                <th className="py-4 px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2230]">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-[#141724]/80 transition-colors">
                  {/* Player info & Avatar (Image 13) */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#1e2230]"
                      />
                      <div>
                        <div className="font-bold text-white text-sm">{player.name}</div>
                        <div className="text-[11px] font-mono-code text-slate-400">{player.username}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono-code ${
                      player.role === 'Admin' 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : player.role === 'Capitán'
                        ? 'bg-[#ff2e83]/20 text-[#ff2e83] border border-[#ff2e83]/30'
                        : player.role === 'Organizador'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-700/20 text-slate-300'
                    }`}>
                      {player.role}
                    </span>
                  </td>

                  {/* Team */}
                  <td className="py-4 px-4 font-medium text-slate-200">
                    {player.teamName || (
                      <span className="text-slate-500 italic">Free Agent</span>
                    )}
                  </td>

                  {/* Status (ACTIVE, OFFLINE, SUSPENDED) (Image 13) */}
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit ${
                      player.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : player.status === 'OFFLINE'
                        ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        player.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : player.status === 'OFFLINE' ? 'bg-slate-400' : 'bg-red-400'
                      }`}></span>
                      {player.status}
                    </span>
                  </td>

                  {/* Last Activity */}
                  <td className="py-4 px-4 text-slate-400 font-mono-code text-[11px]">
                    {player.lastActivity}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(player.id)}
                            title={player.status === 'ACTIVE' ? 'Suspender jugador' : 'Activar jugador'}
                            className="p-1.5 rounded-lg bg-[#181b28] hover:bg-[#202435] text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {player.status === 'ACTIVE' ? <Ban className="w-3.5 h-3.5 text-amber-400" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            title="Eliminar de roster"
                            className="p-1.5 rounded-lg bg-[#181b28] hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count (Image 13) */}
        <div className="p-4 bg-[#141724] border-t border-[#1e2230] flex items-center justify-between text-xs text-slate-400 font-mono-code">
          <span>Mostrando {filteredPlayers.length} de {players.length} jugadores registrados</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 rounded bg-[#ff2e83] text-white font-bold">1</button>
            <button className="px-3 py-1 rounded bg-[#181b28] text-slate-400 hover:text-white">2</button>
            <button className="px-3 py-1 rounded bg-[#181b28] text-slate-400 hover:text-white">3</button>
          </div>
        </div>
      </div>

      {/* ADD PLAYER MODAL */}
      {showAddModal && (
        <div 
          id="modal-add-player"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#12141e] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <h3 className="font-display font-black text-2xl text-white">
                ＋ Añadir Jugador al Roster
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPlayerSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Lucas Ferreira"
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                  Username / Nickname
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="@lucas_phantom"
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="lucas@luminex.gg"
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Rol
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1"
                  >
                    <option value="Capitán">Capitán</option>
                    <option value="Jugador">Jugador</option>
                    <option value="Organizador">Organizador</option>
                    <option value="Árbitro">Árbitro</option>
                    <option value="Admin">Admin</option>
                    <option value="Espectador">Espectador</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">
                    Equipo
                  </label>
                  <select
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1"
                  >
                    <option value="LUMINEX ESPORTS">Luminex Esports</option>
                    <option value="Titans">Titans</option>
                    <option value="Phoenix">Phoenix</option>
                    <option value="Team Nova">Team Nova</option>
                    <option value="Free Agent">Free Agent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e2230]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30"
                >
                  Guardar Jugador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

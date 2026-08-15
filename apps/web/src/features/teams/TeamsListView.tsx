import React, { useMemo, useState } from 'react';
import { Plus, Search, Trophy, Globe, Users } from 'lucide-react';
import { Team } from '../../types';

interface TeamsListViewProps {
  teams: Team[];
  currentUserRole: string;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam?: (team: Partial<Team>) => Promise<Team> | Team;
}

export const TeamsListView: React.FC<TeamsListViewProps> = ({
  teams,
  currentUserRole,
  onSelectTeam,
  onCreateTeam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Todos');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formLogo, setFormLogo] = useState('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80');
  const [formRegion, setFormRegion] = useState('LATAM');
  const [formDescription, setFormDescription] = useState('');

  const canCreate = currentUserRole === 'Admin' || currentUserRole === 'Organizador';
  
  // Calculate statistics
  const uniqueRegions = useMemo(() => [...new Set(teams.map(t => t.region))].length, [teams]);
  const totalPlayers = useMemo(() => teams.reduce((sum, t) => sum + t.roster.length, 0), [teams]);
  
  // Filter regions for quick filter chips
  const regions = useMemo(() => ['Todos', ...Array.from(new Set(teams.map(t => t.region)))], [teams]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = 
        team.name.toLowerCase().includes(term) ||
        team.tag.toLowerCase().includes(term) ||
        team.region.toLowerCase().includes(term) ||
        (team.bio || team.description || '').toLowerCase().includes(term);
      
      const matchesRegion = selectedRegion === 'Todos' || team.region === selectedRegion;
      
      return matchesSearch && matchesRegion;
    });
  }, [teams, searchQuery, selectedRegion]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateTeam) return;

    const created = await onCreateTeam({
      name: formName,
      tag: formTag.toUpperCase(),
      abbreviation: formTag.toUpperCase(),
      logo: formLogo,
      region: formRegion,
      sport: 'Valorant',
      competitionType: 'Regional',
      description: formDescription,
      status: 'active',
      roster: [],
    });

    if (created) {
      setShowCreateModal(false);
      setFormName('');
      setFormTag('');
      setFormLogo('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80');
      setFormRegion('LATAM');
      setFormDescription('');
    }
  };

  return (
    <div id="teams-list-view" className="min-h-screen bg-[#0a0c15]">
      {/* DECORATIVE HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#ff2e83]/10 via-[#6366f1]/5 to-[#8b5cf6]/10 border-b border-[#1e2230]">
        {/* Geometric pattern background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff2e83] rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#6366f1] rounded-full blur-3xl translate-y-1/2" />
        </div>

        <div className="relative p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* TITLE AND CREATE BUTTON */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-brand font-black text-5xl text-white uppercase tracking-tight italic drop-shadow-lg">
                EQUIPOS
              </h1>
              <p className="text-sm text-slate-300 mt-2 font-tech">Explora los equipos registrados en TournamentX.</p>
            </div>

            {canCreate && (
              <button
                id="btn-create-team"
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white font-black text-xs tracking-wider uppercase shadow-xl shadow-[#ff2e83]/40 hover:scale-110 hover:shadow-[#ff2e83]/60 transition-all flex items-center gap-2 cursor-pointer font-tech whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span>＋ CREAR EQUIPO</span>
              </button>
            )}
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[#0f111a]/80 backdrop-blur border border-[#1e2230] p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#ff2e83]/20 border border-[#ff2e83]/40">
                <Trophy className="w-5 h-5 text-[#ff2e83]" />
              </div>
              <div>
                <div className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">Total de Equipos</div>
                <div className="font-brand font-black text-2xl text-white">{teams.length}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0f111a]/80 backdrop-blur border border-[#1e2230] p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#6366f1]/20 border border-[#6366f1]/40">
                <Globe className="w-5 h-5 text-[#6366f1]" />
              </div>
              <div>
                <div className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">Regiones Activas</div>
                <div className="font-brand font-black text-2xl text-white">{uniqueRegions}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0f111a]/80 backdrop-blur border border-[#1e2230] p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40">
                <Users className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <div>
                <div className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">Jugadores Registrados</div>
                <div className="font-brand font-black text-2xl text-white">{totalPlayers}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
        {/* SEARCH BAR */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar equipo por nombre, tag, región..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141724] text-sm text-white placeholder-slate-500 rounded-xl pl-11 pr-4 py-3 border border-[#1e2230] focus:border-[#ff2e83] focus:outline-none focus:shadow-lg focus:shadow-[#ff2e83]/20 transition-all"
          />
        </div>

        {/* QUICK FILTER CHIPS */}
        <div className="flex items-center gap-2 flex-wrap pb-2">
          <span className="text-xs font-mono-code uppercase text-slate-400 font-bold mr-2">Filtrar por región:</span>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                selectedRegion === region
                  ? 'bg-[#ff2e83] text-white shadow-lg shadow-[#ff2e83]/40 scale-105'
                  : 'bg-[#141724] text-slate-300 border border-[#1e2230] hover:border-[#ff2e83]/40 hover:text-white'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* TEAMS GRID */}
      <div className="px-6 lg:p-8 pb-12 space-y-8 max-w-7xl mx-auto">
        {filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className="group rounded-3xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83] transition-all overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-[#ff2e83]/30 flex flex-col hover:-translate-y-2 duration-300 cursor-pointer"
              >
                {/* Logo Section with Ranking Badge */}
                <div className="relative h-48 bg-gradient-to-br from-[#1a1d2e] to-[#0f111a] flex items-center justify-center border-b border-[#1e2230] p-4 overflow-hidden">
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
                  />
                  
                  {/* Ranking Badge */}
                  <div className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-[#ff2e83] to-[#e11d48] px-3 py-1.5 flex items-center gap-1.5 shadow-lg shadow-[#ff2e83]/40 group-hover:scale-110 transition-transform">
                    <Trophy className="w-3.5 h-3.5 text-white" />
                    <span className="font-brand font-black text-xs text-white">#{team.globalRank || 0}</span>
                  </div>
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-brand font-bold text-xl text-white uppercase tracking-tight italic group-hover:text-[#ff2e83] transition-colors duration-300">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#ff2e83]/20 border border-[#ff2e83]/40 text-[#ff2e83] font-mono-code font-bold text-[10px]">
                        {team.tag}
                      </span>
                      <span className="text-xs font-mono-code text-slate-400">{team.region}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed flex-1">
                    {team.bio || team.description || 'Equipo de competición'}
                  </p>

                  <div className="text-[10px] font-mono-code text-slate-500 flex items-center justify-between pt-2 border-t border-[#1e2230]">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#8b5cf6]" />
                      <span>{team.roster.length} JUGADORES</span>
                    </div>
                    <span className="text-[#ff2e83]">WIN: {team.winRate || 0}%</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onSelectTeam(team.id)}
                  className="w-full py-3 border-t border-[#1e2230] bg-[#0a0b0e] hover:bg-[#ff2e83]/20 text-[#ff2e83] font-black text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer group-hover:shadow-inner shadow-[#ff2e83]/20"
                >
                  VER EQUIPO →
                </button>
              </div>
            ))}
          </div>
        ) : (
        <div className="rounded-3xl bg-[#10121a] border border-[#1e2230] p-12 text-center space-y-4">
          <p className="text-slate-400 font-tech">No hay equipos que coincidan con tu búsqueda.</p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] hover:scale-105 text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/40 transition-all"
            >
              Crear el primer equipo
            </button>
          )}
        </div>
      )}
      </div>

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141e] border border-[#282e44] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e2230] pb-4">
              <h3 className="font-display font-black text-2xl text-white">＋ CREAR EQUIPO</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Nombre del equipo</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Linux Team"
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Tag</label>
                  <input
                    type="text"
                    required
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                    placeholder="LNX"
                    maxLength={3}
                    className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Región</label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1"
                  >
                    <option value="LATAM">LATAM</option>
                    <option value="LATAM Nord">LATAM Nord</option>
                    <option value="LATAM Sur">LATAM Sur</option>
                    <option value="NA">NA</option>
                    <option value="EU">EU</option>
                    <option value="ASIA">ASIA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Logo URL</label>
                <input
                  type="url"
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white focus:border-[#ff2e83] focus:outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-mono-code uppercase font-bold text-slate-300">Descripción</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descripción del equipo..."
                  rows={3}
                  className="w-full bg-[#181b28] border border-[#232738] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#ff2e83] focus:outline-none mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e2230]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#ff2e83] hover:bg-[#e11d48] text-white font-bold text-xs shadow-lg shadow-[#ff2e83]/30"
                >
                  Crear equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  Copy,
  Gamepad2,
  Headphones,
  Menu,
  MonitorPlay,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Video,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Platform = "Twitch" | "YouTube";

type Stream = {
  id: number;
  title: string;
  tournament: string;
  game: string;
  platform: Platform;
  channel: string;
  viewers: number;
  stage: string;
  accent: string;
};

type Lobby = {
  id: number;
  name: string;
  game: string;
  mode: string;
  players: string;
  code: string;
  starts: string;
  status: "Listo" | "Esperando" | "En juego";
};

const streams: Stream[] = [
  {
    id: 1,
    title: "Final internacional — Nova vs. Eclipse",
    tournament: "TX Masters LATAM",
    game: "Valorant",
    platform: "Twitch",
    channel: "TournamentX_es",
    viewers: 12840,
    stage: "Mapa 3 · 10 — 8",
    accent: "#ff2e9a",
  },
  {
    id: 2,
    title: "Semifinal — Black Wolves vs. Axiom",
    tournament: "Circuito Nexus",
    game: "League of Legends",
    platform: "YouTube",
    channel: "TX Arena",
    viewers: 7392,
    stage: "Serie · 1 — 1",
    accent: "#f91b7a",
  },
  {
    id: 3,
    title: "Jornada 5 — Elite Division",
    tournament: "Rocket League Open",
    game: "Rocket League",
    platform: "Twitch",
    channel: "TX_Rocket",
    viewers: 4285,
    stage: "Partido 2 · 2 — 3",
    accent: "#ff55b0",
  },
];

const initialLobbies: Lobby[] = [
  {
    id: 1,
    name: "Final Masters LATAM",
    game: "Valorant",
    mode: "Competitivo 5v5",
    players: "10/10",
    code: "TX-VLR-8294",
    starts: "En curso",
    status: "En juego",
  },
  {
    id: 2,
    name: "Semifinal Circuito Nexus",
    game: "League of Legends",
    mode: "Torneo · Draft",
    players: "9/10",
    code: "TX-LOL-4417",
    starts: "19:40",
    status: "Esperando",
  },
  {
    id: 3,
    name: "Rocket Open — Mesa 4",
    game: "Rocket League",
    mode: "Estándar 3v3",
    players: "6/6",
    code: "TX-RL-9032",
    starts: "20:15",
    status: "Listo",
  },
];

const games = ["Todos", "Valorant", "League of Legends", "Rocket League", "EA FC"];

function formatViewers(value: number) {
  return new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default function Home() {
  const [activeSection, setActiveSection] = useState("Transmisiones");
  const [selectedGame, setSelectedGame] = useState("Todos");
  const [platform, setPlatform] = useState<"Todas" | Platform>("Todas");
  const [query, setQuery] = useState("");
  const [lobbies, setLobbies] = useState(initialLobbies);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleStreams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return streams.filter((stream) => {
      const gameMatches = selectedGame === "Todos" || stream.game === selectedGame;
      const platformMatches = platform === "Todas" || stream.platform === platform;
      const searchMatches =
        !normalized ||
        `${stream.title} ${stream.channel} ${stream.tournament} ${stream.game}`
          .toLowerCase()
          .includes(normalized);
      return gameMatches && platformMatches && searchMatches;
    });
  }, [platform, query, selectedGame]);

  function jumpTo(section: string) {
    setActiveSection(section);
    setMobileOpen(false);
    document.getElementById(section.toLowerCase())?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function createLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const game = String(form.get("game"));
    const abbreviation = game.replace(/[^A-Z]/g, "").slice(0, 3) || "TX";
    const code = `TX-${abbreviation}-${Math.floor(1000 + Math.random() * 9000)}`;
    setLobbies((current) => [
      ...current,
      {
        id: Date.now(),
        name: String(form.get("name")),
        game,
        mode: String(form.get("mode")),
        players: "0/10",
        code,
        starts: String(form.get("time")),
        status: "Esperando",
      },
    ]);
    setModalOpen(false);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => jumpTo("Transmisiones")} aria-label="Volver al inicio">
          <img src="/tournamentx-logo.png" alt="TournamentX" />
        </button>

        <nav className={mobileOpen ? "main-nav open" : "main-nav"} aria-label="Navegación principal">
          {["Transmisiones", "Lobbies", "Métricas"].map((item) => (
            <button
              key={item}
              className={activeSection === item ? "nav-link active" : "nav-link"}
              onClick={() => jumpTo(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button" aria-label="Notificaciones">
            <Bell size={19} />
            <span className="notification-dot" />
          </button>
          <button className="profile-button" aria-label="Abrir perfil">
            <span className="avatar">PG</span>
            <span className="profile-copy"><strong>Progamaster</strong><small>Organizador</small></span>
            <ChevronDown size={15} />
          </button>
          <button className="mobile-menu" onClick={() => setMobileOpen((open) => !open)} aria-label="Abrir menú">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <section className="hero" id="transmisiones">
        <div className="hero-copy">
          <div className="eyebrow"><Radio size={15} /> CENTRO DE TRANSMISIONES</div>
          <h1>La competencia se vive <span>en directo.</span></h1>
          <p>Controla streams, salas competitivas y rendimiento de tus esports desde una sola arena digital.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => document.getElementById("streams-grid")?.scrollIntoView({ behavior: "smooth" })}>
              <MonitorPlay size={18} /> Ver transmisiones
            </button>
            <button className="secondary-button" onClick={() => setModalOpen(true)}>
              <CirclePlus size={18} /> Crear lobby
            </button>
          </div>
        </div>
        <div className="hero-stage" aria-label="Transmisión destacada">
          <div className="stage-topline"><span><span className="pulse" /> EN VIVO</span><span>12.8K espectadores</span></div>
          <div className="versus-mark">
            <span className="team-monogram">NV</span>
            <div><small>GRAN FINAL</small><strong>10 <em>:</em> 8</strong><span>MAPA 3 · ASCENT</span></div>
            <span className="team-monogram alt">EC</span>
          </div>
          <div className="stage-footer"><Trophy size={16} /> TX MASTERS LATAM <span>BO5</span></div>
        </div>
      </section>

      <section className="quick-stats" aria-label="Resumen de actividad">
        <article><span className="stat-icon"><Radio /></span><div><strong>3</strong><small>Streams en vivo</small></div><b>+1 hoy</b></article>
        <article><span className="stat-icon"><Users /></span><div><strong>24.5K</strong><small>Espectadores</small></div><b>+18.4%</b></article>
        <article><span className="stat-icon"><Gamepad2 /></span><div><strong>12</strong><small>Lobbies activos</small></div><b>92% llenos</b></article>
        <article><span className="stat-icon"><Zap /></span><div><strong>48ms</strong><small>Latencia media</small></div><b>Óptima</b></article>
      </section>

      <section className="content-section streams-section">
        <div className="section-heading">
          <div><span className="section-kicker">AHORA MISMO</span><h2>Transmisiones en vivo</h2><p>Sigue cada jugada sin salir de TournamentX.</p></div>
          <div className="stream-controls">
            <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar torneo o canal" /></label>
            <div className="segmented" aria-label="Filtrar plataforma">
              {(["Todas", "Twitch", "YouTube"] as const).map((item) => <button key={item} className={platform === item ? "selected" : ""} onClick={() => setPlatform(item)}>{item}</button>)}
            </div>
          </div>
        </div>

        <div className="game-tabs" aria-label="Filtrar por videojuego">
          {games.map((game) => <button key={game} className={selectedGame === game ? "active" : ""} onClick={() => setSelectedGame(game)}>{game}</button>)}
        </div>

        <div className="streams-grid" id="streams-grid">
          {visibleStreams.map((stream) => (
            <article className="stream-card" key={stream.id}>
              <div className="stream-visual" style={{ "--stream-accent": stream.accent } as React.CSSProperties}>
                <div className="live-badge"><span /> EN VIVO</div>
                <div className="viewer-badge"><Users size={13} /> {formatViewers(stream.viewers)}</div>
                <div className="game-emblem"><Swords /><small>{stream.game}</small></div>
                <div className="score-line">{stream.stage}</div>
              </div>
              <div className="stream-body">
                <div className="platform-row"><span className={stream.platform === "Twitch" ? "platform twitch" : "platform youtube"}>{stream.platform === "YouTube" ? <Youtube size={14} /> : <Video size={14} />}{stream.platform}</span><small>{stream.tournament}</small></div>
                <h3>{stream.title}</h3>
                <div className="channel-row"><span className="channel-avatar">TX</span><span><strong>{stream.channel}</strong><small>Canal verificado</small></span><ShieldCheck size={17} /></div>
                <button className="watch-button" onClick={() => window.open(stream.platform === "Twitch" ? "https://www.twitch.tv" : "https://www.youtube.com", "_blank", "noopener,noreferrer")}>Ver stream <MonitorPlay size={16} /></button>
              </div>
            </article>
          ))}
          {visibleStreams.length === 0 && <div className="empty-state"><Search /><h3>Sin resultados</h3><p>Prueba con otro juego, canal o plataforma.</p></div>}
        </div>
      </section>

      <section className="content-section lobby-section" id="lobbies">
        <div className="section-heading compact">
          <div><span className="section-kicker">SALA DE CONTROL</span><h2>Lobbies competitivos</h2><p>Códigos, cupos y horarios listos para cada equipo.</p></div>
          <button className="primary-button small" onClick={() => setModalOpen(true)}><CirclePlus size={17} /> Nuevo lobby</button>
        </div>
        <div className="lobby-table-wrap">
          <table className="lobby-table">
            <thead><tr><th>Partida</th><th>Modo</th><th>Jugadores</th><th>Código de acceso</th><th>Inicio</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {lobbies.map((lobby) => (
                <tr key={lobby.id}>
                  <td><span className="game-square"><Gamepad2 /></span><span><strong>{lobby.name}</strong><small>{lobby.game}</small></span></td>
                  <td>{lobby.mode}</td>
                  <td><Users size={15} /> {lobby.players}</td>
                  <td><code>{lobby.code}</code></td>
                  <td><Clock3 size={15} /> {lobby.starts}</td>
                  <td><span className={`status ${lobby.status.toLowerCase().replace(" ", "-")}`}><i /> {lobby.status}</span></td>
                  <td><button className="copy-button" onClick={() => copyCode(lobby.code)} aria-label={`Copiar ${lobby.code}`}>{copied === lobby.code ? <Check size={17} /> : <Copy size={17} />}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-section metrics-section" id="métricas">
        <div className="section-heading compact">
          <div><span className="section-kicker">RENDIMIENTO</span><h2>Métricas por videojuego</h2><p>Una lectura rápida del ecosistema competitivo.</p></div>
          <button className="secondary-button small"><CalendarDays size={17} /> Últimos 30 días</button>
        </div>
        <div className="metrics-layout">
          <article className="performance-panel">
            <div className="panel-head"><div><h3>Audiencia simultánea</h3><p>Espectadores por día</p></div><span><Activity size={15} /> +18.4%</span></div>
            <div className="chart-area" aria-label="Gráfica de audiencia de los últimos siete días">
              {[42, 57, 49, 70, 62, 86, 78, 96, 84, 104, 93, 118].map((height, index) => <i key={index} style={{ height: `${height}px` }} />)}
              <div className="chart-line" />
            </div>
            <div className="chart-labels"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
          </article>
          <div className="game-metrics">
            {[
              ["Valorant", "1,248", "63.2%", "28m", "#ff2e9a"],
              ["League of Legends", "936", "58.7%", "34m", "#ffffff"],
              ["Rocket League", "684", "71.4%", "19m", "#ff78bf"],
              ["EA FC", "412", "54.1%", "22m", "#b7b7bd"],
            ].map(([game, matches, retention, duration, color]) => (
              <article key={game} className="metric-row">
                <span className="metric-game-dot" style={{ background: color }} /><div className="metric-game"><strong>{game}</strong><small>{matches} partidas</small></div>
                <div className="metric-number"><strong>{retention}</strong><small>Retención</small></div>
                <div className="metric-number"><strong>{duration}</strong><small>Media vista</small></div>
                <BarChart3 size={20} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><img src="/tournamentx-logo.png" alt="TournamentX" /><p>El centro de mando para torneos deportivos y esports.</p></div>
        <div className="footer-links"><button>Centro de ayuda</button><button>Estado del sistema</button><button>Privacidad</button></div>
        <p className="copyright">© 2026 TournamentX · Compite. Conecta. Domina.</p>
      </footer>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Cerrar"><X /></button>
            <span className="modal-icon"><Headphones /></span>
            <h2 id="modal-title">Crear nuevo lobby</h2>
            <p>Prepara una sala competitiva y comparte el código con los equipos.</p>
            <form onSubmit={createLobby}>
              <label>Nombre de la partida<input name="name" placeholder="Ej. Cuartos de final — Mesa 2" required /></label>
              <div className="form-row">
                <label>Videojuego<select name="game" defaultValue="Valorant"><option>Valorant</option><option>League of Legends</option><option>Rocket League</option><option>EA FC</option></select></label>
                <label>Hora de inicio<input name="time" type="time" defaultValue="20:30" required /></label>
              </div>
              <label>Modo de juego<input name="mode" placeholder="Competitivo 5v5" required /></label>
              <button className="primary-button modal-submit" type="submit"><CirclePlus size={18} /> Crear lobby y código</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, ChevronRight, LocateFixed, MapPin, Navigation, RefreshCw, Search, Wifi, WifiOff, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import { Tournament, Venue } from '../../types';
import { tournamentXApi } from '../../services/apiClient';
import { matchesSearch } from '../../shared/search';

type Coordinates = { lat: number; lng: number };
type LocationState = 'idle' | 'loading' | 'ready' | 'fallback' | 'denied' | 'unsupported';
type Notification = { id: string; title: string; message: string; type: string; createdAt: string; read?: boolean };

interface SedesMapViewProps { onSelectVenueTournament?: (tournamentId: string) => void }

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
const VENUE_IMAGES = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900&auto=format&fit=crop&q=82',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=82',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&auto=format&fit=crop&q=82',
  'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=900&auto=format&fit=crop&q=82',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&auto=format&fit=crop&q=82',
];

function venueFallbackImage(venue: Venue, index: number) {
  const hash = [...String(venue.id || venue.name)].reduce((total, character) => total + character.charCodeAt(0), index);
  return VENUE_IMAGES[hash % VENUE_IMAGES.length];
}

function distanceKm(origin: Coordinates, destination: [number, number]) {
  const radians = (value: number) => value * Math.PI / 180;
  const [lat2, lng2] = destination;
  const dLat = radians(lat2 - origin.lat);
  const dLng = radians(lng2 - origin.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(origin.lat)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function SedesMapView({ onSelectVenueTournament }: SedesMapViewProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [dataError, setDataError] = useState('');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [radiusKm, setRadiusKm] = useState(1000);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationError, setNotificationError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const venueLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const mergeNotification = (notification: Notification) => {
    setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      setNotifications(await tournamentXApi.notifications());
      setNotificationError('');
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'No fue posible cargar las notificaciones.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const venuesWithDistance = useMemo(() => venues.map((venue) => ({
    venue,
    distance: userLocation ? distanceKm(userLocation, venue.coordinates) : null,
  })).filter(({ venue, distance }) => {
    return matchesSearch(query, venue.name, venue.city, venue.country, venue.address, venue.features) && (distance === null || distance <= radiusKm);
  }).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)), [query, radiusKm, userLocation, venues]);

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) || venues[0];

  const venueTournaments = useMemo(() => tournaments.filter((tournament: Tournament) => {
    if (!selectedVenue) return false;
    if (!['OPEN', 'CLOSED', 'PUBLISHED', 'IN_PROGRESS', 'UPCOMING'].includes(tournament.status)) return false;
    const tournamentVenue = tournament.venue?.toLowerCase() || '';
    const venueName = selectedVenue.name.toLowerCase();
    const venueCity = selectedVenue.city.toLowerCase();
    if (tournamentVenue && (tournamentVenue.includes(venueName) || venueName.includes(tournamentVenue) || tournamentVenue.includes(venueCity))) return true;
    if (!tournament.location) return false;
    return distanceKm({ lat: tournament.location.lat, lng: tournament.location.lng }, selectedVenue.coordinates) < 25;
  }), [selectedVenue, tournaments]);

  useEffect(() => {
    void Promise.all([
      tournamentXApi.venues(),
      tournamentXApi.tournaments(),
    ]).then(([venueRows, tournamentRows]) => {
      const normalized = venueRows.map((venue, index) => ({
        ...venue,
        image: venue.image || venueFallbackImage(venue, index),
        features: venue.features.length ? venue.features : ['Streaming', 'Zona de jugadores', 'Accesibilidad'],
      }));
      setVenues(normalized);
      setSelectedVenueId((current) => normalized.find((item) => item.id === current)?.id || normalized[0]?.id || '');
      setTournaments(tournamentRows);
      setDataError('');
    }).catch((error) => setDataError(error instanceof Error ? error.message : 'No fue posible cargar las sedes registradas.'));
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [19.4978, -99.1757], zoom: 4 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    venueLayerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const layer = venueLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    venuesWithDistance.forEach(({ venue, distance }) => {
      const selected = venue.id === selectedVenue?.id;
      const icon = L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18], html: `<div aria-label="${venue.name}" style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:${selected ? '#ff2e83' : '#141724'};border:2px solid ${selected ? '#fff' : '#ff2e83'};box-shadow:0 0 18px rgba(255,46,131,.55);font-size:18px">⌖</div>` });
      const marker = L.marker(venue.coordinates, { icon }).bindTooltip(`${venue.name}${distance === null ? '' : ` · ${distance.toFixed(0)} km`}`);
      marker.on('click', () => { setSelectedVenueId(venue.id); mapRef.current?.flyTo(venue.coordinates, 12); });
      marker.addTo(layer);
    });
  }, [selectedVenue?.id, venuesWithDistance]);

  useEffect(() => {
    void loadNotifications();
    const socket = io(SOCKET_URL, { reconnectionAttempts: 4 });
    socketRef.current = socket;
    socket.on('connect', () => { setSocketConnected(true); socket.emit('subscribe-notifications'); });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('notification:new', (notification: Notification) => mergeNotification(notification));
    const refreshTimer = window.setInterval(() => void loadNotifications(), 60000);
    return () => {
      socket.emit('unsubscribe-notifications'); socket.disconnect();
      window.clearInterval(refreshTimer);
    };
  }, []);

  const setMapLocation = (position: Coordinates, state: Extract<LocationState, 'ready' | 'fallback'>) => {
    setUserLocation(position); setLocationState(state);
    mapRef.current?.flyTo([position.lat, position.lng], 7);
    userMarkerRef.current?.remove();
    if (!mapRef.current) return;
    userMarkerRef.current = L.marker([position.lat, position.lng], {
      icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12], html: '<div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 18px #3b82f6"></div>' }),
    }).bindPopup(state === 'fallback' ? 'Ubicación aproximada' : 'Tu ubicación').addTo(mapRef.current).openPopup();
  };
  const locateByNetwork = async () => {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json() as { latitude?: number; longitude?: number };
    if (!response.ok || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) throw new Error('No se pudo calcular la ubicación aproximada.');
    setMapLocation({ lat: Number(data.latitude), lng: Number(data.longitude) }, 'fallback');
  };
  const locateUser = () => {
    if (!navigator.geolocation) { setLocationState('unsupported'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setMapLocation({ lat: coords.latitude, lng: coords.longitude }, 'ready');
    }, () => { void locateByNetwork().catch(() => setLocationState('denied')); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const selectVenue = (venue: Venue) => { setSelectedVenueId(venue.id); mapRef.current?.flyTo(venue.coordinates, 12); };
  const markRead = async (id: string) => {
    try {
      await tournamentXApi.markNotificationRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'No fue posible actualizar la notificación.');
    }
  };
  const locationMessage = locationState === 'denied' ? 'Permiso de ubicación denegado. Actívalo en tu navegador.'
    : locationState === 'unsupported' ? 'Este navegador no permite geolocalización.' : null;

  return <div id="sedes-map-view" className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="flex items-center gap-2 font-brand text-3xl font-black uppercase text-white sm:gap-3 sm:text-4xl"><MapPin className="h-7 w-7 shrink-0 text-[#ff2e83] sm:h-8 sm:w-8"/> Sedes y torneos cercanos</h1><p className="text-xs text-slate-400 mt-1">Explora arenas, usa tu ubicación y recibe alertas en tiempo real.</p></div>
      <div className="flex gap-2">
        <button onClick={() => setNotificationsOpen((value) => !value)} className="relative px-4 py-2.5 rounded-xl bg-[#181b28] border border-[#282d42] text-white flex items-center gap-2"><Bell className="w-4 h-4"/> Alertas{unreadNotifications > 0 && <span className="rounded-full bg-[#ff2e83] px-2 text-[10px]">{unreadNotifications}</span>}</button>
        <button onClick={locateUser} disabled={locationState === 'loading'} className="px-4 py-2.5 rounded-xl bg-[#ff2e83] disabled:opacity-60 text-white font-semibold text-xs flex items-center gap-2"><Navigation className="w-4 h-4"/>{locationState === 'loading' ? 'Localizando…' : 'Usar mi ubicación'}</button>
      </div>
    </header>

    {locationMessage && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">{locationMessage}</div>}
    {locationState === 'fallback' && <div role="status" className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-200">Se usó una ubicación aproximada basada en tu conexión de red.</div>}
    {dataError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{dataError}</div>}
    {notificationsOpen && <section className="rounded-2xl border border-[#282d42] bg-[#10121a] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-white flex items-center gap-2"><BellRing className="w-4 h-4 text-[#ff2e83]"/> Notificaciones</h2><div className="ml-auto flex items-center gap-3"><div className={`text-xs flex items-center gap-1 ${socketConnected ? 'text-emerald-400' : 'text-slate-500'}`}>{socketConnected ? <Wifi className="w-3 h-3"/> : <WifiOff className="w-3 h-3"/>}{socketConnected ? 'En tiempo real' : 'Actualización periódica'}</div><button aria-label="Actualizar notificaciones" onClick={() => void loadNotifications()} disabled={notificationsLoading}><RefreshCw className={`w-4 h-4 text-slate-400 ${notificationsLoading ? 'animate-spin' : ''}`}/></button><button aria-label="Cerrar" onClick={() => setNotificationsOpen(false)}><X className="w-4 h-4 text-slate-400"/></button></div></div>
      {notificationError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"><span>{notificationError}</span><button onClick={() => void loadNotifications()} className="font-bold underline">Reintentar</button></div>}
      {notificationsLoading && notifications.length === 0 ? <p className="text-sm text-slate-500">Consultando alertas…</p> : notifications.length === 0 ? <p className="text-sm text-slate-500">No tienes alertas pendientes.</p> : notifications.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${item.read ? 'border-[#232738] bg-[#161926]/60' : 'border-[#ff2e83]/25 bg-[#ff2e83]/[.06]'}`}><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-sm text-white">{item.title}</div><p className="text-xs text-slate-400 mt-1">{item.message}</p></div>{!item.read && localStorage.getItem('tournamentx_token') && <button onClick={() => void markRead(item.id)} className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-300">Marcar leída</button>}</div><time className="text-[10px] text-slate-600">{Number.isNaN(Date.parse(item.createdAt)) ? 'Fecha no disponible' : new Date(item.createdAt).toLocaleString()}</time></article>)}
    </section>}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar sede, ciudad o país" className="w-full rounded-xl bg-[#10121a] border border-[#282d42] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-[#ff2e83]"/></label>
          <label className="rounded-xl bg-[#10121a] border border-[#282d42] px-3 py-2 text-xs text-slate-400">Radio <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} disabled={!userLocation} className="ml-2 bg-transparent text-white"><option value={50}>50 km</option><option value={250}>250 km</option><option value={1000}>1,000 km</option><option value={5000}>5,000 km</option><option value={20000}>Todas</option></select></label>
        </div>
        <div className="relative h-[380px] overflow-hidden rounded-3xl border border-[#1e2230] shadow-2xl sm:h-[500px]"><div ref={mapContainerRef} className="h-full w-full"/><div className="absolute left-14 top-4 z-[400] rounded-xl bg-[#0d0e14]/90 px-3 py-2 text-[10px] text-slate-300 sm:text-xs"><LocateFixed className="mr-1 inline h-3 w-3 text-[#ff2e83]"/>{venuesWithDistance.length} sedes visibles</div></div>
      </div>
      <aside className="space-y-3">
        {!selectedVenue ? <div className="rounded-3xl border border-dashed border-white/10 bg-[#10121a] p-8 text-center"><MapPin className="mx-auto h-8 w-8 text-[#ff2e83]"/><h2 className="mt-3 font-bold text-white">No hay sedes registradas</h2><p className="mt-2 text-xs leading-5 text-slate-500">Cuando un organizador publique una sede aparecerá aquí con sus torneos asociados.</p></div> : <>
        <div className="p-5 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
          <img src={selectedVenue.image} alt={selectedVenue.name} className="w-full h-36 object-cover rounded-2xl"/>
          <div><h2 className="font-bold text-xl text-white">{selectedVenue.name}</h2><p className="text-xs text-slate-400">{selectedVenue.address}</p></div>
          {userLocation && <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-2.5 text-xs text-blue-300">A {distanceKm(userLocation, selectedVenue.coordinates).toFixed(1)} km de tu ubicación</div>}
          <div className="flex flex-wrap gap-1.5">{selectedVenue.features.map((feature) => <span key={feature} className="text-[10px] text-slate-300 bg-[#161926] px-2 py-1 rounded-md">✓ {feature}</span>)}</div>
          <div className="text-xs text-slate-400"><strong className="text-white">{venueTournaments.length}</strong> torneos activos o próximos</div>
          <button disabled={venueTournaments.length === 0} onClick={() => onSelectVenueTournament?.(venueTournaments[0].id)} className="w-full rounded-xl bg-[#ff2e83] py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{venueTournaments.length === 0 ? 'SIN TORNEOS ACTIVOS EN ESTA SEDE' : 'VER TORNEOS EN ESTA SEDE'}</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">{venuesWithDistance.length === 0 ? <p className="text-sm text-slate-500 p-3">No hay sedes dentro del radio seleccionado.</p> : venuesWithDistance.map(({ venue, distance }) => <button key={venue.id} onClick={() => selectVenue(venue)} className={`w-full p-3 rounded-2xl border text-left flex justify-between ${selectedVenue.id === venue.id ? 'bg-[#ff2e83]/10 border-[#ff2e83]' : 'bg-[#10121a] border-[#1e2230]'}`}><span><span className="block font-bold text-xs text-white">{venue.name}</span><span className="text-[10px] text-slate-500">{venue.city}{distance === null ? '' : ` · ${distance.toFixed(0)} km`}</span></span><ChevronRight className="w-4 h-4 text-slate-500"/></button>)}</div>
        </>}
      </aside>
    </div>
  </div>;
}

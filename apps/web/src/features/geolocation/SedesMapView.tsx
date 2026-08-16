import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, ChevronRight, LocateFixed, MapPin, Navigation, Search, Wifi, WifiOff, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import { MOCK_TOURNAMENTS, MOCK_VENUES } from '../../data/mockData';
import { Tournament, Venue } from '../../types';

type Coordinates = { lat: number; lng: number };
type LocationState = 'idle' | 'loading' | 'ready' | 'denied' | 'unsupported';
type Notification = { id: string; title: string; message: string; type: string; createdAt: string };

interface SedesMapViewProps { onSelectVenueTournament?: (venueName: string) => void }

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

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
  const [selectedVenue, setSelectedVenue] = useState<Venue>(MOCK_VENUES[0]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [radiusKm, setRadiusKm] = useState(1000);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const venueLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const venuesWithDistance = useMemo(() => MOCK_VENUES.map((venue) => ({
    venue,
    distance: userLocation ? distanceKm(userLocation, venue.coordinates) : null,
  })).filter(({ venue, distance }) => {
    const text = `${venue.name} ${venue.city} ${venue.country}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (distance === null || distance <= radiusKm);
  }).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)), [query, radiusKm, userLocation]);

  const venueTournaments = useMemo(() => MOCK_TOURNAMENTS.filter((tournament: Tournament) => {
    if (tournament.venue?.toLowerCase().includes(selectedVenue.city.toLowerCase())) return true;
    if (!tournament.location) return false;
    return distanceKm({ lat: tournament.location.lat, lng: tournament.location.lng }, selectedVenue.coordinates) < 25;
  }), [selectedVenue]);

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
      const selected = venue.id === selectedVenue.id;
      const icon = L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18], html: `<div aria-label="${venue.name}" style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:${selected ? '#ff2e83' : '#141724'};border:2px solid ${selected ? '#fff' : '#ff2e83'};box-shadow:0 0 18px rgba(255,46,131,.55);font-size:18px">⌖</div>` });
      const marker = L.marker(venue.coordinates, { icon }).bindTooltip(`${venue.name}${distance === null ? '' : ` · ${distance.toFixed(0)} km`}`);
      marker.on('click', () => { setSelectedVenue(venue); mapRef.current?.flyTo(venue.coordinates, 12); });
      marker.addTo(layer);
    });
  }, [selectedVenue, venuesWithDistance]);

  useEffect(() => {
    fetch(`${API_URL}/geolocation/notifications`).then((response) => response.ok ? response.json() : []).then(setNotifications).catch(() => undefined);
    const socket = io(SOCKET_URL, { reconnectionAttempts: 4 });
    socketRef.current = socket;
    socket.on('connect', () => { setSocketConnected(true); socket.emit('subscribe-notifications'); });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('notification:new', (notification: Notification) => setNotifications((current) => [notification, ...current].slice(0, 20)));
    return () => { socket.emit('unsubscribe-notifications'); socket.disconnect(); };
  }, []);

  const locateUser = () => {
    if (!navigator.geolocation) { setLocationState('unsupported'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = { lat: coords.latitude, lng: coords.longitude };
      setUserLocation(position); setLocationState('ready');
      mapRef.current?.flyTo([position.lat, position.lng], 7);
      userMarkerRef.current?.remove();
      userMarkerRef.current = L.marker([position.lat, position.lng], {
        icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12], html: '<div style="width:24px;height:24px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 18px #3b82f6"></div>' }),
      }).bindPopup('Tu ubicación').addTo(mapRef.current!).openPopup();
    }, () => setLocationState('denied'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const selectVenue = (venue: Venue) => { setSelectedVenue(venue); mapRef.current?.flyTo(venue.coordinates, 12); };
  const locationMessage = locationState === 'denied' ? 'Permiso de ubicación denegado. Actívalo en tu navegador.'
    : locationState === 'unsupported' ? 'Este navegador no permite geolocalización.' : null;

  return <div id="sedes-map-view" className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="font-brand font-black text-4xl text-white uppercase italic flex items-center gap-3"><MapPin className="w-8 h-8 text-[#ff2e83]"/> Sedes y torneos cercanos</h1><p className="text-xs text-slate-400 mt-1">Explora arenas, usa tu ubicación y recibe alertas en tiempo real.</p></div>
      <div className="flex gap-2">
        <button onClick={() => setNotificationsOpen((value) => !value)} className="relative px-4 py-2.5 rounded-xl bg-[#181b28] border border-[#282d42] text-white flex items-center gap-2"><Bell className="w-4 h-4"/> Alertas{notifications.length > 0 && <span className="rounded-full bg-[#ff2e83] px-2 text-[10px]">{notifications.length}</span>}</button>
        <button onClick={locateUser} disabled={locationState === 'loading'} className="px-4 py-2.5 rounded-xl bg-[#ff2e83] disabled:opacity-60 text-white font-semibold text-xs flex items-center gap-2"><Navigation className="w-4 h-4"/>{locationState === 'loading' ? 'Localizando…' : 'Usar mi ubicación'}</button>
      </div>
    </header>

    {locationMessage && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">{locationMessage}</div>}
    {notificationsOpen && <section className="rounded-2xl border border-[#282d42] bg-[#10121a] p-4 space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-bold text-white flex items-center gap-2"><BellRing className="w-4 h-4 text-[#ff2e83]"/> Notificaciones</h2><div className={`text-xs flex items-center gap-1 ${socketConnected ? 'text-emerald-400' : 'text-slate-500'}`}>{socketConnected ? <Wifi className="w-3 h-3"/> : <WifiOff className="w-3 h-3"/>}{socketConnected ? 'En tiempo real' : 'API desconectada'}</div><button aria-label="Cerrar" onClick={() => setNotificationsOpen(false)}><X className="w-4 h-4 text-slate-400"/></button></div>
      {notifications.length === 0 ? <p className="text-sm text-slate-500">Aún no hay alertas.</p> : notifications.map((item) => <article key={item.id} className="rounded-xl bg-[#161926] border border-[#232738] p-3"><div className="font-semibold text-sm text-white">{item.title}</div><p className="text-xs text-slate-400 mt-1">{item.message}</p><time className="text-[10px] text-slate-600">{new Date(item.createdAt).toLocaleString()}</time></article>)}
    </section>}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <label className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar sede, ciudad o país" className="w-full rounded-xl bg-[#10121a] border border-[#282d42] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-[#ff2e83]"/></label>
          <label className="rounded-xl bg-[#10121a] border border-[#282d42] px-3 py-2 text-xs text-slate-400">Radio <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} disabled={!userLocation} className="ml-2 bg-transparent text-white"><option value={50}>50 km</option><option value={250}>250 km</option><option value={1000}>1,000 km</option><option value={5000}>5,000 km</option><option value={20000}>Todas</option></select></label>
        </div>
        <div className="relative rounded-3xl overflow-hidden border border-[#1e2230] shadow-2xl h-[500px]"><div ref={mapContainerRef} className="w-full h-full"/><div className="absolute top-4 left-14 z-[400] bg-[#0d0e14]/90 rounded-xl px-3 py-2 text-xs text-slate-300"><LocateFixed className="inline w-3 h-3 mr-1 text-[#ff2e83]"/>{venuesWithDistance.length} sedes visibles</div></div>
      </div>
      <aside className="space-y-3">
        <div className="p-5 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4">
          <img src={selectedVenue.image} alt={selectedVenue.name} className="w-full h-36 object-cover rounded-2xl"/>
          <div><h2 className="font-bold text-xl text-white">{selectedVenue.name}</h2><p className="text-xs text-slate-400">{selectedVenue.address}</p></div>
          {userLocation && <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-2.5 text-xs text-blue-300">A {distanceKm(userLocation, selectedVenue.coordinates).toFixed(1)} km de tu ubicación</div>}
          <div className="flex flex-wrap gap-1.5">{selectedVenue.features.map((feature) => <span key={feature} className="text-[10px] text-slate-300 bg-[#161926] px-2 py-1 rounded-md">✓ {feature}</span>)}</div>
          <div className="text-xs text-slate-400"><strong className="text-white">{venueTournaments.length || selectedVenue.activeEventsCount}</strong> torneos activos o próximos</div>
          <button onClick={() => onSelectVenueTournament?.(selectedVenue.name)} className="w-full py-2.5 rounded-xl bg-[#ff2e83] text-white text-xs font-bold">VER TORNEOS EN ESTA SEDE</button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">{venuesWithDistance.length === 0 ? <p className="text-sm text-slate-500 p-3">No hay sedes dentro del radio seleccionado.</p> : venuesWithDistance.map(({ venue, distance }) => <button key={venue.id} onClick={() => selectVenue(venue)} className={`w-full p-3 rounded-2xl border text-left flex justify-between ${selectedVenue.id === venue.id ? 'bg-[#ff2e83]/10 border-[#ff2e83]' : 'bg-[#10121a] border-[#1e2230]'}`}><span><span className="block font-bold text-xs text-white">{venue.name}</span><span className="text-[10px] text-slate-500">{venue.city}{distance === null ? '' : ` · ${distance.toFixed(0)} km`}</span></span><ChevronRight className="w-4 h-4 text-slate-500"/></button>)}</div>
      </aside>
    </div>
  </div>;
}

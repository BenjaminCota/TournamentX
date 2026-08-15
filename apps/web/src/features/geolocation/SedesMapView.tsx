import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  ChevronRight, 
} from 'lucide-react';
import { MOCK_VENUES } from '../../data/mockData';
import { Venue } from '../../types';
import L from 'leaflet';

interface SedesMapViewProps {
  onSelectVenueTournament?: (venueName: string) => void;
}

export const SedesMapView: React.FC<SedesMapViewProps> = ({ onSelectVenueTournament }) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue>(MOCK_VENUES[0]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [19.4978, -99.1757], // Default center on CDMX
        zoom: 4,
        zoomControl: true
      });

      // Dark theme tiles for gaming aesthetic
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add Venue Markers
    MOCK_VENUES.forEach((venue) => {
      const isSelected = venue.id === selectedVenue.id;

      // Custom HTML pin icon
      const customIcon = L.divIcon({
        className: 'custom-venue-pin',
        html: `
          <div style="
            background: ${isSelected ? '#ff2e83' : '#141724'};
            border: 2px solid ${isSelected ? '#ffffff' : '#ff2e83'};
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 11px;
            box-shadow: 0 0 15px ${isSelected ? 'rgba(255,46,131,0.8)' : 'rgba(0,0,0,0.5)'};
            cursor: pointer;
            transition: all 0.3s ease;
          ">
            🏟️
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(venue.coordinates, { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedVenue(venue);
        map.flyTo(venue.coordinates, 12, { duration: 1.2 });
      });

      markersRef.current.push(marker);
    });

    return () => {
      // Keep map initialized across re-renders
    };
  }, [selectedVenue]);

  // Handle Geolocation
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 10, { duration: 1.5 });

            // User marker
            const userIcon = L.divIcon({
              className: 'user-pin',
              html: `
                <div style="
                  background: #3b82f6;
                  border: 2px solid white;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  box-shadow: 0 0 15px rgba(59,130,246,0.9);
                "></div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([lat, lng], { icon: userIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('Tu ubicación actual')
              .openPopup();
          }
        },
        () => {
          alert('No se pudo acceder a la geolocalización o permisos denegados.');
        }
      );
    }
  };

  // Calculate distance in KM using Haversine
  const calculateDistance = (coords: [number, number]) => {
    if (!userLocation) return null;
    const [lat1, lon1] = [userLocation.lat, userLocation.lng];
    const [lat2, lon2] = coords;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const filteredVenues = MOCK_VENUES;

  return (
    <div id="sedes-map-view" className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-tight italic flex items-center gap-3">
            <MapPin className="w-8 h-8 text-[#ff2e83]" />
            SEDES OFICIALES & MAPA GEOLOCALIZADO
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-tech">
            Arenas de esports certificadas con servidores LAN de baja latencia y fibra óptica
          </p>
        </div>

        <button
          onClick={handleLocateMe}
          className="px-5 py-2.5 rounded-xl bg-[#181b28] hover:bg-[#ff2e83] text-slate-200 hover:text-white border border-[#282d42] font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Navigation className="w-4 h-4 text-[#ff2e83] group-hover:text-white" />
          <span>Localizar Torneos Cercanos</span>
        </button>
      </div>

      {/* 2-COLUMN: MAP & VENUES LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Container */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-3xl overflow-hidden border border-[#1e2230] shadow-2xl h-[480px] z-0">
            <div ref={mapContainerRef} className="w-full h-full"></div>

            {/* Map Overlay Badge */}
            <div className="absolute top-4 left-4 z-[400] bg-[#0d0e14]/90 backdrop-blur-md border border-[#232738] rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono-code flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff2e83] animate-ping"></span>
              <span>5 Arenas Certificadas en LATAM</span>
            </div>
          </div>
        </div>

        {/* Selected Venue Details & List */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-[#10121a] border border-[#1e2230] space-y-4 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden h-36">
              <img
                src={selectedVenue.image}
                alt={selectedVenue.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-[11px] font-mono-code font-bold text-white bg-black/70 px-2 py-0.5 rounded">
                  {selectedVenue.city}, {selectedVenue.country}
                </span>
                <span className="text-[11px] font-mono-code font-bold text-[#ff2e83] bg-black/70 px-2 py-0.5 rounded">
                  {selectedVenue.capacity.toLocaleString()} Espectadores
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-xl text-white">
                {selectedVenue.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {selectedVenue.address}
              </p>
            </div>

            {/* Distance calculation indicator */}
            {userLocation && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono-code text-blue-400 flex items-center justify-between">
                <span>Distancia desde tu posición:</span>
                <strong>{calculateDistance(selectedVenue.coordinates)} KM</strong>
              </div>
            )}

            {/* Features */}
            <div className="space-y-2 pt-2 border-t border-[#1e2230]">
              <span className="text-[10px] font-mono-code uppercase font-bold text-slate-400">
                Equipamiento de Sede:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedVenue.features.map(f => (
                  <span key={f} className="text-[10px] font-mono-code text-slate-300 bg-[#161926] px-2 py-1 rounded-md border border-[#232738]">
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => onSelectVenueTournament?.(selectedVenue.name)} className="w-full py-2.5 rounded-xl bg-[#ff2e83] text-white text-xs font-bold">VER TORNEOS EN ESTA SEDE</button>
          </div>

          {/* Venues Selector List */}
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {filteredVenues.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  setSelectedVenue(v);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(v.coordinates, 12, { duration: 1 });
                  }
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedVenue.id === v.id
                    ? 'bg-[#ff2e83]/10 border-[#ff2e83] text-white'
                    : 'bg-[#10121a] border-[#1e2230] text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-white">{v.name}</div>
                  <div className="text-[10px] font-mono-code text-slate-500">{v.city} • {v.activeEventsCount} Torneos Activos</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

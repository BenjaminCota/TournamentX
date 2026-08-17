const localStore = require('../../config/local-store');

const venuesSeed = [
  { id: 'ven-1', name: 'Arena CDMX Esports Dome', city: 'Ciudad de México', country: 'México', address: 'Av. de las Granjas 800, Azcapotzalco', latitude: 19.4978, longitude: -99.1757, activeEventsCount: 3 },
  { id: 'ven-2', name: 'Movistar GameClub Santiago', city: 'Santiago', country: 'Chile', address: 'Av. Vicuña Mackenna 7110, La Florida', latitude: -33.5186, longitude: -70.5986, activeEventsCount: 2 },
  { id: 'ven-3', name: 'Geek Lounge & Arena BA', city: 'Buenos Aires', country: 'Argentina', address: 'Av. Corrientes 3247, CABA', latitude: -34.6037, longitude: -58.4116, activeEventsCount: 4 },
  { id: 'ven-4', name: 'Coliseo Medplus Gaming Arena', city: 'Bogotá', country: 'Colombia', address: 'Calle 80 Km 1.5 vía Cota', latitude: 4.735, longitude: -74.12, activeEventsCount: 1 },
  { id: 'ven-5', name: 'Espacio Gamer Lima', city: 'Lima', country: 'Perú', address: 'Av. Javier Prado Este 4200, Surco', latitude: -12.0864, longitude: -76.9748, activeEventsCount: 2 },
];

const venues = localStore.collection('venues', venuesSeed);

const notificationsSeed = [
  { id: 'notif-1', title: 'Partido próximo', message: 'PRO LEAGUE SEASON 5 comienza en Arena CDMX.', type: 'tournament', createdAt: new Date().toISOString() },
];
const notifications = localStore.collection('notifications', notificationsSeed);
function saveNotifications() { localStore.saveCollection('notifications', notifications); }

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearbyVenues(latitude, longitude, radiusKm) {
  return venues
    .map((venue) => ({ ...venue, distanceKm: Number(distanceKm(latitude, longitude, venue.latitude, venue.longitude).toFixed(1)) }))
    .filter((venue) => venue.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { venues, notifications, nearbyVenues, saveNotifications };

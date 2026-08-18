const localStore = require('../../config/local-store');
const crypto = require('node:crypto');

const venuesSeed = [
  { id: 'ven-1', name: 'Arena CDMX Esports Dome', city: 'Ciudad de México', country: 'México', address: 'Av. de las Granjas 800, Azcapotzalco', latitude: 19.4978, longitude: -99.1757, activeEventsCount: 3 },
  { id: 'ven-2', name: 'Movistar GameClub Santiago', city: 'Santiago', country: 'Chile', address: 'Av. Vicuña Mackenna 7110, La Florida', latitude: -33.5186, longitude: -70.5986, activeEventsCount: 2 },
  { id: 'ven-3', name: 'Geek Lounge & Arena BA', city: 'Buenos Aires', country: 'Argentina', address: 'Av. Corrientes 3247, CABA', latitude: -34.6037, longitude: -58.4116, activeEventsCount: 4 },
  { id: 'ven-4', name: 'Coliseo Medplus Gaming Arena', city: 'Bogotá', country: 'Colombia', address: 'Calle 80 Km 1.5 vía Cota', latitude: 4.735, longitude: -74.12, activeEventsCount: 1 },
  { id: 'ven-5', name: 'Espacio Gamer Lima', city: 'Lima', country: 'Perú', address: 'Av. Javier Prado Este 4200, Surco', latitude: -12.0864, longitude: -76.9748, activeEventsCount: 2 },
];

const venues = localStore.collection('venues', venuesSeed);
function saveVenues() { localStore.saveCollection('venues', venues); }
function serializeVenue(venue) {
  return { ...venue, coordinates: venue.coordinates || [venue.latitude, venue.longitude], features: venue.features || ['Streaming', 'Zona de jugadores', 'Accesibilidad'], image: venue.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80' };
}
function listVenues() { return venues.map(serializeVenue); }
function createVenue(input) { const venue = { id: crypto.randomUUID(), ...input, latitude: input.latitude, longitude: input.longitude, activeEventsCount: Number(input.activeEventsCount || 0), createdAt: new Date().toISOString() }; venues.push(venue); saveVenues(); return serializeVenue(venue); }
function updateVenue(id, input) { const venue = venues.find((entry) => entry.id === id); if (!venue) return null; Object.assign(venue, input, { updatedAt: new Date().toISOString() }); saveVenues(); return serializeVenue(venue); }
function removeVenue(id) { const index = venues.findIndex((entry) => entry.id === id); if (index < 0) return { error: 'Sede no encontrada', status: 404 }; if (Number(venues[index].activeEventsCount || 0) > 0) return { error: 'No se puede eliminar una sede con eventos activos', status: 409 }; venues.splice(index, 1); saveVenues(); return { removed: true }; }

const notificationsSeed = [
  { id: 'notif-1', title: 'Partido programado', message: 'Luminex y Titans jugarán en Arena CDMX el 20 de agosto.', type: 'schedule', visibility: 'public', readBy: [], createdAt: '2026-08-15T18:00:00.000Z' },
];
const notifications = localStore.collection('notifications', notificationsSeed);
function saveNotifications() { localStore.saveCollection('notifications', notifications); }
function markNotificationRead(id, userId) {
  const notification = notifications.find((item) => item.id === id);
  if (!notification) return null;
  notification.readBy = [...new Set([...(notification.readBy || []), userId])];
  saveNotifications();
  return { ...notification, read: true };
}

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

module.exports = { venues, listVenues, createVenue, updateVenue, removeVenue, notifications, nearbyVenues, saveNotifications, markNotificationRead };

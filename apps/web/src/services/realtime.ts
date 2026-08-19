export function realtimeServerUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  return typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
}

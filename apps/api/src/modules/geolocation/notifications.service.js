const { notifications, saveNotifications } = require('./geolocation.store');

function publishNotification(app, payload) {
  const notification = { id: `notif-${Date.now()}`, ...payload, createdAt: new Date().toISOString() };
  notifications.push(notification);
  saveNotifications();
  app.get('io')?.to('notifications').emit('notification:new', notification);
  return notification;
}

function publishMatchResult(app, match) {
  return publishNotification(app, {
    title: 'Resultado final',
    message: `Partido ${match.team1Id} ${match.score.team1} — ${match.score.team2} ${match.team2Id}.`,
    type: 'result',
  });
}

module.exports = { publishNotification, publishMatchResult };

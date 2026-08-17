module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'TournamentX API',
    version: '2.0.0',
    description: 'API local de los ocho módulos: identidad, torneos, equipos, partidos, analítica, media, geolocalización y premios.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Servidor local' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      SponsorInput: {
        type: 'object', required: ['name', 'contactEmail'],
        properties: { name: { type: 'string' }, contactEmail: { type: 'string', format: 'email' }, logoUrl: { type: 'string', format: 'uri' } },
      },
      PrizePoolInput: {
        type: 'object', required: ['tournamentId', 'name', 'currency'],
        properties: { tournamentId: { type: 'string', format: 'uuid' }, name: { type: 'string' }, currency: { type: 'string', example: 'MXN' }, targetAmount: { type: 'number' } },
      },
      ContributionInput: {
        type: 'object', required: ['sponsorId', 'amount', 'provider'],
        properties: { sponsorId: { type: 'string', format: 'uuid' }, amount: { type: 'number' }, provider: { type: 'string', enum: ['stripe', 'binance_pay'] } },
      },
      RewardInput: {
        type: 'object', required: ['rewardType', 'name'],
        properties: {
          sponsorId: { type: 'string', format: 'uuid' }, prizePoolId: { type: 'string', format: 'uuid' },
          rewardType: { type: 'string', enum: ['physical', 'game_code', 'gift_card', 'coupon'] },
          name: { type: 'string' }, description: { type: 'string' }, quantity: { type: 'integer', default: 1 }, milestone: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': { get: { security: [], summary: 'Comprueba el estado de la API', responses: { 200: { description: 'API activa' } } } },
    '/api/auth/login': { post: { security: [], summary: 'Inicia una sesión local y devuelve un JWT de ocho horas', responses: { 200: { description: 'Sesión creada' }, 401: { description: 'Credenciales incorrectas' } } } },
    '/api/auth/register': { post: { security: [], summary: 'Registra una cuenta con rol Espectador', responses: { 201: { description: 'Cuenta creada' }, 409: { description: 'Correo duplicado' } } } },
    '/api/auth/me': { get: { summary: 'Devuelve la identidad de la sesión', responses: { 200: { description: 'Usuario autenticado' } } } },
    '/api/auth/users': { get: { summary: 'Lista cuentas; requiere rol administrador', responses: { 200: { description: 'Usuarios obtenidos' }, 403: { description: 'Rol insuficiente' } } } },
    '/api/analytics/overview': { get: { security: [], summary: 'Calcula métricas, ranking y resultados recientes', responses: { 200: { description: 'Analítica calculada' } } } },
    '/api/media/streams': { get: { security: [], summary: 'Lista streams de Twitch/YouTube o el modo local', responses: { 200: { description: 'Streams obtenidos' } } } },
    '/api/media/lobbies': { get: { security: [], summary: 'Lista lobbies persistentes', responses: { 200: { description: 'Lobbies obtenidos' } } }, post: { summary: 'Crea un lobby', responses: { 201: { description: 'Lobby creado' } } } },
    '/api/media/metrics': { get: { security: [], summary: 'Calcula jugadores, salas y audiencia por videojuego', responses: { 200: { description: 'Métricas obtenidas' } } } },
    '/api/geolocation/venues': { get: { security: [], summary: 'Lista sedes disponibles', responses: { 200: { description: 'Sedes obtenidas' } } } },
    '/api/geolocation/nearby': { get: { security: [], summary: 'Busca sedes dentro de un radio mediante Haversine', responses: { 200: { description: 'Sedes cercanas ordenadas' }, 400: { description: 'Coordenadas no válidas' } } } },
    '/api/teams': { get: { security: [], summary: 'Lista equipos y plantillas', responses: { 200: { description: 'Equipos obtenidos' } } }, post: { security: [], summary: 'Registra un equipo validado', responses: { 201: { description: 'Equipo creado' }, 400: { description: 'Datos no válidos' } } } },
    '/api/players': { get: { security: [], summary: 'Lista perfiles e historial de jugadores', responses: { 200: { description: 'Jugadores obtenidos' } } }, post: { security: [], summary: 'Registra un jugador validado', responses: { 201: { description: 'Jugador creado' } } } },
    '/api/tournaments': { get: { security: [], summary: 'Lista torneos y sus rondas', responses: { 200: { description: 'Torneos obtenidos' } } }, post: { security: [], summary: 'Crea un torneo', responses: { 201: { description: 'Torneo creado' } } } },
    '/api/sponsors': {
      get: { summary: 'Lista patrocinadores', responses: { 200: { description: 'Lista obtenida' } } },
      post: { summary: 'Crea un patrocinador', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SponsorInput' } } } }, responses: { 201: { description: 'Patrocinador creado' } } },
    },
    '/api/sponsors/{id}': {
      get: { summary: 'Obtiene un patrocinador', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Patrocinador encontrado' } } },
      patch: { summary: 'Edita o desactiva un patrocinador', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Patrocinador actualizado' } } },
    },
    '/api/prize-pools': {
      get: { summary: 'Lista bolsas de premios', responses: { 200: { description: 'Lista obtenida' } } },
      post: { summary: 'Crea una bolsa', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PrizePoolInput' } } } }, responses: { 201: { description: 'Bolsa creada' } } },
    },
    '/api/prize-pools/{id}/contributions': {
      post: {
        summary: 'Crea una aportación simulada o una autorización de prueba', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ContributionInput' } } } }, responses: { 201: { description: 'Orden pendiente creada' } },
      },
    },
    '/api/prize-pools/{id}/distribution': {
      put: { summary: 'Define la distribución porcentual y bloquea la bolsa', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Distribución calculada' } } },
    },
    '/api/prize-pools/{id}/payouts': {
      post: { summary: 'Simula la entrega de un premio y genera recibo', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 201: { description: 'Premio entregado' } } },
    },
    '/api/prize-pools/{id}/cancel': {
      post: { summary: 'Cancela una bolsa sin fondos pendientes', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Bolsa cancelada' } } },
    },
    '/api/prize-pools/{id}/results': {
      post: {
        summary: 'Importa ganadores oficiales y crea pagos simulados',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tournamentId', 'winners'], properties: {
          tournamentId: { type: 'string', format: 'uuid' }, source: { type: 'string', default: 'api' },
          winners: { type: 'array', items: { type: 'object', required: ['recipientId', 'recipientType', 'position'], properties: {
            recipientId: { type: 'string', format: 'uuid' }, recipientType: { type: 'string', enum: ['team', 'player'] }, position: { type: 'integer' }, destination: { type: 'string' },
          } } },
        } } } } },
        responses: { 201: { description: 'Resultados importados y pagos creados' }, 409: { description: 'La bolsa no está lista o ya tiene pagos' } },
      },
    },
    '/api/contributions': { get: { summary: 'Consulta el historial de aportaciones', responses: { 200: { description: 'Lista obtenida' } } } },
    '/api/contributions/{id}/status': {
      patch: {
        summary: 'Aprueba, rechaza o reembolsa una aportación simulada', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['authorized', 'paid', 'failed', 'cancelled', 'refunded'] }, notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Estado actualizado' } },
      },
    },
    '/api/contributions/{id}/history': {
      get: { summary: 'Consulta la auditoría de una aportación', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Historial obtenido' } } },
    },
    '/api/contributions/{id}/stripe/capture': {
      post: { summary: 'Captura una autorización Stripe Test', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Autorización capturada' }, 409: { description: 'La aportación no está autorizada' } } },
    },
    '/api/contributions/{id}/stripe/cancel': {
      post: { summary: 'Cancela una autorización Stripe Test', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Autorización cancelada' }, 409: { description: 'La aportación ya no puede cancelarse' } } },
    },
    '/api/webhooks/stripe': {
      post: { security: [], summary: 'Recibe eventos firmados de Stripe', responses: { 200: { description: 'Evento procesado' }, 400: { description: 'Firma inválida' } } },
    },
    '/api/rewards': {
      get: { summary: 'Lista premios en especie y cupones', responses: { 200: { description: 'Lista obtenida' } } },
      post: { summary: 'Crea un premio', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RewardInput' } } } }, responses: { 201: { description: 'Premio creado' } } },
    },
    '/api/rewards/{id}/assignments': {
      post: { summary: 'Asigna un premio o genera un cupón', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 201: { description: 'Premio asignado' } } },
    },
    '/api/rewards/assignments/{id}': {
      patch: { summary: 'Marca un premio como canjeado, entregado o cancelado', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Asignación actualizada' } } },
    },
    '/api/rewards/recipients/{id}': {
      get: { summary: 'Consulta premios de un equipo o jugador', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Premios obtenidos' } } },
    },
    '/api/matches': {
      get: { security: [], summary: 'Lista partidos y permite filtrar por torneo, calendario, estado y fecha', responses: { 200: { description: 'Partidos obtenidos' } } },
      post: {
        security: [], summary: 'Crea un partido programado',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tournamentId', 'team1Id', 'team2Id', 'scheduledAt'], properties: {
          tournamentId: { type: 'string' }, scheduleId: { type: 'string' }, roundId: { type: 'string' }, team1Id: { type: 'string' }, team2Id: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' }, venue: { type: 'string' }, mode: { type: 'string', enum: ['best_of_1', 'best_of_3', 'best_of_5'] },
        } } } } }, responses: { 201: { description: 'Partido creado' } },
      },
    },
    '/api/matches/{id}': {
      get: { security: [], summary: 'Obtiene un partido', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Partido encontrado' }, 404: { description: 'No encontrado' } } },
    },
    '/api/matches/{id}/score': {
      patch: {
        summary: 'Actualiza marcador o estado y emite match-update por Socket.IO', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
          team1Score: { type: 'integer', minimum: 0 }, team2Score: { type: 'integer', minimum: 0 }, status: { type: 'string', enum: ['scheduled', 'live', 'completed', 'postponed', 'cancelled'] },
        } } } } }, responses: { 200: { description: 'Marcador actualizado' }, 401: { description: 'JWT requerido' }, 409: { description: 'Transición no válida' } },
      },
    },
    '/api/schedules': {
      get: { security: [], summary: 'Lista calendarios', responses: { 200: { description: 'Calendarios obtenidos' } } },
      post: {
        security: [], summary: 'Crea un calendario y genera su agenda inicial',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tournamentId', 'teamIds', 'startsAt'], properties: {
          tournamentId: { type: 'string' }, teamIds: { type: 'array', items: { type: 'string' }, minItems: 2 }, startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' }, slotMinutes: { type: 'integer', minimum: 15 }, format: { type: 'string', enum: ['round_robin', 'single_elimination'] },
        } } } } }, responses: { 201: { description: 'Calendario generado' } },
      },
    },
    '/api/schedules/{id}': {
      get: { security: [], summary: 'Obtiene un calendario con sus partidos', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Calendario encontrado' }, 404: { description: 'No encontrado' } } },
    },
    '/api/receipts/{code}': {
      get: { security: [], summary: 'Verifica un recibo', parameters: [{ in: 'path', name: 'code', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Recibo válido' }, 404: { description: 'No encontrado' } } },
    },
  },
};

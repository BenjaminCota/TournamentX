module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'TournamentX — Rewards & Payments API',
    version: '1.0.0',
    description: 'API del módulo Dev 8. Stripe y Binance Pay funcionan únicamente como simuladores.',
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
        summary: 'Crea una orden de aportación simulada', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
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
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['paid', 'failed', 'refunded'] }, notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Estado actualizado' } },
      },
    },
    '/api/contributions/{id}/history': {
      get: { summary: 'Consulta la auditoría de una aportación', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Historial obtenido' } } },
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
    '/api/receipts/{code}': {
      get: { security: [], summary: 'Verifica un recibo', parameters: [{ in: 'path', name: 'code', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Recibo válido' }, 404: { description: 'No encontrado' } } },
    },
  },
};

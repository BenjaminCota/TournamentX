const { execFileSync } = require('node:child_process');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '..');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL es obligatoria para las pruebas de integración MySQL. Usa una base de pruebas, nunca producción.');
  process.exitCode = 1;
} else {
  const environment = { ...process.env, RUN_DB_TESTS: '1' };
  const run = (args, overrides = {}) => execFileSync(process.execPath, args, {
    cwd: apiRoot,
    env: { ...environment, ...overrides },
    stdio: 'inherit',
  });

  try {
    run(['src/scripts/init-db.js']);
    run(['--test', '--test-force-exit', 'test/team-roster.mysql.integration.test.js']);
    run(['--test', '--test-force-exit', 'test/matches-mysql.integration.test.js']);
    run(['--test', '--test-force-exit', 'test/mysql.integration.test.js']);
    run(['--test', '--test-force-exit', 'test/dev8-frontend-flow.integration.test.js'], {
      STRIPE_MODE: 'simulated',
      STRIPE_SECRET_KEY: '',
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
    });
  } catch (error) {
    process.exitCode = error.status || 1;
  }
}

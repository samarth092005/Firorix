/**
 * Fiorify — Health, Liveness & Readiness Routes
 */

import { defaultDatabaseAdapter } from '../infrastructure/db/adapters/databaseAdapterFactory.js';
import { DialectMigrationRunner } from '../infrastructure/db/migrator/dialectMigrationRunner.js';

export async function handleHealthRoutes(req, res, url, context = {}) {
  const { currentUser, adapter } = context;

  if (req.method === 'GET' && (url.pathname === '/api/v1/health' || url.pathname === '/health')) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!currentUser || currentUser.isUnauthenticated)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'UP', timestamp: new Date().toISOString() }));
      return true;
    }

    const btpConfig = adapter.validateConfiguration();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'UP',
        timestamp: new Date().toISOString(),
        targetLandscape: {
          sid: btpConfig.configuration.destinationName || process.env.SAP_DESTINATION_NAME || 'UNCONFIGURED',
          client: btpConfig.configuration.sapClient || process.env.SAP_CLIENT || '200',
          release: 'SAP S/4HANA 2023 Private Edition',
          components: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
          targetODataService: '/sap/opu/odata/sap/Z_Fiorify_DISCOVERY_SRV',
          gatewayCatalogService: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection'
        },
        btpDestinationStatus: {
          configured: btpConfig.isValid,
          destinationName: btpConfig.configuration.destinationName,
          sapClient: btpConfig.configuration.sapClient,
          destinationBindingPresent: btpConfig.destinationBinding.present,
          connectivityBindingPresent: btpConfig.connectivityBinding.present
        }
      }, null, 2)
    );
    return true;
  }

  if (req.method === 'GET' && (url.pathname === '/api/v1/health/liveness' || url.pathname === '/health/liveness')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', timestamp: new Date().toISOString() }, null, 2));
    return true;
  }

  if (req.method === 'GET' && (url.pathname === '/api/v1/health/readiness' || url.pathname === '/health/readiness')) {
    const isProduction = process.env.NODE_ENV === 'production';
    const dbAdapter = context.databaseAdapter || defaultDatabaseAdapter;
    const dbCheck = await dbAdapter.healthCheck().catch((err) => ({
      healthy: false,
      error: err.message,
      dialect: dbAdapter.getDialect()
    }));

    let migrationsOk = true;
    let migrationStatus = null;
    try {
      const runner = new DialectMigrationRunner({ adapter: dbAdapter });
      migrationStatus = await runner.getStatus();
      migrationsOk = migrationStatus.isFullyMigrated;
    } catch (migErr) {
      migrationsOk = false;
      migrationStatus = { error: migErr.message };
    }

    const btpConfig = adapter ? adapter.validateConfiguration() : { isValid: true };
    const isReady = dbCheck.healthy && (isProduction ? migrationsOk : true);
    const statusCode = isReady ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: isReady ? 'READY' : 'NOT_READY',
        statusCode: isReady ? 'OK' : 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        components: {
          database: {
            status: dbCheck.healthy ? 'UP' : 'DOWN',
            dialect: dbCheck.dialect || dbAdapter.getDialect(),
            latencyMs: dbCheck.latencyMs,
            version: dbCheck.version,
            error: dbCheck.error
          },
          migrations: {
            status: migrationsOk ? 'UP_TO_DATE' : 'PENDING_MIGRATIONS',
            appliedCount: migrationStatus?.totalApplied,
            availableCount: migrationStatus?.totalAvailable
          },
          btpConnectivity: {
            status: btpConfig.isValid ? 'CONFIGURED' : 'UNCONFIGURED'
          }
        }
      }, null, 2)
    );
    return true;
  }

  return false;
}

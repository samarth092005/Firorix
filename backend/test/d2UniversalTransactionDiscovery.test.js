import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateTcodeSyntax,
  TransactionRegistryProvider,
  TransactionDescriptionProvider,
  RepositoryMetadataProvider,
  DDICMetadataProvider,
  AuthorizationEvidenceProvider,
  GatewayCorrelationProvider,
  TRANSACTION_EXISTENCE_STATES
} from '../src/services/transactionDiscoveryProviders.js';
import { SapTransactionDiscoveryAdapter } from '../src/adapters/sapTransactionDiscoveryAdapter.js';
import { TransactionDiscoveryEngine } from '../src/engine/transactionDiscoveryEngine.js';

describe('Workstream D2 — Universal SAP Transaction Code Discovery Architecture Tests', () => {

  describe('D2.1: SAP Transaction Code Syntax Validation', () => {
    it('accepts valid standard SAP transaction codes', () => {
      const validStandards = ['ME21N', 'F-53', 'VA01', 'FB03', 'MIGO', 'BP', 'OB52', 'FS00'];
      for (const tc of validStandards) {
        const res = validateTcodeSyntax(tc);
        assert.strictEqual(res.isValid, true, `T-Code ${tc} should be valid`);
        assert.strictEqual(res.pattern, 'STANDARD');
        assert.strictEqual(res.isCustom, false);
      }
    });

    it('accepts valid customer-namespace transaction codes (Z/Y)', () => {
      const validCustom = ['ZPURCHASE', 'ZMM_PO_CREATE', 'YFIN_LEDGER_01', 'ZTEST'];
      for (const tc of validCustom) {
        const res = validateTcodeSyntax(tc);
        assert.strictEqual(res.isValid, true, `Customer T-Code ${tc} should be valid`);
        assert.strictEqual(res.pattern, 'CUSTOM');
        assert.strictEqual(res.isCustom, true);
      }
    });

    it('accepts valid partner-namespace transaction codes', () => {
      const validPartner = ['/CPD/PWS_WS', '/UI2/FLP', '/OPT/VIM_7X1'];
      for (const tc of validPartner) {
        const res = validateTcodeSyntax(tc);
        assert.strictEqual(res.isValid, true, `Partner T-Code ${tc} should be valid`);
        assert.strictEqual(res.pattern, 'PARTNER_NAMESPACE');
        assert.strictEqual(res.isCustom, false);
      }
    });

    it('rejects invalid syntax, symbols, whitespace, and excessive length', () => {
      assert.strictEqual(validateTcodeSyntax('').isValid, false);
      assert.strictEqual(validateTcodeSyntax('   ').isValid, false);
      assert.strictEqual(validateTcodeSyntax('ME21N@#$').isValid, false);
      assert.strictEqual(validateTcodeSyntax('TOOLONGTRANSACTIONCODE_EXCEEDING20').isValid, false);
      assert.strictEqual(validateTcodeSyntax('/INVALID_NAMESPACE').isValid, false);
    });
  });

  describe('D2.2: Decoupled Provider Implementations', () => {
    const registryProvider = new TransactionRegistryProvider();
    const descriptionProvider = new TransactionDescriptionProvider();
    const repositoryProvider = new RepositoryMetadataProvider();
    const ddicProvider = new DDICMetadataProvider();
    const authProvider = new AuthorizationEvidenceProvider();
    const correlationProvider = new GatewayCorrelationProvider();

    it('RegistryProvider confirms existence from authoritative DDIC snapshot', async () => {
      const res = await registryProvider.checkExistence('ME21N');
      assert.strictEqual(res.exists, true);
      assert.strictEqual(res.state, TRANSACTION_EXISTENCE_STATES.CONFIRMED_REGISTERED);
      assert.strictEqual(res.classification, 'STANDARD');
    });

    it('RegistryProvider handles ADT 403 authorization blockage honestly', async () => {
      const res = await registryProvider.checkExistence('Z_CUSTOM_UNKNOWN', {
        adtProbe: { accessible: false, httpStatus: 403, status: 'UNAUTHORIZED' },
        isLiveMode: true
      });
      // MUST NOT be marked false (non-existent)!
      assert.strictEqual(res.exists, null);
      assert.strictEqual(res.state, TRANSACTION_EXISTENCE_STATES.PENDING_VERIFICATION);
      assert.ok(res.requiredAuthorizations && res.requiredAuthorizations.length > 0);
    });

    it('DescriptionProvider supports multilingual descriptions (EN and DE)', () => {
      const enDesc = descriptionProvider.resolveDescription('ME21N', { language: 'EN' });
      assert.strictEqual(enDesc.description, 'Create Purchase Order');
      assert.strictEqual(enDesc.language, 'EN');

      const deDesc = descriptionProvider.resolveDescription('ME21N', { language: 'DE' });
      assert.strictEqual(deDesc.description, 'Bestellung anlegen');
      assert.strictEqual(deDesc.language, 'DE');
    });

    it('RepositoryMetadataProvider returns program, package, and component', () => {
      const meta = repositoryProvider.resolveMetadata('ME21N');
      assert.strictEqual(meta.program, 'SAPLMEGUI');
      assert.strictEqual(meta.packageName, 'ME');
      assert.strictEqual(meta.softwareComponent, 'S4CORE 108');
      assert.strictEqual(meta.isVerified, true);
    });

    it('DDICMetadataProvider returns screen number and source tables', () => {
      const ddic = ddicProvider.resolveDDIC('ME21N');
      assert.strictEqual(ddic.screenNumber, '1000');
      assert.ok(ddic.sourceTables.includes('TSTC'));
    });

    it('AuthorizationEvidenceProvider returns verified SU24 authorization objects', () => {
      const auth = authProvider.resolveAuthorizations('ME21N');
      assert.ok(auth.authorizationObjects.includes('M_BEST_EKO'));
      assert.ok(auth.authorizationObjects.includes('M_BEST_BSA'));
      assert.strictEqual(auth.provenance, 'SU24_VERIFIED_DEFAULTS');
    });

    it('GatewayCorrelationProvider correlates matching services accurately', async () => {
      const sampleServices = [
        { technicalServiceName: 'MM_PUR_PO_MAINT_V2_SRV', title: 'Manage Purchase Orders', description: 'Purchase Order Management' },
        { technicalServiceName: 'FAP_PAYMENT_POST_SRV', title: 'Post Outgoing Payments', description: 'Outgoing Payments' }
      ];

      const correlated = await correlationProvider.correlateServices('ME21N', sampleServices);
      assert.strictEqual(correlated.length, 1);
      assert.strictEqual(correlated[0].technicalServiceName, 'MM_PUR_PO_MAINT_V2_SRV');
    });
  });

  describe('D2.3: Discovery Adapter Integration & Authorization Blockage Invariant', () => {
    it('discovers all snapshot transactions beyond the former 6-entry hardcoded registry', async () => {
      const mockBtp = {
        executeRequest: async () => ({ success: true, httpStatus: 403, statusCode: 'FORBIDDEN' })
      };
      const mockGateway = {
        getCatalogServices: async () => ({
          success: true,
          totalCount: 1,
          services: [{ technicalServiceName: 'MM_PUR_PO_MAINT_V2_SRV', title: 'Manage PO', description: 'Purchase Order' }]
        })
      };

      const adapter = new SapTransactionDiscoveryAdapter({
        btpAdapter: mockBtp,
        gatewayAdapter: mockGateway
      });

      // Test transactions that were previously missing from the 6-item hardcoded registry:
      // MIGO, BP, MIRO, FB60, FS00, ME22N, ZPURCHASE
      const extendedTcodes = ['MIGO', 'BP', 'MIRO', 'FB60', 'FS00', 'ME22N', 'ZPURCHASE'];
      for (const tcode of extendedTcodes) {
        const result = await adapter.discoverTransaction(tcode);
        assert.strictEqual(result.success, true, `T-Code ${tcode} discovery must succeed`);
        assert.ok(result.transaction, `Transaction ${tcode} must have metadata`);
        assert.strictEqual(result.transaction.tcode, tcode);
        assert.strictEqual(result.verificationStatus, 'PARTIALLY_AVAILABLE');
        assert.ok(result.basisAuthorizationRequirements, 'Should document Basis auth requirements when ADT is 403');
      }
    });

    it('never declares NOT_FOUND when ADT returns 403 for an un-snapshotted valid T-Code', async () => {
      const mockBtp = {
        executeRequest: async () => ({ success: true, httpStatus: 403, statusCode: 'FORBIDDEN' })
      };
      const mockGateway = {
        getCatalogServices: async () => ({
          success: true,
          totalCount: 1,
          services: []
        })
      };

      const adapter = new SapTransactionDiscoveryAdapter({
        btpAdapter: mockBtp,
        gatewayAdapter: mockGateway
      });

      // Query an arbitrary valid T-Code not in snapshot
      const result = await adapter.discoverTransaction('CA01');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.statusCode, 'PARTIAL_METADATA');
      assert.strictEqual(result.verificationStatus, 'PENDING_VERIFICATION');
      assert.notStrictEqual(result.verificationStatus, 'NOT_FOUND');
      assert.ok(result.basisAuthorizationRequirements);
      assert.ok(result.basisAuthorizationRequirements.requiredObjects.some((o) => o.includes('S_ADT_RES')));
    });

    it('returns LIVE_CONNECTION_FAILED on network failure without declaring NOT_FOUND', async () => {
      const mockBtp = {
        executeRequest: async () => ({ success: false, httpStatus: 502, errorMessage: 'Network unreachable' })
      };
      const mockGateway = {
        getCatalogServices: async () => ({
          success: false,
          httpStatus: 502,
          errorMessage: 'Connection refused to S21 Gateway'
        })
      };

      const adapter = new SapTransactionDiscoveryAdapter({
        btpAdapter: mockBtp,
        gatewayAdapter: mockGateway
      });

      const result = await adapter.discoverTransaction('ME21N');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.statusCode, 'LIVE_CONNECTION_FAILED');
      assert.strictEqual(result.httpStatus, 502);
      assert.notStrictEqual(result.verificationStatus, 'NOT_FOUND');
    });
  });

  describe('D2.4: Discovery Engine Canonical Pipeline Integration', () => {
    it('executes canonical discovery pipeline with provider-backed evidence collection', async () => {
      const mockBtp = {
        executeRequest: async () => ({ success: true, httpStatus: 403, statusCode: 'FORBIDDEN' })
      };
      const mockGateway = {
        getCatalogServices: async () => ({
          success: true,
          totalCount: 1,
          services: [{ technicalServiceName: 'MM_PUR_PO_MAINT_V2_SRV', title: 'Manage PO', description: 'Purchase Order' }]
        })
      };

      const liveDiscoveryAdapter = new SapTransactionDiscoveryAdapter({
        btpAdapter: mockBtp,
        gatewayAdapter: mockGateway
      });

      const engine = new TransactionDiscoveryEngine({ liveDiscoveryAdapter });
      const discResult = await engine.discover({
        tcode: 'ME21N',
        useLiveSap: true,
        systemId: 'S21-200'
      });

      assert.strictEqual(discResult.success, true);
      assert.strictEqual(discResult.tcode, 'ME21N');
      assert.strictEqual(discResult.program, 'SAPLMEGUI');
      assert.strictEqual(discResult.package, 'ME');
      assert.strictEqual(discResult.softwareComponent, 'S4CORE 108');
      assert.ok(discResult.evidence.length > 0);
      assert.strictEqual(discResult.mode, 'LIVE_SAP');
    });
  });
});

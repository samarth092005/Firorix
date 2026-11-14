/**
 * Fiorify — Generation Handoff Operational Records Investigation & Audit (S0.4)
 *
 * Implements:
 * 1. Cryptographic SHA-256 snapshot and backup of backend/data/generationHandoffs.json
 * 2. In-depth analysis of provenance, approval metadata, and assessment binding
 * 3. Classification into RECONCILED_OPERATIONAL, DEMO_FIXTURE, and ORPHAN_UNVERIFIED
 * 4. Safe remediation: preserves full historical metadata while preventing unverified
 *    approvals from being treated as authoritative BUILD authorization.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function investigateHandoffs(customDataDir = null) {
  const dataDir = customDataDir || path.resolve(__dirname, '../../../../data');
  const handoffPath = path.join(dataDir, 'generationHandoffs.json');
  const asmPath = path.join(dataDir, 'assessments.json');

  if (!fs.existsSync(handoffPath)) {
    throw new Error(`Generation handoffs file not found at ${handoffPath}`);
  }

  const rawHandoffs = fs.readFileSync(handoffPath);
  const contentHash = crypto.createHash('sha256').update(rawHandoffs).digest('hex');
  const handoffs = JSON.parse(rawHandoffs.toString('utf8'));

  let assessments = [];
  if (fs.existsSync(asmPath)) {
    assessments = JSON.parse(fs.readFileSync(asmPath, 'utf8'));
  }
  const asmMap = new Map(assessments.map(a => [a.id, a]));

  // 1. Create Timestamped Pre-Investigation Backup
  const backupDir = path.join(dataDir, 'backups', `handoffs-audit-${Date.now()}`);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFilePath = path.join(backupDir, 'generationHandoffs.original.json');
  fs.writeFileSync(backupFilePath, rawHandoffs);

  const manifest = {
    timestamp: new Date().toISOString(),
    sourceFile: handoffPath,
    sha256: contentHash,
    recordCount: handoffs.length,
    backupFile: backupFilePath
  };
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 2. Perform Detailed Classification and Verification
  const report = {
    timestamp: new Date().toISOString(),
    sha256: contentHash,
    totalRecords: handoffs.length,
    categories: {
      reconciledOperational: 0,
      demoFixture: 0,
      orphanUnverified: 0
    },
    findings: [],
    remediatedRecords: []
  };

  const knownFixtureIds = new Set([
    'ASM-BUILD-PO-2023',
    'ASM-BUILD-TEST-001',
    'ASM-PROP-ZPAY-001'
  ]);

  for (const h of handoffs) {
    const aid = h.sourceAssessmentId || h.assessmentId;
    const asm = asmMap.get(aid);
    const hasAsm = Boolean(asm);
    const isKnownFixture = knownFixtureIds.has(aid) || (h.handoffId && h.handoffId.includes('TEST'));
    const approver = (h.leadArchitectApproval && h.leadArchitectApproval.approver) || h.approver || 'UNKNOWN';
    const hasGenericAdminApprover = approver === 'Admin' || approver === 'Enterprise System Administrator';
    const gaps = h.identifiedGaps || h.fitGapSummary?.identifiedGaps || [];
    const hasGaps = Array.isArray(gaps) && gaps.length > 0;
    const hasRequirements = Boolean(h.businessRequirements && Object.keys(h.businessRequirements).length > 0);

    let category = 'ORPHAN_UNVERIFIED';
    let remediationNote = '';

    if (hasAsm && hasGaps && hasRequirements && !hasGenericAdminApprover) {
      category = 'RECONCILED_OPERATIONAL';
      report.categories.reconciledOperational++;
    } else if (isKnownFixture || !hasAsm) {
      category = 'DEMO_FIXTURE';
      report.categories.demoFixture++;
      remediationNote = hasAsm
        ? 'Retained as development/demo fixture linked to assessment.'
        : `Assessment "${aid}" not in active store; preserved as standalone demo fixture.`;
    } else {
      category = 'ORPHAN_UNVERIFIED';
      report.categories.orphanUnverified++;
      remediationNote = 'Historical approval attributed to generic Admin; requires architect re-validation before BUILD COMMISSION.';
    }

    const finding = {
      handoffId: h.handoffId,
      sourceAssessmentId: aid,
      tcode: h.tcode,
      category,
      hasMatchingAssessment: hasAsm,
      approver,
      hasGaps,
      gapsCount: gaps.length,
      hasRequirements,
      remediationNote
    };
    report.findings.push(finding);

    // Build remediated record preserving 100% of historical metadata
    const remediated = {
      ...h,
      provenanceClassification: category,
      historicalApproval: {
        originalApprovalStatus: h.approvalStatus,
        originalApprover: approver,
        originalApprovedAt: h.leadArchitectApproval?.approvedAt || h.createdAt,
        verifiedByArchitectPermission: !hasGenericAdminApprover && hasAsm
      },
      // If approval was generic admin or orphan, mark status so UI/engine treats as PENDING_REVALIDATION
      approvalStatus: category === 'RECONCILED_OPERATIONAL'
        ? h.approvalStatus
        : (category === 'DEMO_FIXTURE' ? 'DEMO_FIXTURE' : 'PENDING_REVALIDATION'),
      revalidationRequired: category !== 'RECONCILED_OPERATIONAL'
    };
    report.remediatedRecords.push(remediated);
  }

  // 3. Write Remediated Records and Quarantine Log
  fs.writeFileSync(handoffPath, JSON.stringify(report.remediatedRecords, null, 2), 'utf8');

  const reportPath = path.join(dataDir, 'generationHandoffs_audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('investigateHandoffs.js')) {
  try {
    const rep = investigateHandoffs();
    console.log('=== S0.4 GENERATION HANDOFF INVESTIGATION REPORT ===');
    console.log(`Total Records: ${rep.totalRecords}`);
    console.log(`Reconciled Operational: ${rep.categories.reconciledOperational}`);
    console.log(`Demo Fixtures: ${rep.categories.demoFixture}`);
    console.log(`Orphan / Unverified: ${rep.categories.orphanUnverified}`);
    console.log(`SHA-256 Checksum: ${rep.sha256}`);
  } catch (err) {
    console.error('Investigation failed:', err);
    process.exit(1);
  }
}

export default investigateHandoffs;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransactionCode, TechnicalObject, TechnicalEvidence } from '../../types';
import { transactionService } from '../../services/mock/transactionService';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { EvidenceDetailDialog } from '../../components/dialogs/EvidenceDetailDialog';
import { ArrowLeft, SearchCode, Database, Key, FileCode, PlusCircle, HelpCircle } from 'lucide-react';

export const TCodeDetailPage: React.FC = () => {
  const { tcode } = useParams<{ tcode: string }>();
  const navigate = useNavigate();
  const [tx, setTx] = useState<TransactionCode | null>(null);
  const [techObjects, setTechObjects] = useState<TechnicalObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<{ name: string; evidence: TechnicalEvidence } | null>(null);

  useEffect(() => {
    if (tcode) {
      Promise.all([
        transactionService.getTransactionByCode(tcode),
        transactionService.getTechnicalObjectsForTCode(tcode)
      ]).then(([txRes, objRes]) => {
        setTx(txRes.data);
        setTechObjects(objRes.data);
        setLoading(false);
      });
    }
  }, [tcode]);

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading technical object graph...</div>;
  }

  if (!tx) {
    return (
      <div style={{ padding: '32px' }}>
        <MessageStrip type="error">Transaction code {tcode} not found in local discovery repository.</MessageStrip>
        <button className="fiori-btn fiori-btn-secondary" onClick={() => navigate('/explorer')}>
          Back to Explorer
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto' }}>
      <button
        type="button"
        className="fiori-btn fiori-btn-subtle"
        style={{ marginBottom: '14px', paddingLeft: 0 }}
        onClick={() => navigate('/explorer')}
      >
        <ArrowLeft size={14} /> Back to Transaction Explorer
      </button>

      {/* Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SearchCode size={24} color="var(--fiori-teal)" />
            <h1 className="fiori-page-title" style={{ fontFamily: 'var(--font-mono)' }}>
              {tx.tcode}
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '2px',
                backgroundColor: tx.type === 'CUSTOM' ? 'var(--fiori-warning-bg)' : 'var(--fiori-info-bg)',
                color: tx.type === 'CUSTOM' ? 'var(--fiori-warning)' : 'var(--fiori-info)'
              }}
            >
              {tx.type} TRANSACTION
            </span>
            <StatusBadge status={tx.assessmentStatus} />
          </div>
          <p className="fiori-page-subtitle">{tx.description}</p>
        </div>

        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          onClick={() => navigate(`/assessments/new?tcode=${tx.tcode}`)}
        >
          <PlusCircle size={14} /> Assess This Transaction
        </button>
      </div>

      <MessageStrip type="info">
        <strong>Provenance Note:</strong> Metadata verified via ADT Node.js discovery spike on target system <code>S4H_DEV_100</code>. Unverifiable runtime dependencies are tagged with <code>UNKNOWN</code>.
      </MessageStrip>

      {/* Core Attributes Card */}
      <div className="fiori-card" style={{ marginBottom: '20px' }}>
        <div className="fiori-card-header">
          <div className="fiori-card-title">
            <FileCode size={16} color="var(--fiori-teal)" /> Core Transaction Metadata (TSTC / TADIR)
          </div>
        </div>
        <div className="fiori-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px' }}>
            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>PRIMARY PROGRAM</div>
              <code style={{ fontSize: '13px', fontWeight: 600 }}>{tx.programName}</code>
            </div>
            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>PACKAGE / DEV CLASS</div>
              <code style={{ fontSize: '13px' }}>{tx.packageName}</code>
            </div>
            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>FUNCTIONAL MODULE</div>
              <div style={{ fontWeight: 600 }}>{tx.module}</div>
            </div>
            <div>
              <div style={{ color: 'var(--fiori-text-secondary)', fontSize: '11px', fontWeight: 600 }}>TOTAL DISCOVERED OBJECTS</div>
              <div style={{ fontWeight: 600 }}>{tx.objectsCount} Objects</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Object Discovered List */}
      <div className="fiori-card">
        <div className="fiori-card-header">
          <div className="fiori-card-title">
            <Database size={16} color="var(--fiori-teal)" /> Discovered Repository & DDIC Objects ({techObjects.length})
          </div>
        </div>
        <div style={{ padding: 0 }}>
          <table className="fiori-table">
            <thead>
              <tr>
                <th>Object Name</th>
                <th>Object Type</th>
                <th>Description</th>
                <th>Package</th>
                <th>Discovery Status</th>
                <th style={{ textAlign: 'right' }}>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {techObjects.map((obj) => (
                <tr key={obj.id}>
                  <td>
                    <code style={{ fontWeight: 600, color: 'var(--fiori-text-primary)' }}>{obj.name}</code>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)' }}>
                      {obj.type}
                    </span>
                  </td>
                  <td>{obj.description}</td>
                  <td>
                    <code>{obj.packageName}</code>
                  </td>
                  <td>
                    <StatusBadge status={obj.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-subtle"
                      style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                      onClick={() => setSelectedEvidence({ name: obj.name, evidence: obj.evidence })}
                    >
                      <HelpCircle size={12} /> Inspect Evidence
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EvidenceDetailDialog
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        objectName={selectedEvidence?.name || ''}
        evidence={selectedEvidence?.evidence || null}
      />
    </div>
  );
};

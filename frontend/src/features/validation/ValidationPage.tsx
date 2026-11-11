import React, { useState } from 'react';
import { localStore } from '../../services/mock/localStore';
import { ValidationCategory, ValidationFinding } from '../../types';
import { StatusBadge } from '../../components/status/StatusBadge';
import { MessageStrip } from '../../components/status/MessageStrip';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';

export const ValidationPage: React.FC = () => {
  const allFindings = localStore.getValidationFindings();
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filtered = categoryFilter === 'ALL'
    ? allFindings
    : allFindings.filter(f => f.category === categoryFilter);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Validation Centre & Clean-Core Gate</h1>
        <p className="fiori-page-subtitle">
          Automated structural, architectural, clean-core, and authorization compliance checks executed against generated application blueprints.
        </p>
      </div>

      <MessageStrip type="info">
        <strong>Validation Scope:</strong> Validation tests are executed locally via AST syntactic parsers, JSON schema validators, and SAP Clean Core rule definitions. Live SAP-side syntax checks require S/4HANA sandbox deployment.
      </MessageStrip>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { key: 'ALL', label: 'All Checks' },
          { key: 'CLEAN_CORE', label: 'Clean Core' },
          { key: 'ARCHITECTURE', label: 'Architecture' },
          { key: 'SECURITY', label: 'Security & Auth' },
          { key: 'RELEASE_COMPATIBILITY', label: 'Release Compatibility' }
        ].map((c) => (
          <button
            key={c.key}
            type="button"
            className={`fiori-btn ${categoryFilter === c.key ? 'fiori-btn-primary' : 'fiori-btn-secondary'}`}
            style={{ height: '28px', fontSize: '12px' }}
            onClick={() => setCategoryFilter(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="fiori-table-container">
        <table className="fiori-table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Validation Check & Description</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Evidence & Remediation</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id}>
                <td>
                  <code style={{ fontSize: '12px', fontWeight: 600 }}>{f.ruleId}</code>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{f.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                    {f.description}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--fiori-text-secondary)' }}>
                    {f.category}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color:
                        f.severity === 'CRITICAL'
                          ? 'var(--fiori-error)'
                          : f.severity === 'WARNING'
                          ? 'var(--fiori-warning)'
                          : 'var(--fiori-info)'
                    }}
                  >
                    {f.severity}
                  </span>
                </td>
                <td>
                  <StatusBadge status={f.status} size="md" />
                </td>
                <td style={{ fontSize: '12px', maxWidth: '340px' }}>
                  <div style={{ fontWeight: 500 }}>{f.evidence}</div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-muted)', marginTop: '2px' }}>
                    Remediation: {f.suggestedRemediation}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '11px', color: 'var(--fiori-teal)' }}>
                    {f.sapGuidelineReference}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../app/providers';
import { MessageStrip } from '../../components/status/MessageStrip';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { Settings, RotateCcw, ShieldCheck, Database, Info, Layers } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { resetDemoData, currentUser } = useApp();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="fiori-page-title">Workbench Settings & Platform Configuration</h1>
        <p className="fiori-page-subtitle">
          User profile preferences, display density, environment telemetry, and demo data controls.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* User Identity Profile */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <ShieldCheck size={16} color="var(--fiori-teal)" /> User Profile & Role Simulation
            </div>
          </div>
          <div className="fiori-card-body" style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px' }}>
              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Active User:</span>
              <span><strong>{currentUser.name}</strong></span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Assigned Persona:</span>
              <span>{currentUser.role}</span>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Enterprise Email:</span>
              <code>{currentUser.email}</code>

              <span style={{ color: 'var(--fiori-text-secondary)', fontWeight: 500 }}>Security Context:</span>
              <span>SAP BTP XSUAA Simulated Scope: <code>FioriX_Lead_Consultant</code></span>
            </div>
          </div>
        </div>

        {/* Display Density */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <Layers size={16} color="var(--fiori-teal)" /> Display & Interface Density
            </div>
          </div>
          <div className="fiori-card-body" style={{ fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="density"
                  checked={density === 'compact'}
                  onChange={() => setDensity('compact')}
                />
                <span><strong>Compact Mode (Recommended):</strong> Optimized for high-density enterprise data tables.</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="density"
                  checked={density === 'comfortable'}
                  onChange={() => setDensity('comfortable')}
                />
                <span><strong>Comfortable Mode:</strong> Expanded table rows and input padding.</span>
              </label>
            </div>
          </div>
        </div>

        {/* Local Demo Reset */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <RotateCcw size={16} color="var(--fiori-warning)" /> Demonstration Data Management
            </div>
          </div>
          <div className="fiori-card-body" style={{ fontSize: '13px' }}>
            <p style={{ color: 'var(--fiori-text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              FioriX stores interactive changes (new systems, custom requirements, generated blueprints) in your browser's local storage. You can restore the pristine demonstration seed state at any time.
            </p>
            <button
              type="button"
              className="fiori-btn fiori-btn-danger"
              onClick={() => setIsResetConfirmOpen(true)}
            >
              <RotateCcw size={14} /> Reset Local Demo Data
            </button>
          </div>
        </div>

        {/* System & Runtime Telemetry */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <Info size={16} color="var(--fiori-teal)" /> Platform & Build Information
            </div>
          </div>
          <div className="fiori-card-body" style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '6px' }}>
            <span style={{ color: 'var(--fiori-text-secondary)' }}>FioriX Version:</span>
            <span><strong>1.0.0 (Sprint 1 Release)</strong></span>

            <span style={{ color: 'var(--fiori-text-secondary)' }}>Frontend Architecture:</span>
            <span>React 18.3 &bull; TypeScript 5.5 &bull; Vite 5.4</span>

            <span style={{ color: 'var(--fiori-text-secondary)' }}>Design System:</span>
            <span>SAP Fiori Horizon Enterprise Design System</span>

            <span style={{ color: 'var(--fiori-text-secondary)' }}>Backend Target:</span>
            <span>SAP Cloud Application Programming Model (CAP Node.js / HANA Cloud)</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetDemoData}
        title="Reset Local Demo Data"
        message="This will clear all locally created assessments, requirements, and blueprints, restoring the original demonstration dataset. Are you sure you want to proceed?"
        confirmLabel="Reset Everything"
        isDestructive={true}
      />
    </div>
  );
};

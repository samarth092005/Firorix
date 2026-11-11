import React, { useState } from 'react';
import { Modal } from './Modal';
import { SystemEnvironment } from '../../types';
import { systemService } from '../../services/mock/systemService';
import { MessageStrip } from '../status/MessageStrip';

export interface AddSystemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSystemAdded: () => void;
}

export const AddSystemDialog: React.FC<AddSystemDialogProps> = ({ isOpen, onClose, onSystemAdded }) => {
  const [alias, setAlias] = useState('');
  const [environment, setEnvironment] = useState<SystemEnvironment>('DEVELOPMENT');
  const [destinationRef, setDestinationRef] = useState('');
  const [host, setHost] = useState('');
  const [client, setClient] = useState('100');
  const [releaseProfile, setReleaseProfile] = useState('SAP S/4HANA 2022 FPS02 (ABAP 7.57)');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim() || !destinationRef.trim() || !host.trim()) {
      setError('Please provide System Alias, Destination Reference, and Host.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await systemService.createSystem({
        alias: alias.trim().toUpperCase(),
        environment,
        destinationReference: destinationRef.trim().toUpperCase(),
        host: host.trim(),
        client: client.trim(),
        targetReleaseProfile: releaseProfile,
        connectionStatus: 'CONNECTED_SIMULATED',
        adtEndpoint: `https://${host.trim()}:44300/sap/bc/adt`,
        description: description.trim()
      });
      onSystemAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register system.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register SAP S/4HANA System"
      subtitle="Configure Destination reference and S/4HANA On-Premise parameters"
      footer={
        <>
          <button type="button" className="fiori-btn fiori-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="fiori-btn fiori-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register System'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <MessageStrip type="info">
          System metadata is stored locally. Connectivity is simulated for the local demonstration environment.
        </MessageStrip>

        {error && <MessageStrip type="error">{error}</MessageStrip>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="fiori-form-group">
            <label className="fiori-label fiori-label-required">System Alias</label>
            <input
              type="text"
              className="fiori-input"
              placeholder="e.g. S4H_DEV_100"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
            />
          </div>

          <div className="fiori-form-group">
            <label className="fiori-label fiori-label-required">Environment Tier</label>
            <select
              className="fiori-select"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as SystemEnvironment)}
            >
              <option value="DEVELOPMENT">Development (DEV)</option>
              <option value="QUALITY">Quality (QAS)</option>
              <option value="SANDBOX">Sandbox (SBX)</option>
              <option value="PRODUCTION">Production (PRD)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div className="fiori-form-group">
            <label className="fiori-label fiori-label-required">Destination Reference</label>
            <input
              type="text"
              className="fiori-input"
              placeholder="e.g. S4H_DEV_ONPREM_DEST"
              value={destinationRef}
              onChange={(e) => setDestinationRef(e.target.value)}
              required
            />
          </div>

          <div className="fiori-form-group">
            <label className="fiori-label fiori-label-required">SAP Client</label>
            <input
              type="text"
              className="fiori-input"
              placeholder="100"
              maxLength={3}
              value={client}
              onChange={(e) => setClient(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="fiori-form-group">
          <label className="fiori-label fiori-label-required">Internal Host / Virtual Host</label>
          <input
            type="text"
            className="fiori-input"
            placeholder="e.g. s4h-dev.corp.internal"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
        </div>

        <div className="fiori-form-group">
          <label className="fiori-label">Target Release Profile</label>
          <select
            className="fiori-select"
            value={releaseProfile}
            onChange={(e) => setReleaseProfile(e.target.value)}
          >
            <option value="SAP S/4HANA 2022 FPS02 (ABAP 7.57)">SAP S/4HANA 2022 FPS02 (ABAP 7.57)</option>
            <option value="SAP S/4HANA 2023 (ABAP 7.58 / ABAP Cloud)">SAP S/4HANA 2023 (ABAP 7.58 / ABAP Cloud)</option>
            <option value="SAP S/4HANA 2021 (ABAP 7.56)">SAP S/4HANA 2021 (ABAP 7.56)</option>
            <option value="SAP S/4HANA 2020 (ABAP 7.55)">SAP S/4HANA 2020 (ABAP 7.55)</option>
          </select>
        </div>

        <div className="fiori-form-group">
          <label className="fiori-label">Description / Purpose</label>
          <input
            type="text"
            className="fiori-input"
            placeholder="e.g. Sales & Logistics Prototype Sandbox"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Layers,
  Link,
  Table,
  Key,
  Info,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import {
  GenerationProject,
  GenerationEntity,
  GenerationField,
  GenerationRelationship,
  DataModelSpec,
  DataModelValidationReport,
  CdsRegistryEntry,
  StudioInternalView
} from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';

interface DataModelDesignerProps {
  project: GenerationProject;
  onProjectUpdated: (updatedProject: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
}

const ABAP_TYPES = [
  'abap.char',
  'abap.numc',
  'abap.int4',
  'abap.int8',
  'abap.dec',
  'abap.curr',
  'abap.quan',
  'abap.cuky',
  'abap.unit',
  'abap.dats',
  'abap.tims',
  'abap.utclong',
  'abap.boolean',
  'sysuuid_x16'
];

const SEMANTIC_ROLES = [
  'GENERAL',
  'KEY',
  'PARENT_KEY',
  'DOCUMENT_NUMBER',
  'ITEM_NUMBER',
  'CODE',
  'AMOUNT',
  'QUANTITY',
  'CURRENCY_CODE',
  'UNIT_CODE',
  'STATUS',
  'DESCRIPTION'
];

export const DataModelDesigner: React.FC<DataModelDesignerProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [dataModel, setDataModel] = useState<DataModelSpec>({
    specVersion: 1,
    entities: [],
    relationships: [],
    status: 'EMPTY'
  });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<DataModelValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal dialog states
  const [entityModalOpen, setEntityModalOpen] = useState<boolean>(false);
  const [fieldModalOpen, setFieldModalOpen] = useState<boolean>(false);
  const [relModalOpen, setRelModalOpen] = useState<boolean>(false);
  const [cdsModalOpen, setCdsModalOpen] = useState<boolean>(false);
  const [suggestModalOpen, setSuggestModalOpen] = useState<boolean>(false);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [suggestedModel, setSuggestedModel] = useState<any>(null);

  // CDS search state
  const [cdsSearch, setCdsSearch] = useState('');
  const [cdsResults, setCdsResults] = useState<CdsRegistryEntry[]>([]);

  // Entity Modal form state
  const [newEntity, setNewEntity] = useState({
    name: '',
    businessName: '',
    entityType: 'ROOT' as 'ROOT' | 'CHILD' | 'REFERENCE',
    tableName: '',
    cdsViewName: '',
    parentEntity: ''
  });

  // Field Modal form state
  const [newField, setNewField] = useState<Partial<GenerationField>>({
    name: '',
    label: '',
    type: 'abap.char',
    length: 40,
    precision: null,
    scale: null,
    isKey: false,
    isMandatory: false,
    semanticRole: 'GENERAL',
    cukyField: '',
    unitField: ''
  });

  // Relationship Modal form state
  const [newRel, setNewRel] = useState({
    name: '_Item',
    relationshipType: 'COMPOSITION' as 'COMPOSITION' | 'ASSOCIATION',
    sourceEntityId: '',
    targetEntityId: '',
    cardinality: '[0..*]' as '[0..1]' | '[1..1]' | '[0..*]' | '[1..*]',
    sourceField: '',
    targetField: ''
  });

  // Load Data Model on mount
  useEffect(() => {
    loadDataModel();
  }, [project.projectId]);

  const loadDataModel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.getDataModel(project.projectId);
      const raw = res.dataModel || {};
      const safeDataModel: DataModelSpec = {
        specVersion: raw.specVersion || 1,
        rootEntity: raw.rootEntity || null,
        entities: Array.isArray(raw.entities) ? raw.entities : [],
        relationships: Array.isArray(raw.relationships) ? raw.relationships : [],
        validationReport: raw.validationReport || null,
        status: raw.status || 'EMPTY'
      };
      setDataModel(safeDataModel);
      if (safeDataModel.validationReport) {
        setValidationReport(safeDataModel.validationReport);
      }
      if (safeDataModel.entities.length > 0 && !selectedEntityId) {
        setSelectedEntityId(safeDataModel.entities[0].entityId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data model');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEntity = useMemo(() => {
    return (dataModel.entities || []).find((e) => e.entityId === selectedEntityId) || null;
  }, [dataModel.entities, selectedEntityId]);

  // Add Entity
  const handleCreateEntity = async () => {
    if (!newEntity.name.trim()) {
      alert('Entity name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const payload: Partial<GenerationEntity> = {
        name: newEntity.name.trim(),
        businessName: newEntity.businessName.trim() || newEntity.name.trim(),
        entityType: newEntity.entityType,
        isRoot: newEntity.entityType === 'ROOT',
        tableName: newEntity.tableName.trim() || `Z${newEntity.name.toUpperCase()}`,
        cdsViewName: newEntity.cdsViewName.trim() || `ZR_${newEntity.name}`,
        parentEntity: newEntity.parentEntity.trim() || undefined,
        fields: [
          {
            fieldId: `F-${Date.now()}-KEY`,
            name: `${newEntity.name}ID`,
            label: `${newEntity.name} ID`,
            type: 'abap.char',
            length: 10,
            isKey: true,
            isMandatory: true,
            semanticRole: 'DOCUMENT_NUMBER'
          }
        ]
      };

      const res = await defaultFrontendGenerationProjectService.addEntity(project.projectId, payload);
      setEntityModalOpen(false);
      setNewEntity({ name: '', businessName: '', entityType: 'CHILD', tableName: '', cdsViewName: '', parentEntity: '' });
      await loadDataModel();
      setSelectedEntityId(res.entity.entityId);
      setSuccessMsg(`Entity "${res.entity.name}" created!`);
    } catch (err: any) {
      setError(err.message || 'Failed to create entity');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Standard SAP CDS View from Registry
  const handleAddCdsView = async (view: CdsRegistryEntry) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: Partial<GenerationEntity> = {
        name: view.technicalName,
        businessName: view.businessDescription,
        entityType: 'REFERENCE',
        isRoot: false,
        cdsViewName: view.technicalName,
        sourceProvenance: 'OFFICIAL_SAP_DOCUMENTATION',
        fields: view.keyFields.map((k) => ({
          fieldId: `F-${Date.now()}-${k}`,
          name: k,
          label: k,
          type: 'abap.char',
          length: 10,
          isKey: true,
          isMandatory: true,
          semanticRole: 'KEY'
        }))
      };

      const res = await defaultFrontendGenerationProjectService.addEntity(project.projectId, payload);
      setCdsModalOpen(false);
      await loadDataModel();
      setSelectedEntityId(res.entity.entityId);
      setSuccessMsg(`Added standard SAP CDS view "${view.technicalName}"!`);
    } catch (err: any) {
      setError(err.message || 'Failed to add CDS view');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Entity
  const handleDeleteEntity = async (entityId: string) => {
    if (!window.confirm('Are you sure you want to delete this entity and its relationships?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await defaultFrontendGenerationProjectService.deleteEntity(project.projectId, entityId);
      await loadDataModel();
      setSelectedEntityId(null);
      setSuccessMsg('Entity deleted.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete entity');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Field
  const handleAddField = async () => {
    if (!selectedEntityId || !newField.name?.trim()) {
      alert('Field name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await defaultFrontendGenerationProjectService.addField(project.projectId, selectedEntityId, newField);
      setFieldModalOpen(false);
      setNewField({
        name: '',
        label: '',
        type: 'abap.char',
        length: 40,
        precision: null,
        scale: null,
        isKey: false,
        isMandatory: false,
        semanticRole: 'GENERAL',
        cukyField: '',
        unitField: ''
      });
      await loadDataModel();
      setSuccessMsg('Field added successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add field');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Field
  const handleDeleteField = async (fieldId: string) => {
    if (!selectedEntityId) return;
    setIsLoading(true);
    setError(null);
    try {
      await defaultFrontendGenerationProjectService.deleteField(project.projectId, selectedEntityId, fieldId);
      await loadDataModel();
      setSuccessMsg('Field deleted.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete field');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Relationship
  const handleAddRelationship = async () => {
    if (!newRel.name.trim() || !newRel.sourceEntityId || !newRel.targetEntityId) {
      alert('Relationship name, source, and target are required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const payload: Partial<GenerationRelationship> = {
        name: newRel.name.trim(),
        relationshipType: newRel.relationshipType,
        sourceEntityId: newRel.sourceEntityId,
        targetEntityId: newRel.targetEntityId,
        cardinality: newRel.cardinality,
        mapping: newRel.sourceField && newRel.targetField ? [{ sourceField: newRel.sourceField, targetField: newRel.targetField }] : []
      };

      await defaultFrontendGenerationProjectService.addRelationship(project.projectId, payload);
      setRelModalOpen(false);
      await loadDataModel();
      setSuccessMsg('Relationship established!');
    } catch (err: any) {
      setError(err.message || 'Failed to add relationship');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Relationship
  const handleDeleteRelationship = async (relId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await defaultFrontendGenerationProjectService.deleteRelationship(project.projectId, relId);
      await loadDataModel();
      setSuccessMsg('Relationship deleted.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete relationship');
    } finally {
      setIsLoading(false);
    }
  };

  // Run Multi-category Validation
  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.validateDataModel(project.projectId);
      setValidationReport(res.validationReport);
      // Reload parent project state
      const updated = await defaultFrontendGenerationProjectService.getProject(project.projectId);
      onProjectUpdated(updated);
      setSuccessMsg(`Validation completed: Status is ${res.validationReport.status}`);
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  // Search CDS views
  const handleSearchCds = async () => {
    try {
      const res = await defaultFrontendGenerationProjectService.searchCdsRegistry(cdsSearch);
      setCdsResults(res.views);
    } catch (err: any) {
      setError(err.message || 'Failed to search CDS registry');
    }
  };

  // Suggest Data Model from Discovery Evidence
  const handleSuggestDataModel = async () => {
    setIsSuggesting(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.suggestDataModel(project.projectId);
      setSuggestedModel(res.suggestedDataModel);
      setSuggestModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate data model suggestion.');
    } finally {
      setIsSuggesting(false);
    }
  };

  // Apply Suggested Data Model
  const handleApplySuggestion = async () => {
    if (!suggestedModel) return;
    try {
      setIsLoading(true);
      await defaultFrontendGenerationProjectService.saveDataModel(project.projectId, {
        entities: suggestedModel.entities,
        relationships: suggestedModel.relationships
      });
      setSuggestModalOpen(false);
      await loadDataModel();
      await handleValidate();
      setSuccessMsg('Evidence-driven CDS data model applied successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to apply suggested data model.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Top Banner & Validation Controls */}
      <div
        style={{
          padding: '16px 20px',
          background: validationReport?.errorCount === 0 ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${validationReport?.errorCount === 0 ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={24} color="#0284c7" />
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>
              CDS Data Model Designer (RAP Managed BO Hierarchy)
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {validationReport
                ? `Validation Status: ${validationReport.status} — ${validationReport.errorCount} Errors, ${validationReport.warningCount} Warnings`
                : 'Define business object entities, ABAP types, semantic associations, and compositions.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleSuggestDataModel}
            disabled={isSuggesting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#0F172A',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSuggesting ? 'not-allowed' : 'pointer'
            }}
            title="Derive entities and fields from verified discovery facts"
          >
            <Sparkles size={16} color="#38BDF8" /> {isSuggesting ? 'Analyzing Discovery...' : 'Suggest Data Model'}
          </button>

          <button
            onClick={handleValidate}
            disabled={isValidating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={16} /> {isValidating ? 'Validating...' : 'Validate Data Model'}
          </button>

          {validationReport && validationReport.errorCount === 0 && (
            <button
              onClick={() => onNavigateView('architecture')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Handoff to Architecture <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '6px', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      {/* Main 3-Pane Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 340px', gap: '16px', flex: 1, minHeight: '520px' }}>
        {/* Left Column: Entity Hierarchy Tree */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
              Entities ({(dataModel.entities || []).length})
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setEntityModalOpen(true)}
                style={{ padding: '4px 8px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                + Entity
              </button>
              <button
                onClick={() => {
                  setCdsModalOpen(true);
                  handleSearchCds();
                }}
                style={{ padding: '4px 8px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                + SAP CDS
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {(dataModel.entities || []).length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No entities defined yet. Add a Root Entity to begin modeling.
              </div>
            ) : (
              (dataModel.entities || []).map((ent) => {
                const isSelected = ent.entityId === selectedEntityId;
                const isRoot = ent.entityType === 'ROOT';

                return (
                  <div
                    key={ent.entityId}
                    onClick={() => setSelectedEntityId(ent.entityId)}
                    style={{
                      padding: '10px 12px',
                      marginBottom: '8px',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                      background: isSelected ? '#f0f9ff' : isRoot ? '#fafafa' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                        {ent.name}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: isRoot ? '#dbeafe' : '#f1f5f9',
                          color: isRoot ? '#1e40af' : '#475569'
                        }}
                      >
                        {ent.entityType}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {ent.fields?.length || 0} fields • CDS: {ent.cdsViewName || ent.name}
                    </div>
                  </div>
                );
              })
            )}

            {/* Relationships Overview */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  Relationships ({(dataModel.relationships || []).length})
                </span>
                <button
                  onClick={() => {
                    const ents = dataModel.entities || [];
                    setNewRel({
                      name: '_Item',
                      relationshipType: 'COMPOSITION',
                      sourceEntityId: ents[0]?.entityId || '',
                      targetEntityId: ents[1]?.entityId || '',
                      cardinality: '[0..*]',
                      sourceField: '',
                      targetField: ''
                    });
                    setRelModalOpen(true);
                  }}
                  disabled={(dataModel.entities || []).length < 2}
                  style={{ padding: '2px 6px', fontSize: '10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  + Rel
                </button>
              </div>

              {(dataModel.relationships || []).map((rel) => {
                const ents = dataModel.entities || [];
                const src = ents.find((e) => e.entityId === rel.sourceEntityId)?.name || rel.sourceEntityId;
                const tgt = ents.find((e) => e.entityId === rel.targetEntityId)?.name || rel.targetEntityId;

                return (
                  <div
                    key={rel.relationshipId}
                    style={{
                      padding: '6px 8px',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>
                      <strong>{rel.name}</strong>: {src} ➔ {tgt} ({rel.cardinality})
                    </span>
                    <button
                      onClick={() => handleDeleteRelationship(rel.relationshipId)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Selected Entity Field Editor */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {selectedEntity ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Entity Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                    {selectedEntity.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    CDS View: <code>{selectedEntity.cdsViewName}</code> • Database Table: <code>{selectedEntity.tableName}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setFieldModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Field
                  </button>

                  <button
                    onClick={() => handleDeleteEntity(selectedEntity.entityId)}
                    style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', color: '#dc2626', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Fields Table */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                  Entity Fields & Data Dictionary
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Field Name</th>
                      <th style={{ padding: '8px' }}>Label</th>
                      <th style={{ padding: '8px' }}>ABAP Type</th>
                      <th style={{ padding: '8px' }}>Length</th>
                      <th style={{ padding: '8px' }}>Key</th>
                      <th style={{ padding: '8px' }}>Mandatory</th>
                      <th style={{ padding: '8px' }}>Role</th>
                      <th style={{ padding: '8px' }}>Ref Field</th>
                      <th style={{ padding: '8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedEntity.fields || []).map((f) => (
                      <tr key={f.fieldId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{f.name}</td>
                        <td style={{ padding: '8px', color: '#475569' }}>{f.label}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: '#0284c7' }}>{f.type}</td>
                        <td style={{ padding: '8px' }}>{f.length || '-'}</td>
                        <td style={{ padding: '8px' }}>{f.isKey ? <Key size={14} color="#f59e0b" /> : '-'}</td>
                        <td style={{ padding: '8px' }}>{f.isMandatory ? '✓' : '-'}</td>
                        <td style={{ padding: '8px', fontSize: '11px', color: '#64748b' }}>{f.semanticRole}</td>
                        <td style={{ padding: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                          {f.cukyField || f.unitField || '-'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteField(f.fieldId)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
              Select an entity on the left to inspect and edit fields.
            </div>
          )}
        </div>

        {/* Right Column: Multi-Category Validation Panel */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
            Validation Findings & Clean Core Rules
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {validationReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', fontSize: '11px' }}>
                  <div style={{ padding: '6px', background: '#fee2e2', borderRadius: '4px', color: '#991b1b', fontWeight: 600 }}>
                    {validationReport.errorCount || 0} Errors
                  </div>
                  <div style={{ padding: '6px', background: '#fef3c7', borderRadius: '4px', color: '#92400e', fontWeight: 600 }}>
                    {validationReport.warningCount || 0} Warnings
                  </div>
                  <div style={{ padding: '6px', background: '#f1f5f9', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                    {validationReport.infoCount || 0} Info
                  </div>
                </div>

                {(validationReport.findings || []).length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#16a34a', fontSize: '13px' }}>
                    ✓ Clean Core Data Model verified! No errors or warnings found.
                  </div>
                ) : (
                  (validationReport.findings || []).map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: `1px solid ${f.severity === 'ERROR' ? '#fecaca' : f.severity === 'WARNING' ? '#fde68a' : '#cbd5e1'}`,
                        background: f.severity === 'ERROR' ? '#fef2f2' : f.severity === 'WARNING' ? '#fffbeb' : '#f8fafc',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: f.severity === 'ERROR' ? '#991b1b' : '#92400e' }}>
                          {f.ruleId}
                        </span>
                        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: '#fff', border: '1px solid #cbd5e1' }}>
                          {f.category}
                        </span>
                      </div>
                      <div style={{ color: '#1e293b', fontWeight: 500 }}>{f.message}</div>
                      <div style={{ color: '#64748b' }}>{f.explanation}</div>
                      <div style={{ color: '#0284c7', fontWeight: 500 }}>💡 {f.remediation}</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Run validation to inspect CDS structural integrity, associations, and SAP compatibility.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Entity */}
      {entityModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>Add Entity</div>
            <input
              type="text"
              placeholder="Entity Name (e.g. PurchaseOrder)"
              value={newEntity.name}
              onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
              style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
            <select
              value={newEntity.entityType}
              onChange={(e) => setNewEntity({ ...newEntity, entityType: e.target.value as any })}
              style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="ROOT">Root Transactional Entity</option>
              <option value="CHILD">Child Item Entity</option>
              <option value="REFERENCE">Reference Master Data Entity</option>
            </select>
            <input
              type="text"
              placeholder="Table Name (optional, defaults to Z<NAME>)"
              value={newEntity.tableName}
              onChange={(e) => setNewEntity({ ...newEntity, tableName: e.target.value })}
              style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setEntityModalOpen(false)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                Cancel
              </button>
              <button onClick={handleCreateEntity} style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600 }}>
                Create Entity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Field */}
      {fieldModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>Add Field to {selectedEntity?.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                placeholder="Field Name"
                value={newField.name || ''}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="Field Label"
                value={newField.label || ''}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                value={newField.type || 'abap.char'}
                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                {ABAP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={newField.semanticRole || 'GENERAL'}
                onChange={(e) => setNewField({ ...newField, semanticRole: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                {SEMANTIC_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="number"
                placeholder="Length"
                value={newField.length || ''}
                onChange={(e) => setNewField({ ...newField, length: parseInt(e.target.value, 10) || undefined })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="Currency / Unit Ref Field"
                value={newField.cukyField || newField.unitField || ''}
                onChange={(e) => setNewField({ ...newField, cukyField: e.target.value, unitField: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={Boolean(newField.isKey)}
                  onChange={(e) => setNewField({ ...newField, isKey: e.target.checked })}
                />
                Is Key
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={Boolean(newField.isMandatory)}
                  onChange={(e) => setNewField({ ...newField, isMandatory: e.target.checked })}
                />
                Mandatory
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setFieldModalOpen(false)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                Cancel
              </button>
              <button onClick={handleAddField} style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600 }}>
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Relationship */}
      {relModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>Establish Relationship</div>
            <input
              type="text"
              placeholder="Relationship Name (e.g. _Item, _Customer)"
              value={newRel.name}
              onChange={(e) => setNewRel({ ...newRel, name: e.target.value })}
              style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                value={newRel.relationshipType}
                onChange={(e) => setNewRel({ ...newRel, relationshipType: e.target.value as any })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="COMPOSITION">COMPOSITION (Parent-Child)</option>
                <option value="ASSOCIATION">ASSOCIATION (Reference)</option>
              </select>
              <select
                value={newRel.cardinality}
                onChange={(e) => setNewRel({ ...newRel, cardinality: e.target.value as any })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="[0..*]">[0..*] (Zero to Many)</option>
                <option value="[1..*]">[1..*] (One to Many)</option>
                <option value="[0..1]">[0..1] (Zero or One)</option>
                <option value="[1..1]">[1..1] (Exactly One)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                value={newRel.sourceEntityId}
                onChange={(e) => setNewRel({ ...newRel, sourceEntityId: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="">Source Entity</option>
                {(dataModel.entities || []).map((e) => (
                  <option key={e.entityId} value={e.entityId}>
                    {e.name}
                  </option>
                ))}
              </select>

              <select
                value={newRel.targetEntityId}
                onChange={(e) => setNewRel({ ...newRel, targetEntityId: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="">Target Entity</option>
                {(dataModel.entities || []).map((e) => (
                  <option key={e.entityId} value={e.entityId}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                placeholder="Source Field (e.g. PurchaseOrder)"
                value={newRel.sourceField}
                onChange={(e) => setNewRel({ ...newRel, sourceField: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <input
                type="text"
                placeholder="Target Field (e.g. PurchaseOrder)"
                value={newRel.targetField}
                onChange={(e) => setNewRel({ ...newRel, targetField: e.target.value })}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setRelModalOpen(false)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                Cancel
              </button>
              <button onClick={handleAddRelationship} style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600 }}>
                Establish Relationship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Browse SAP Standard CDS Registry */}
      {cdsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>Browse Standard Released SAP CDS Views</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search standard CDS views (Currency, Partner, Customer...)"
                value={cdsSearch}
                onChange={(e) => setCdsSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchCds()}
                style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <button onClick={handleSearchCds} style={{ padding: '8px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px' }}>
                Search
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cdsResults.map((v) => (
                <div
                  key={v.technicalName}
                  style={{
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#0284c7' }}>{v.technicalName}</span>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                        S21 Live Verification Pending
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{v.businessDescription}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      Documented Contract: {v.documentedReleaseContract || v.releaseContract} • Component: {v.softwareComponent} • Source: {v.provenance}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddCdsView(v)}
                    style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setCdsModalOpen(false)} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suggest Data Model from Discovery Evidence */}
      {suggestModalOpen && suggestedModel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#0284C7" />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                    Evidence-Grounded Data Model Suggestion
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Derived from transaction scope & Clean Core RAP standards for {project.sourceTransactionCode || 'Custom Project'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuggestModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Evidence Provenance Summary Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ padding: '12px', background: '#F1F5F9', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Root Entity</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{suggestedModel.rootEntity}</div>
                </div>
                <div style={{ padding: '12px', background: '#F1F5F9', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Entities Proposed</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{suggestedModel.entities?.length || 0}</div>
                </div>
                <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Verified / Proven</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#166534', marginTop: '4px' }}>
                    {suggestedModel.provenanceSummary?.verifiedCount || 0} fields
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 600 }}>Inferred / Recommended</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E40AF', marginTop: '4px' }}>
                    {suggestedModel.provenanceSummary?.inferredCount || 0} fields
                  </div>
                </div>
              </div>

              {/* Missing Evidence / Transparency Alert */}
              {Array.isArray(suggestedModel.missingEvidence) && suggestedModel.missingEvidence.length > 0 && (
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#92400E', fontSize: '13px' }}>
                    <AlertTriangle size={16} /> Missing Live Evidence & Governance Assumptions:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#78350F' }}>
                    {suggestedModel.missingEvidence.map((note: string, idx: number) => (
                      <li key={idx} style={{ marginTop: '2px' }}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proposed Entities & Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  Proposed Entities & Field Architecture:
                </div>
                {suggestedModel.entities?.map((ent: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#FAFAFA'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#0284C7', fontSize: '14px' }}>{ent.name}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: ent.entityType === 'ROOT' ? '#EFF6FF' : '#F1F5F9',
                            color: ent.entityType === 'ROOT' ? '#1D4ED8' : '#475569',
                            border: `1px solid ${ent.entityType === 'ROOT' ? '#BFDBFE' : '#CBD5E1'}`
                          }}
                        >
                          {ent.entityType}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>({ent.description})</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>{ent.fields?.length || 0} Fields</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {ent.fields?.map((fld: any, fIdx: number) => (
                        <div
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: fld.isKey ? '#B45309' : '#334155' }}>
                            {fld.isKey && '🔑 '}{fld.name}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
                            {fld.type}
                          </span>
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 4px',
                              borderRadius: '2px',
                              backgroundColor: fld.provenance === 'LIVE_SAP_S21' || fld.provenance === 'VERIFIED_LOCAL_METADATA' ? '#DCFCE7' : '#F1F5F9',
                              color: fld.provenance === 'LIVE_SAP_S21' || fld.provenance === 'VERIFIED_LOCAL_METADATA' ? '#166534' : '#475569'
                            }}
                          >
                            {fld.provenance === 'LIVE_SAP_S21' || fld.provenance === 'VERIFIED_LOCAL_METADATA' ? 'Verified' : 'Inferred'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: '#F8FAFC'
              }}
            >
              <button
                onClick={() => setSuggestModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplySuggestion}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#0284C7',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={16} /> Apply Suggested Data Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

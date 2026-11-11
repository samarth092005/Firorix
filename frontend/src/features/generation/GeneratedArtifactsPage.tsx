import React, { useState } from 'react';
import { localStore } from '../../services/mock/localStore';
import { GeneratedArtifact } from '../../types';
import { MessageStrip } from '../../components/status/MessageStrip';
import { FolderGit2, FileCode, Download, Check } from 'lucide-react';

export const GeneratedArtifactsPage: React.FC = () => {
  const blueprints = Object.values(localStore.getBlueprints());
  const allArtifacts: { project: string; artifact: GeneratedArtifact }[] = [];

  blueprints.forEach(b => {
    b.artifacts.forEach(a => {
      allArtifacts.push({ project: b.projectId, artifact: a });
    });
  });

  const [selected, setSelected] = useState(allArtifacts[0] || null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleDownloadSingle = (fileName: string) => {
    setDownloadMsg(`Simulated download: ${fileName}`);
    setTimeout(() => setDownloadMsg(null), 3000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="fiori-page-title">Generated Draft Artifacts Repository</h1>
          <p className="fiori-page-subtitle">
            Catalog of generated ABAP CDS View Entities, RAP Service Definitions, and SAPUI5 Fiori Elements manifest files.
          </p>
        </div>
      </div>

      <MessageStrip type="info">
        Artifacts are stored locally with SHA-256 integrity checksums. These files serve as reviewable blueprints for manual developer import via ADT or abapGit in an isolated S/4HANA sandbox.
      </MessageStrip>

      {downloadMsg && <MessageStrip type="success">{downloadMsg}</MessageStrip>}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
        {/* Left: Artifacts Tree */}
        <div className="fiori-card">
          <div className="fiori-card-header">
            <div className="fiori-card-title">
              <FolderGit2 size={16} color="var(--fiori-teal)" /> Project Files ({allArtifacts.length})
            </div>
          </div>
          <div style={{ padding: '6px' }}>
            {allArtifacts.map((item) => {
              const isSelected = selected?.artifact.id === item.artifact.id;
              return (
                <div
                  key={item.artifact.id}
                  onClick={() => setSelected(item)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--fiori-surface-selected)' : 'transparent',
                    border: isSelected ? '1px solid var(--fiori-teal)' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCode size={14} color="var(--fiori-teal)" />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.artifact.fileName}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)', paddingLeft: '20px' }}>
                    {item.artifact.filePath} &bull; {item.artifact.sizeBytes} B
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="fiori-card">
          {selected ? (
            <div>
              <div className="fiori-card-header">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{selected.artifact.filePath}</div>
                  <div style={{ fontSize: '11px', color: 'var(--fiori-text-secondary)', marginTop: '2px' }}>
                    Checksum: <code>{selected.artifact.checksum}</code> &bull; Project: {selected.project}
                  </div>
                </div>
                <button
                  type="button"
                  className="fiori-btn fiori-btn-secondary"
                  style={{ height: '28px', fontSize: '12px' }}
                  onClick={() => handleDownloadSingle(selected.artifact.fileName)}
                >
                  <Download size={12} /> Download File
                </button>
              </div>

              <div style={{ backgroundColor: '#0D1117', padding: '16px', overflowX: 'auto', minHeight: '380px' }}>
                <pre style={{ color: '#E6EDF3', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                  {selected.artifact.contentSnippet}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--fiori-text-secondary)' }}>
              Select an artifact from the list to preview content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

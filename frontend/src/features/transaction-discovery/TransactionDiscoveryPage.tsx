import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { UnifiedDiscoveryWorkspace } from './components/UnifiedDiscoveryWorkspace';
import { PageHeader, Breadcrumbs } from '../../components/common';
import { History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TransactionDiscoveryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTcode = searchParams.get('tcode') || '';
  const initialSystem = searchParams.get('systemId') || 'S21-200';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Transaction Discovery"
        subtitle="Instant SAP Data Dictionary (DDIC) inspection and official SAP Fiori Apps Reference Library matching."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Transaction Discovery' }]} />}
        actions={[
          {
            label: 'Assessment History',
            icon: History,
            variant: 'secondary',
            onClick: () => navigate('/assessment-history')
          }
        ]}
      />

      {/* Unified Enterprise Discovery Workspace */}
      <UnifiedDiscoveryWorkspace initialTcode={initialTcode} initialSystemId={initialSystem} />
    </div>
  );
};

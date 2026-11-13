import React from 'react';
import { AssessmentResultsPage } from '../assessment-results/AssessmentResultsPage';

/**
 * AssessmentWorkspacePage (Consolidated Canonical Bridge)
 * Bridges legacy /assessments/:id route to the authoritative canonical AssessmentResultsPage.
 * Eliminates 1,100+ lines of duplicate maintenance and component state divergence.
 */
export const AssessmentWorkspacePage: React.FC = () => {
  return <AssessmentResultsPage />;
};

export default AssessmentWorkspacePage;

import { officialCatalogueAdapter } from '../backend/src/adapters/officialFioriCatalogueAdapter.js';
import { FioriMatchingEngine } from '../backend/src/engine/fioriMatchingEngine.js';

async function testPR() {
  const query = "Purchase Requisition";
  const liveRes = await officialCatalogueAdapter.queryLibrary(`substringof('${query}',AppName)`, 10);
  console.log(`Live FAL returned ${liveRes.results?.length} apps for "${query}"`);
  
  const apps = liveRes.results.map(r => {
    return {
      appId: r.appId,
      appName: r.AppName,
      description: r.RoleCombinedToolTipDescription || r.AppName,
      uiTechnology: r.UITechnologyCombined || 'SAP Fiori elements',
      appType: r.ApplicationType || 'Transactional',
      productVersion: r.PVFrontend || 'SAP S/4HANA 2023',
      lineOfBusiness: r.LobCombined || 'Sourcing and Procurement',
      businessProcess: r.ScopeItemGroupCombined || 'Sourcing and Procurement',
      odataServices: (r.ODataServicesCombined || '').split(',').map(s => s.replace(/^\$|\$$/g, '')).filter(Boolean),
      provenance: 'OFFICIAL_CATALOGUE_LIVE'
    };
  });

  const matchingEngine = new FioriMatchingEngine(officialCatalogueAdapter);
  const matchResult = await matchingEngine.match({
    transaction: {
      tcode: 'ME51N',
      description: 'Create Purchase Requisition',
      transactionDescription: 'Create Purchase Requisition',
      classification: 'STANDARD',
      package: 'ME'
    },
    candidatePool: apps
  });

  console.log('Match Status:', matchResult.matchClassification);
  console.log('Candidates ranked:', matchResult.rankedCandidates?.length);
  matchResult.rankedCandidates?.slice(0, 3).forEach((c, i) => {
    console.log(`  ${i+1}. ${c.appId} - ${c.appName} (Score: ${c.overallScore}, Fit: ${c.functionalFitPercent}%)`);
  });
}
testPR();

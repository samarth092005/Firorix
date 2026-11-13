import { officialCatalogueAdapter } from '../backend/src/adapters/officialFioriCatalogueAdapter.js';

async function test() {
  const res = await officialCatalogueAdapter.queryLibrary("substringof('Purchase Requisition',AppName)", 5);
  console.log('Results count:', res.results?.length);
  res.results?.forEach(r => console.log('  App:', r.appId, r.AppName, 'UI:', r.UITechnologyCombined));
}
test();

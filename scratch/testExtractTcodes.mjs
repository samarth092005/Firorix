function extractTcodesFromFuzzy(rawApp) {
  const tcodes = new Set();
  if (rawApp.LeadingTransactionCodes) {
    rawApp.LeadingTransactionCodes.split(/[,;\s]+/).forEach(t => t.trim() && tcodes.add(t.trim().toUpperCase()));
  }
  if (rawApp.TransactionCodes) {
    rawApp.TransactionCodes.split(/[,;\s]+/).forEach(t => t.trim() && tcodes.add(t.trim().toUpperCase()));
  }
  if (rawApp.FitAnalysisTransactionCodes) {
    // format: "TCODE | Description | Comp, TCODE2 | ..."
    const parts = rawApp.FitAnalysisTransactionCodes.split(',');
    for (const part of parts) {
      const tc = part.split('|')[0]?.trim();
      if (tc && /^[A-Z0-9_\-\/]{2,20}$/i.test(tc)) {
        tcodes.add(tc.toUpperCase());
      }
    }
  }
  return [...tcodes];
}

async function test() {
  const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=substringof('ME51N',FitAnalysisTransactionCodes)&$top=3&$format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const raw = json.d.results[0];
  const tcs = extractTcodesFromFuzzy(raw);
  console.log('App:', raw.fioriId, raw.AppName);
  console.log('Extracted T-codes:', tcs);
}
test();

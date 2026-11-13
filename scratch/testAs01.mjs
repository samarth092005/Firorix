async function testText(query) {
  const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=substringof('${query}',AppName)&$top=5&$format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const results = json?.d?.results || [];
  console.log(`\n--- Query "${query}" in AppName (${results.length} found) ---`);
  for (const r of results) {
    console.log(`  ${r.fioriId} | ${r.AppName} | ${r.UITechnology} | Tcodes: ${r.FitAnalysisTransactionCodes}`);
  }
}

async function run() {
  await testText('Asset');
}
run();

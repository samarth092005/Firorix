async function testApp(appId) {
  const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=fioriId eq '${appId}'&$top=3&$format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const results = json?.d?.results || [];
  console.log(`\n--- App ${appId} (${results.length} found) ---`);
  for (const r of results) {
    console.log(`  ${r.fioriId} | ${r.AppName} | ${r.UITechnology} | Tcodes: ${r.FitAnalysisTransactionCodes}`);
  }
}

async function run() {
  await testApp('F1684');
  await testApp('F2229');
}
run();

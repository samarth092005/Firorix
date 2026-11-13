async function testTcode(tcode) {
  // Try substringof in FitAnalysisTransactionCodes
  const url1 = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=substringof('${tcode}',FitAnalysisTransactionCodes)&$top=5&$format=json`;
  const res1 = await fetch(url1);
  const json1 = await res1.json();
  const results1 = json1?.d?.results || [];
  console.log(`\n--- TCODE ${tcode} in FitAnalysisTransactionCodes (${results1.length} found) ---`);
  for (const r of results1) {
    console.log(`  ${r.fioriId} | ${r.AppName} | ${r.UITechnology} | Tcodes: ${r.FitAnalysisTransactionCodes}`);
  }

  if (results1.length === 0) {
    console.log(`No results in FitAnalysisTransactionCodes for ${tcode}`);
  }
}

async function run() {
  await testTcode('ME51N');
  await testTcode('ME21N');
  await testTcode('AS01');
  await testTcode('KO01');
  await testTcode('F110');
  await testTcode('MIGO');
}
run();

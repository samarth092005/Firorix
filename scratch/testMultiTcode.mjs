async function queryTcode(tcode) {
  const filter = `substringof('${tcode}',FitAnalysisTransactionCodes) or substringof('${tcode}',LeadingTransactionCodes) or substringof('${tcode}',TransactionCodes)`;
  const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=${encodeURIComponent(filter)}&$top=20&$format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const results = json?.d?.results || [];
  
  // Deduplicate by fioriId
  const unique = new Map();
  for (const r of results) {
    if (!unique.has(r.fioriId)) {
      unique.set(r.fioriId, r);
    }
  }

  console.log(`\n=== T-CODE: ${tcode} (unique apps: ${unique.size}) ===`);
  for (const app of unique.values()) {
    console.log(`  [${app.fioriId}] ${app.AppName} (${app.UITechnology || app.AppType})`);
  }
}

async function run() {
  await queryTcode('ME51N');
  await queryTcode('AS01');
  await queryTcode('KO01');
  await queryTcode('F110');
  await queryTcode('MIGO');
  await queryTcode('VA01');
  await queryTcode('ME21N');
}
run();

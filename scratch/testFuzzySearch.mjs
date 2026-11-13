async function testFuzzy(term) {
  const u = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=substringof('${term}',AppName)%20or%20substringof('${term}',Description)&$top=5&$format=json`;
  try {
    const res = await fetch(u, { headers: { Accept: "application/json" } });
    const data = await res.json();
    console.log(`\n=== FuzzySearch for '${term}' ===`);
    console.log(`Results: ${data.d?.results?.length || 0}`);
    data.d?.results?.forEach(r => console.log('  ', r.fioriId, r.AppName));
  } catch (err) {
    console.error(err.message);
  }
}

async function run() {
  await testFuzzy('Purchase Order');
  await testFuzzy('Purchase Requisition');
  await testFuzzy('Asset');
  await testFuzzy('Payment');
}
run();

async function testAs01Fields() {
  const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=substringof('AS01',LeadingTransactionCodes) or substringof('AS01',TransactionCodes)&$top=5&$format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const results = json?.d?.results || [];
  console.log(`Results for AS01 in Leading/TransactionCodes: ${results.length}`);
  for (const r of results) {
    console.log(`  ${r.fioriId} | ${r.AppName} | ${r.LeadingTransactionCodes} | ${r.TransactionCodes}`);
  }
}
testAs01Fields();

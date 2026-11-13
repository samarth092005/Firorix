const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=fioriId eq 'F2229'&$top=1&$format=json`;
const res = await fetch(url);
const json = await res.json();
const obj = json.d.results[0];
console.log('F2229 FuzzySearch fields:');
for (const [k, v] of Object.entries(obj)) {
  if (v !== null && v !== '') {
    console.log(`  ${k}: ${String(v).slice(0, 80)}`);
  }
}

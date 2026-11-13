const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/PredecessorSuccessor?$filter=predecessor eq 'F0842' or successor eq 'F0842A'&$top=5&$format=json`;
const res = await fetch(url);
const json = await res.json();
console.log('PredecessorSuccessor results:', json?.d?.results?.length);
for (const r of json?.d?.results || []) {
  console.log(`  ${r.predecessor} (${r.predecessorName}) -> ${r.successor} (${r.successorName})`);
}

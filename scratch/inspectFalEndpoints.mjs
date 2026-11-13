// Check PredecessorSuccessor and FuzzySearch
async function check() {
  const url1 = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/PredecessorSuccessor?$top=5&$format=json";
  try {
    const res = await fetch(url1);
    const json = await res.json();
    console.log('PredecessorSuccessor sample:', JSON.stringify(json.d.results.slice(0, 2), null, 2));
  } catch(e) { console.error('PredecessorSuccessor error:', e.message); }

  const url2 = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$top=5&$format=json";
  try {
    const res = await fetch(url2);
    const json = await res.json();
    console.log('FuzzySearch sample:', JSON.stringify(json.d.results.slice(0, 2), null, 2));
  } catch(e) { console.error('FuzzySearch error:', e.message); }
}
check();

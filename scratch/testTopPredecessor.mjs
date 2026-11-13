async function test() {
  const u = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/PredecessorSuccessor?$top=5&$format=json`;
  const res = await fetch(u, { headers: { Accept: "application/json" } });
  const data = await res.json();
  console.log(data.d?.results);
}
test();

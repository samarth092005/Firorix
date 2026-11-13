async function testPredecessor(tcode) {
  const u = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/PredecessorSuccessor?$filter=predecessor%20eq%20'${tcode}'&$top=5&$format=json`;
  try {
    const res = await fetch(u, { headers: { Accept: "application/json" } });
    const data = await res.json();
    const items = data.d?.results || [];
    console.log(`\n=== PredecessorSuccessor for ${tcode} ===`);
    console.log(`Found: ${items.length}`);
    items.forEach(it => {
      console.log(`  Predecessor: ${it.predecessor} (${it.predecessorName}) -> Successor: ${it.successor} (${it.successorName})`);
    });
  } catch (err) {
    console.error(`Error for ${tcode}:`, err.message);
  }
}

async function run() {
  for (const tc of ['ME51N', 'AS01', 'KO01', 'F110', 'VA01', 'MIGO', 'ME21N', 'FB50', 'F-53', 'SO10']) {
    await testPredecessor(tc);
  }
}
run();

async function testFuzzy(tcode) {
  // Let's test FuzzySearch with tcode
  const u = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=substringof('${tcode}',CombinedTitle)%20or%20substringof('${tcode}',AppLauncherTitle)%20or%20substringof('${tcode}',AppName)&$top=5&$format=json`;
  const res = await fetch(u, { headers: { Accept: "application/json" } });
  const data = await res.json();
  console.log(`Results for ${tcode}:`, data.d?.results?.length);
  data.d?.results?.forEach(r => console.log(' ', r.fioriId, r.AppName, r.UITechnology));
}
testFuzzy('ME51N');
testFuzzy('VA01');
testFuzzy('AS01');

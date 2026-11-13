const res = await fetch("https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/$metadata");
const xml = await res.text();
console.log('Metadata length:', xml.length);
// print EntitySet names
const matches = xml.matchAll(/<EntitySet Name="([^"]+)"/g);
for (const m of matches) {
  console.log('EntitySet:', m[1]);
}

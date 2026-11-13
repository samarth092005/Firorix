const u = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/$metadata";
fetch(u)
  .then(r => r.text())
  .then(xml => {
    function printType(name) {
      const re = new RegExp('<EntityType Name="' + name + '"([\\s\\S]*?)<\\/EntityType>', 'i');
      const m = xml.match(re);
      if (m) console.log(`Type ${name}:\n`, m[1].replace(/<Property /g, '\n  Property: '));
    }
    printType('PredecessorDetailsType');
    printType('PredecessorSuccessorType');
    printType('FuzzySearchType');
  })
  .catch(err => console.error(err));

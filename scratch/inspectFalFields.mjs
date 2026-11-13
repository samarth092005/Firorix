const u = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/InputFilterParam(InpFilterValue='1NA')/Results?$filter=appId%20eq%20'F1048'&$top=1&$format=json";
fetch(u, { headers: { Accept: "application/json" } })
  .then(r => r.json())
  .then(d => {
    const app = d.d?.results?.[0];
    if (app) {
      console.log('All keys in SingleApp entity:');
      console.log(Object.keys(app));
    }
  })
  .catch(err => console.error(err));

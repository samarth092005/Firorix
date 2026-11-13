const u = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/InputFilterParam(InpFilterValue='1NA')/Results?$filter=appId%20eq%20'F7319'&$top=1&$format=json";
fetch(u, { headers: { Accept: "application/json" } })
  .then(r => r.json())
  .then(d => {
    console.log(JSON.stringify(d.d?.results?.[0], null, 2));
  })
  .catch(err => console.error("Error:", err.message));

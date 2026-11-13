const u = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/InputFilterParam(InpFilterValue='1NA')/Results?$filter=appId%20eq%20'F2229'&$top=1&$format=json";
fetch(u, { headers: { Accept: "application/json" } })
  .then(r => r.json())
  .then(d => {
    const app = d.d?.results?.[0];
    if (app) {
      console.log('AppId:', app.appId);
      console.log('AppName:', app.AppName);
      console.log('Intents:', app.IntentsCombined);
      console.log('Description:', app.AppDescription || app.RoleCombinedToolTipDescription);
      console.log('ApplicationComponent:', app.ApplicationComponent);
    }
  })
  .catch(err => console.error(err));

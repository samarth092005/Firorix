import { execSync } from 'child_process';

const url = "https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/InputFilterParam(InpFilterValue='1NA')/Results?$top=1&$format=json";
const res = await fetch(url);
const json = await res.json();
const obj = json.d.results[0];
console.log('Fields:', Object.keys(obj).sort().join(', '));

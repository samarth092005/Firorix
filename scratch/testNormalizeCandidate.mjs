import { normalizeCatalogueApp } from '../backend/src/adapters/officialFioriCatalogueAdapter.js';

// We'll test with a raw record from FuzzySearch
const url = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/FuzzySearch?$filter=fioriId eq 'F2229'&$top=1&$format=json`;
const res = await fetch(url);
const json = await res.json();
const raw = json.d.results[0];

console.log('Raw fioriId:', raw.fioriId);
console.log('Raw LeadingTransactionCodes:', raw.LeadingTransactionCodes);
console.log('Raw TransactionCodes:', raw.TransactionCodes);

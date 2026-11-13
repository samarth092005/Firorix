import { btpDestinationAdapter } from './backend/src/adapters/btpDestinationAdapter.js';

async function test() {
  const response = await btpDestinationAdapter.executeRequest({
    path: `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=SO10&maxResults=10`,
    method: 'GET',
    headers: {
      Accept: 'application/xml, text/xml, */*'
    }
  });
  console.log('Success:', response.success, 'Status:', response.httpStatus);
  console.log('Raw Data:\n', response.data);
}
test();

const midtransClient = require('midtrans-client');

console.log('===== MIDTRANS CONFIG =====');
console.log('IS PRODUCTION:', process.env.MIDTRANS_IS_PRODUCTION);
console.log(
  'SERVER KEY ADA:',
  !!process.env.MIDTRANS_SERVER_KEY
);
console.log(
  'CLIENT KEY ADA:',
  !!process.env.MIDTRANS_CLIENT_KEY
);
console.log('==========================');

const snap = new midtransClient.Snap({
  isProduction:
    process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey:
    process.env.MIDTRANS_SERVER_KEY,
  clientKey:
    process.env.MIDTRANS_CLIENT_KEY,
});

module.exports = snap;
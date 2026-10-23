require('module-alias/register');
const { readJSONFileSync } = require('function/utils');

function getPaymentHeaders(config) {
  const paymentApiToken = config.PAYMENT_API_TOKEN || config.TOKEN_PAYMENT;
  if (!paymentApiToken) {
    throw new Error('PAYMENT_API_TOKEN atau TOKEN_PAYMENT belum dikonfigurasi');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${paymentApiToken}`,
  };
}

async function createQrisTransaction(orderId, amount) {
  const got = (await import('got')).default;
  const config = readJSONFileSync('config.json');
  const url = `${config.PAYMENT_API_URL}/payment/charge-api`;

  try {
    const response = await got.post(url, {
      headers: getPaymentHeaders(config),
      json: {
        amount: Number(amount),
        method: 'qris',
        type: 2,
        details: { orderId },
        webhookUrl: config.PAYMENT_WEBHOOK_URL || 'http://92.119.167.95:2045/payment-webhook',
      },
      responseType: 'json',
    });

    return response.body;
  } catch (error) {
    if (error.response) {
      console.error('Payment API Error:', error.response.body);
    } else {
      console.error('Payment Request Error:', error.message);
    }

    throw error;
  }
}

async function cancelQrisTransaction(orderId) {
  const got = (await import('got')).default;
  const config = readJSONFileSync('config.json');

  const url = `${config.PAYMENT_API_URL}/payment/charge-cancel/${encodeURIComponent(orderId)}`;

  try {
    const response = await got.post(url, {
      headers: getPaymentHeaders(config),
      json: {},
      responseType: 'json',
    });

    return response.body;
  } catch (error) {
    if (error.response) {
      console.error('Payment Cancel API Error:', error.response.body);
    } else {
      console.error('Payment Cancel Request Error:', error.message);
    }

    throw error;
  }
}

module.exports = {
  createQrisTransaction,
  cancelQrisTransaction,
};

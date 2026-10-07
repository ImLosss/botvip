require('module-alias/register');
const { readJSONFileSync } = require('function/utils');

async function createQrisTransactionPakasir(project, orderId, amount) {
    const got = (await import('got')).default;
    let config = readJSONFileSync('config.json');

    const targetProject = project || config.PAKASIR_PROJECT;
    const url = `https://app.pakasir.com/api/v2/create-transaction/${encodeURIComponent(targetProject)}/${encodeURIComponent(orderId)}`;

    try {
        const response = await got.post(url, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': config.PAKASIR_API
            },
            json: {
                method: 'qris',
                amount: amount
            },
            responseType: 'json',
        });

        return response.body;
    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.body);
        } else {
            console.error('Request Error:', error.message);
        }
        throw error;
    }
}

async function cancelTransactionPakasir(txnId, project) {
    const got = (await import('got')).default;
    let config = readJSONFileSync('config.json');

    const targetProject = project || config.PAKASIR_PROJECT;
    const url = `https://app.pakasir.com/api/v2/cancel-transaction/${encodeURIComponent(targetProject)}/${encodeURIComponent(txnId)}`;

    try {
        const response = await got.post(url, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': config.PAKASIR_API
            },
            responseType: 'json'
        });

        return response.body;
    } catch (error) {
        if (error.response) {
            console.error('API Cancel Error:', error.response.body);
        } else {
            console.error('Request Cancel Error:', error.message);
        }
        throw error;
    }
}

async function getTransactionDetailPakasir(txnId, project) {
    const got = (await import('got')).default;
    let config = readJSONFileSync('config.json');

    const targetProject = project || config.PAKASIR_PROJECT;
    const url = `https://app.pakasir.com/api/v2/transaction-status/${encodeURIComponent(targetProject)}/${encodeURIComponent(txnId)}`;

    try {
        const response = await got.get(url, {
            headers: {
                'X-Api-Key': config.PAKASIR_API
            },
            responseType: 'json'
        });

        return response.body;
    } catch (error) {
        if (error.response) {
            console.error('API Detail Error:', error.response.body);
        } else {
            console.error('Request Detail Error:', error.message);
        }
        throw error;
    }
}

module.exports = {
    createQrisTransactionPakasir, cancelTransactionPakasir, getTransactionDetailPakasir
}
require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');

async function createQrisTransactionPakasir(project, orderId, amount) {
    const got = (await import('got')).default;

    let config = readJSONFileSync('config.json');

    const url = 'https://app.pakasir.com/api/transactioncreate/qris';

    try {
        const response = await got.post(url, {
            // Properti 'json' otomatis mengatur header 'Content-Type: application/json'
            json: {
                project: project,
                order_id: orderId,
                amount: amount,
                api_key: config.PAKASIR_API
            },
            responseType: 'json',
        });

        return response.body;

    } catch (error) {
        // Penanganan error jika request gagal (misal: API membalas dengan status 400 atau 500)
        if (error.response) {
            console.error('API Error:', error.response.body);
        } else {
            console.error('Request Error:', error.message);
        }
        throw error;
    }
}

async function cancelTransactionPakasir(orderId, amount) {
    const got = (await import('got')).default;

    let config = readJSONFileSync('config.json');
    
    const url = 'https://app.pakasir.com/api/transactioncancel';

    try {
        const response = await got.post(url, {
            // Data payload dikirim lewat properti 'json'
            json: {
                project: config.PAKASIR_PROJECT,
                order_id: orderId,
                amount: amount,
                api_key: config.PAKASIR_API
            },
            responseType: 'json' // Otomatis parse response body ke object JSON
        });

        return response.body;

    } catch (error) {
        // Penanganan error jika API menolak request atau server down
        if (error.response) {
            console.error('API Cancel Error:', error.response.body);
        } else {
            console.error('Request Cancel Error:', error.message);
        }
        throw error;
    }
}

async function getTransactionDetailPakasir(orderId, amount) {
    const got = (await import('got')).default;

    let config = readJSONFileSync('config.json');
    
    const url = 'https://app.pakasir.com/api/transactiondetail';

    try {
        const response = await got.get(url, {
            // searchParams otomatis mengubah object menjadi '?project=depodomain&amount=22000...'
            searchParams: {
                project: config.PAKASIR_PROJECT,
                amount: amount,
                order_id: orderId,
                api_key: config.PAKASIR_API
            },
            responseType: 'json' // Otomatis parse response body ke object JSON
        });
        
        return response.body;

    } catch (error) {
        // Penanganan error jika transaksi tidak ditemukan atau API bermasalah
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
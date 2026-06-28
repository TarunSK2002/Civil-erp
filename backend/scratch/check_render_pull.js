const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('Querying Render server pull endpoint directly...');
        const data = await get('https://civil-erp.onrender.com/api/sync/pull');
        console.log('Keys in returned data:', Object.keys(data));
        if (data.clients) {
            console.log('CLIENTS FROM RENDER SERVER:', JSON.stringify(data.clients, null, 2));
        } else {
            console.log('No clients table returned from Render.');
        }
    } catch(e) {
        console.error('Fetch failed:', e.message);
    }
}

run();

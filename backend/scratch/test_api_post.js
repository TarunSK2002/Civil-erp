const http = require('http');

const data = JSON.stringify({
    PayeeId: 1,
    SiteId: 1,
    AttendanceDate: '2026-05-19',
    PersonType: 'Mason',
    ShiftType: '1 Shift (1.0x)',
    ShiftMultiplier: 1.0,
    LabourCount: 2
});

const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/attendance-sheets/2/records',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log(`BODY: ${body}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

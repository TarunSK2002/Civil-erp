const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sync-status',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code from running server:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Response body:', data);
  });
});

req.on('error', (err) => {
  console.error('Error connecting to the running server:', err.message);
});

req.end();

const http = require('http');

http.get('http://localhost:5000/api/weekly-pay-sheets', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const sheets = JSON.parse(data);
    if (!sheets.length) return console.log('No sheets');
    const id = sheets[0].id;
    http.get('http://localhost:5000/api/weekly-pay-sheets/' + id, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const sheet = JSON.parse(data2);
        console.log(JSON.stringify(sheet.sites, null, 2));
      });
    });
  });
});

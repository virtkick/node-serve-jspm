let serveJspm = require('../').default;

let http = require('http');

http.createServer((req, res) => {
  res.status = (status) => 0;
  
  serveJspm('./')(req, res, () => {
    console.error('Not found, not working');
    process.exit(1);
  })
  
}).listen(12349);

let request = require('request');

request('http://localhost:12349/test.jsx', (err, data) => {
  if(err) {
    console.error(err);
    return process.exit(1);
  }
  
  if(data.body.match(/^System.register/)) {
    console.log('OK');
    process.exit(0);
  }
});

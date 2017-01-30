const serveJspm = require('./').default;
const http = require('http');

const server = http.createServer((req, res) => {
  res.status = (status) => (res.statusCode = status);
  
  serveJspm('./')(req, res, () => {
    console.error('Not found, not working');
    process.exit(1);
  })
  
}).listen(12349);

let request = require('request');

server.once('listening', () => {
  request(`http://localhost:12349/${process.argv[2]}`, (err, data) => {
    if(err) {
      console.error(err);
      return process.exit(1);
    }
    if(data.statusCode !== 200) {
      console.error(data.statusCode, data.body);
      return process.exit(1);
    }
    console.log(data.body);
    process.exit(0);
  });
});

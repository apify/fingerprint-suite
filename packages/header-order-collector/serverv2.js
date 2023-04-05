const http2 = require('node:http2');
const fs = require('fs');

const port = 3002;

const server = http2.createSecureServer({
    key: fs.readFileSync(`${__dirname}/cert/localhost-privkey.pem`),
    cert: fs.readFileSync(`${__dirname}/cert/localhost-cert.pem`),
  });
server.on('error', (err) => console.error(err));

server.on('stream', (stream, headers) => {
  if(headers[':path'] === '/headers'){
    stream.respond({
        'content-type': 'application/json; charset=utf-8',
        ':status': 200,
    });
    stream.end(JSON.stringify(Object.keys(headers)));
    return;
  };

  stream.respond({
    'content-type': 'text/html; charset=utf-8',
    'set-cookie': 'A=1; Path=/headers; Secure; HttpOnly',
    ':status': 200,
  });
  stream.end(`
  <a href="/headers">Click here</a> to see the headers.
  `);
});

module.exports = {
    runServer: (p) => server.listen(p ?? port),
}

if (require.main === module) {
  server.listen(port);
}
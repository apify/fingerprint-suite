const express = require('express');

const app = express();
const port = 3001;

function extractHeaderNames(rawHeaders) {
    return rawHeaders.filter((_, i) => i % 2 === 0);
}

app.get('/', (req, res) => {
    res.header('set-cookie', 'A=1; Path=/headers; HttpOnly');
    res.send(`
    <form action="/headers" method="POST">
        <input type="text" name="foo" value="bar" />
        <input type="submit" value="Submit" />
    </form>
`);
});

app.all('/headers', (req, res) => {
    const { rawHeaders } = req;
    const headerNames = extractHeaderNames(rawHeaders);
    res.json(headerNames);
});

function runServer(p) {
    return new Promise((r) => {
        const inst = app.listen(p ?? port, (err) => {
            if (err) {
                throw new Error(err);
            }

            r(inst);
        });
    });
}

module.exports = {
    runServer,
    app,
};

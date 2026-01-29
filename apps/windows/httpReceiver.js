// Simple HTTP server to receive POSTs with coords and write to coords.json
const http = require('http');
const fs = require('fs');
const path = require('path');

const COORDS_PATH = path.join(__dirname, 'coords.json');

function startHttpReceiver(mainWindow, port = 3000) {
    const server = http.createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/coords') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    fs.writeFileSync(COORDS_PATH, JSON.stringify(json, null, 2));
                    mainWindow.webContents.send('addon-coords', json);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('{"ok":true}');
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end('{"error":"Invalid JSON"}');
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });
    server.listen(port, () => {
        console.log(`[HTTPReceiver] Listening for POST /coords on port ${port}`);
    });
}

module.exports = { startHttpReceiver, COORDS_PATH };

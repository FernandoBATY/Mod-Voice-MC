// TCP server to serve latest coords.json to any client
const net = require('net');
const fs = require('fs');
const path = require('path');

const COORDS_PATH = path.join(__dirname, 'coords.json');

function startCoordsTcpServer(port = 25565) {
    const server = net.createServer(socket => {
        fs.readFile(COORDS_PATH, (err, data) => {
            if (err) {
                socket.write('{"error":"coords.json not found"}\n');
            } else {
                socket.write(data.toString() + '\n');
            }
            socket.end();
        });
    });
    server.listen(port, () => {
        console.log(`[CoordsTCP] Serving coords.json on TCP port ${port}`);
    });
}

module.exports = { startCoordsTcpServer };

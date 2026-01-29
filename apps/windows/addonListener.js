// TCP server to receive JSON from the addon and forward to renderer
const net = require('net');
const { ipcMain } = require('electron');

let lastReceivedCoords = null;

function startAddonListener(mainWindow, port = 25565) {
    const server = net.createServer(socket => {
        let buffer = '';
        socket.on('data', data => {
            buffer += data.toString();
            let boundary;
            while ((boundary = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 1);
                try {
                    const json = JSON.parse(line);
                    lastReceivedCoords = json;
                    // Send to renderer
                    mainWindow.webContents.send('addon-coords', json);
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });
    });
    server.listen(port, () => {
        console.log(`[AddonListener] Listening for addon on port ${port}`);
    });
}

module.exports = { startAddonListener, getLastReceivedCoords: () => lastReceivedCoords };

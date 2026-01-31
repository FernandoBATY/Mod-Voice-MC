// Script Node.js para exponer las coordenadas de todos los jugadores conectados en Bedrock Dedicated Server
// Requiere: npm install bedrock-protocol express

const bedrock = require('bedrock-protocol');
const express = require('express');
const fs = require('fs');
const path = require('path');

const config = require('../config/server.json');
const app = express();
const DATA_PATH = path.join(__dirname, '../data/players.json');

let players = {};

// Iniciar API HTTP para exponer coordenadas
app.get('/players', (req, res) => {
  res.json(Object.values(players));
});

app.listen(config.exposeApiPort, () => {
  console.log(`[API] Exponiendo coordenadas en http://localhost:${config.exposeApiPort}/players`);
});

// Conectar al servidor Bedrock como bot para leer posiciones
const client = bedrock.createClient({
  host: 'localhost',
  port: config.serverPort,
  username: 'ProximityBot',
  offline: true
});

client.on('spawn', () => {
  console.log('[Bot] Conectado al servidor Bedrock');
});

client.on('player_list', (packet) => {
  // Actualizar lista de jugadores
  packet.records.forEach(record => {
    if (!players[record.uuid]) {
      players[record.uuid] = {
        uuid: record.uuid,
        name: record.username,
        position: { x: 0, y: 0, z: 0 },
        lastUpdate: Date.now()
      };
    }
  });
});

client.on('move_player', (packet) => {
  // Actualizar posición del jugador
  if (players[packet.runtimeEntityId]) {
    players[packet.runtimeEntityId].position = {
      x: packet.position.x,
      y: packet.position.y,
      z: packet.position.z
    };
    players[packet.runtimeEntityId].lastUpdate = Date.now();
  }
});

// Guardar datos periódicamente
setInterval(() => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(Object.values(players), null, 2));
}, 1000);

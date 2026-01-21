// ============================================
// SPATIAL HASH GRID
// Optimización para búsqueda rápida de jugadores cercanos
// ============================================

class SpatialHashGrid {
    constructor(gridSize = 50) {
        this.gridSize = gridSize; // Tamaño de cada celda
        this.cells = new Map(); // Map<cellKey, Set<PlayerSession>>
        this.playerCells = new Map(); // Map<uuid, cellKey> para tracking
    }

    // Convertir posición a clave de celda
    _getCellKey(x, z, dimension) {
        const cellX = Math.floor(x / this.gridSize);
        const cellZ = Math.floor(z / this.gridSize);
        return `${dimension}:${cellX},${cellZ}`;
    }

    // Agregar jugador a la grid
    addPlayer(player) {
        if (!player.position) return;
        
        const cellKey = this._getCellKey(
            player.position.x,
            player.position.z,
            player.dimension
        );

        // Remover de celda anterior si existe
        this.removePlayer(player.uuid);

        // Agregar a nueva celda
        if (!this.cells.has(cellKey)) {
            this.cells.set(cellKey, new Set());
        }
        
        this.cells.get(cellKey).add(player);
        this.playerCells.set(player.uuid, cellKey);
    }

    // Remover jugador de la grid
    removePlayer(uuid) {
        const oldCellKey = this.playerCells.get(uuid);
        if (oldCellKey) {
            const cell = this.cells.get(oldCellKey);
            if (cell) {
                cell.forEach(player => {
                    if (player.uuid === uuid) {
                        cell.delete(player);
                    }
                });
                
                // Limpiar celda vacía
                if (cell.size === 0) {
                    this.cells.delete(oldCellKey);
                }
            }
            this.playerCells.delete(uuid);
        }
    }

    // Actualizar posición de jugador
    updatePlayer(player) {
        const currentCellKey = this.playerCells.get(player.uuid);
        const newCellKey = this._getCellKey(
            player.position.x,
            player.position.z,
            player.dimension
        );

        // Solo actualizar si cambió de celda
        if (currentCellKey !== newCellKey) {
            this.addPlayer(player);
        }
    }

    // Obtener jugadores en un rango (optimizado)
    getNearbyPlayers(player, range) {
        if (!player.position) return [];

        const nearby = [];
        const rangeInCells = Math.ceil(range / this.gridSize);

        const centerCellX = Math.floor(player.position.x / this.gridSize);
        const centerCellZ = Math.floor(player.position.z / this.gridSize);

        // Buscar en celdas adyacentes
        for (let dx = -rangeInCells; dx <= rangeInCells; dx++) {
            for (let dz = -rangeInCells; dz <= rangeInCells; dz++) {
                const cellKey = `${player.dimension}:${centerCellX + dx},${centerCellZ + dz}`;
                const cell = this.cells.get(cellKey);

                if (cell) {
                    cell.forEach(otherPlayer => {
                        if (otherPlayer.uuid === player.uuid) return;
                        
                        const distance = player.getDistanceTo(otherPlayer);
                        if (distance <= range) {
                            nearby.push({
                                player: otherPlayer,
                                distance: distance
                            });
                        }
                    });
                }
            }
        }

        return nearby;
    }

    // Obtener jugadores que pueden escuchar a un speaker (optimizado)
    getListeners(speaker, range) {
        const nearby = this.getNearbyPlayers(speaker, range);
        const listeners = [];

        nearby.forEach(({ player: listener, distance }) => {
            if (!listener.canHear(speaker)) return;
            
            const volume = listener.calculateVolumeFor(speaker);
            if (volume === null) return;

            listeners.push({
                uuid: listener.uuid,
                name: listener.name,
                volume: volume,
                distance: distance,
                player: listener
            });
        });

        return listeners;
    }

    // Estadísticas de la grid
    getStats() {
        return {
            totalCells: this.cells.size,
            totalPlayers: this.playerCells.size,
            averagePlayersPerCell: this.cells.size > 0 
                ? this.playerCells.size / this.cells.size 
                : 0,
            gridSize: this.gridSize
        };
    }

    // Limpiar grid completa
    clear() {
        this.cells.clear();
        this.playerCells.clear();
    }
}

module.exports = SpatialHashGrid;

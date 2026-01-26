# 📦 Instalación del Addon de Chat de Voz de Proximidad

## 📋 Requisitos Previos

- **Minecraft Bedrock Edition** (versión 1.21.0 o superior)
- Modo **Experimental** habilitado en el mundo
- Servidor WebSocket ejecutándose

## 🔧 Instalación

### Método 1: Doble Clic (Recomendado)

1. Localiza el archivo `proximity_voice_addon_v1.0.0.mcaddon`
2. Haz **doble clic** en el archivo
3. Minecraft se abrirá automáticamente e importará el addon
4. Verás un mensaje de confirmación

### Método 2: Importación Manual

1. Abre **Minecraft Bedrock Edition**
2. Ve a **Configuración** → **Almacenamiento** → **Importar**
3. Navega hasta el archivo `proximity_voice_addon_v1.0.0.mcaddon`
4. Selecciona el archivo para importarlo

## 🌍 Activación en el Mundo

### Para Mundos Nuevos:

1. **Crear Mundo** → **Configuración del Mundo**
2. Ve a la sección **Complementos**
3. En **Paquetes de Comportamiento**, activa "**Chat de Voz de Proximidad**"
4. En **Paquetes de Recursos**, activa "**UI de Chat de Voz**"
5. Ve a **Experimentos**
6. Activa las siguientes opciones experimentales:
   - ✅ **Beta APIs**
   - ✅ **Molang Features**
7. Haz clic en **Crear**

### Para Mundos Existentes:

1. Selecciona el mundo → **Editar**
2. Ve a **Complementos**
3. En **Paquetes de Comportamiento**, activa "**Chat de Voz de Proximidad**"
4. En **Paquetes de Recursos**, activa "**UI de Chat de Voz**"
5. Ve a **Experimentos** y activa:
   - ✅ **Beta APIs**
   - ✅ **Molang Features**
6. Guarda los cambios

⚠️ **Advertencia**: Al activar experimentos en un mundo existente, se creará una copia de seguridad automática.

## 🎮 Uso en el Juego

### Vinculación con la App Móvil

1. Inicia el mundo con el addon activado
2. En el chat, verás aparecer tu **código de vinculación** (4 dígitos)
3. Abre la **app móvil de Android**
4. Ingresa:
   - Tu **nombre de jugador** (exacto como en Minecraft)
   - El **código de vinculación** mostrado en el juego
   - La **URL del servidor** (ej: `ws://192.168.1.100:8080`)
5. Toca **Conectar**

### Comandos Disponibles

```
/function voice_detect    # Detectar jugadores con voz activa
/function voice_update    # Actualizar estado del sistema
/function init            # Inicializar el sistema
```

### Indicadores HUD

En pantalla verás:
- 🎤 **Estado del micrófono** (activo/silenciado)
- 🔗 **Código de vinculación** (primeros 2 minutos)
- 👥 **Jugadores cercanos** hablando
- 📊 **Nivel del micrófono** en tiempo real

## ⚙️ Configuración

### Archivo de Configuración

Puedes editar la configuración en:
```
behavior_pack/config/config.json
```

### Opciones Disponibles:

```json
{
  "proximityVoice": {
    "enabled": true,
    "serverUrl": "ws://localhost:8080",
    "proximityRange": 30,              // Rango de escucha (bloques)
    "maxVolume": 1.0,                   // Volumen máximo
    "minVolume": 0.1,                   // Volumen mínimo
    "volumeFalloff": 1.5,               // Caída de volumen con distancia
    "teamChat": {
      "enabled": true,                  // Chat de equipo
      "useDifferentRange": false,
      "teamRange": 50
    },
    "globalChat": {
      "enabled": false                  // Chat global (todos se escuchan)
    },
    "updateInterval": 100,              // Intervalo de actualización (ms)
    "debugMode": false                  // Modo debug
  }
}
```

### Equipos (Team Chat)

Para crear equipos, usa tags:
```
/tag @p add team:red
/tag @p add team:blue
```

Los jugadores del mismo equipo se escucharán sin importar la distancia (si está habilitado).

## 🔊 Características del Sistema

### ✨ Características Principales

- 🎯 **Chat de Voz por Proximidad**: Escucha solo a jugadores cercanos (configurable)
- 📏 **Volumen Espacial 3D**: El volumen disminuye con la distancia
- 👥 **Soporte de Equipos**: Los equipos pueden comunicarse sin límite de distancia
- 🌍 **Multi-Dimensión**: Funciona en Overworld, Nether y The End
- 🔇 **Control de Silencio**: Silencia tu micrófono cuando lo necesites
- 📱 **App Móvil**: Control desde tu dispositivo Android
- 🔗 **Sistema de Vinculación Seguro**: Códigos temporales de 4 dígitos

### 🎨 Interfaz Visual

- HUD personalizado con información en tiempo real
- Indicadores visuales de jugadores hablando
- Código de vinculación visible durante 2 minutos
- Estado de conexión y micrófono

## 🐛 Solución de Problemas

### El addon no aparece en Minecraft

1. Verifica que el archivo tenga extensión `.mcaddon`
2. Asegúrate de que Minecraft esté actualizado (v1.21.0+)
3. Intenta reiniciar Minecraft

### El código de vinculación no aparece

1. Verifica que los **Experimentos** estén activados
2. Asegúrate de que el **Paquete de Comportamiento** esté activo
3. Prueba reiniciar el mundo

### No puedo escuchar a otros jugadores

1. Verifica que el **servidor WebSocket** esté ejecutándose
2. Confirma que la **URL del servidor** sea correcta en la app móvil
3. Asegúrate de estar dentro del **rango de proximidad** (30 bloques por defecto)
4. Verifica que el otro jugador esté **hablando** (micrófono activo)

### Error de "Beta APIs"

1. Ve a **Configuración del Mundo** → **Experimentos**
2. Activa **Beta APIs**
3. Acepta la advertencia y reinicia el mundo

## 📞 Servidor WebSocket

El addon requiere un servidor WebSocket ejecutándose. Para iniciarlo:

```bash
cd server
node server.js
```

Por defecto, el servidor escucha en `ws://localhost:8080`.

## 🔐 Seguridad

- Los códigos de vinculación expiran después de **10 minutos**
- Los códigos se muestran solo durante **2 minutos** en el HUD
- Cada jugador obtiene un **UUID único** basado en su nombre
- Las conexiones se validan en el servidor

## 📝 Notas Adicionales

- El addon es compatible con **multijugador** y **realms**
- Funciona en **todas las plataformas** de Bedrock (Windows, Xbox, PlayStation, Switch, Mobile)
- La **app móvil** solo está disponible para **Android** por ahora
- Se recomienda una **red local estable** para mejor rendimiento

## 🆘 Soporte

Si encuentras problemas:
1. Revisa el archivo `logs/` para ver registros del servidor
2. Activa `debugMode: true` en `config.json`
3. Verifica la consola del juego para mensajes de error

---

**Versión**: 1.0.0  
**Fecha**: Enero 2026  
**Compatibilidad**: Minecraft Bedrock 1.21.0+

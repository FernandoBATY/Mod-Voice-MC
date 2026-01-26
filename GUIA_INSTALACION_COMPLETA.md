# 🎮 Guía Completa de Instalación - Sistema de Chat de Voz de Proximidad para Minecraft Bedrock

Esta guía te llevará paso a paso para instalar y configurar todo el sistema de chat de voz de proximidad.

## 📦 Componentes del Sistema

El sistema está compuesto por **3 partes principales**:

1. **📱 App Móvil Android** (`app-release.apk`) - Para el micrófono y audio
2. **🖥️ Servidor WebSocket** (Node.js) - Para gestionar las comunicaciones
3. **🎮 Addon de Minecraft** (`proximity_voice_addon_v1.0.0.mcaddon`) - Para la integración en el juego

---

## 🚀 Instalación Paso a Paso

### PASO 1: Instalar el Servidor WebSocket

#### Requisitos:
- **Node.js** versión 16 o superior ([Descargar aquí](https://nodejs.org/))

#### Instrucciones:

1. **Instalar dependencias**:
   ```bash
   cd server
   npm install
   ```

2. **Iniciar el servidor**:
   ```bash
   node server.js
   ```

3. **Verificar**:
   - Deberías ver: `✅ Servidor WebSocket escuchando en el puerto 8080`
   - Mantén esta ventana abierta mientras juegas

#### Opciones Avanzadas:

Para acceso desde otros dispositivos en tu red:
```bash
# El servidor escuchará en todas las interfaces de red
node server.js
```

Anota tu dirección IP local:
```bash
# En Windows:
ipconfig

# Busca "Dirección IPv4" (ejemplo: 192.168.1.100)
```

---

### PASO 2: Instalar la App Móvil Android

#### Requisitos:
- **Dispositivo Android** con Android 7.0 (API 24) o superior
- Permitir instalación de **fuentes desconocidas** (apps de terceros)

#### Instrucciones:

1. **Transferir el APK** a tu dispositivo Android:
   - Ubicación: `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`
   - Tamaño: ~46 MB
   - Puedes usar USB, Bluetooth, email, Drive, etc.

2. **Habilitar instalación de apps de terceros**:
   - Ve a **Configuración** → **Seguridad**
   - Activa **Fuentes desconocidas** o **Instalar apps desconocidas**
   - (La ubicación exacta varía según el dispositivo)

3. **Instalar el APK**:
   - Abre el archivo `app-release.apk` en tu dispositivo
   - Toca **Instalar**
   - Espera a que se complete la instalación
   - Toca **Abrir**

4. **Conceder permisos**:
   - La app solicitará permiso para:
     - 🎤 **Micrófono** (obligatorio)
     - 🔔 **Notificaciones** (recomendado)
   - Toca **Permitir** en ambos

---

### PASO 3: Instalar el Addon de Minecraft

#### Requisitos:
- **Minecraft Bedrock Edition** versión 1.21.0 o superior

#### Instrucciones:

1. **Importar el addon**:
   - Localiza el archivo: `proximity_voice_addon_v1.0.0.mcaddon`
   - **Opción A**: Haz doble clic en el archivo
   - **Opción B**: En Minecraft → Configuración → Almacenamiento → Importar

2. **Crear o configurar un mundo**:

   **Para mundo nuevo**:
   - **Crear Mundo** → **Configuración**
   - Ve a **Complementos**:
     - En **Paquetes de Comportamiento**, activa "Chat de Voz de Proximidad"
     - En **Paquetes de Recursos**, activa "UI de Chat de Voz"
   - Ve a **Experimentos** y activa:
     - ✅ **Beta APIs**
     - ✅ **Molang Features**
   - Crea el mundo

   **Para mundo existente**:
   - Selecciona el mundo → **Editar**
   - Ve a **Complementos** y activa ambos paquetes
   - Ve a **Experimentos** y activa las opciones requeridas
   - ⚠️ Se creará una copia de seguridad automática

3. **Verificar instalación**:
   - Entra al mundo
   - Deberías ver en el chat: "🎤 Sistema de Voz de Proximidad Iniciado"
   - También verás tu código de vinculación de 4 dígitos

---

## 🎯 Configuración y Uso

### 1️⃣ Configurar el Servidor

Edita `server/config.json` (opcional):

```json
{
  "port": 8080,
  "maxPlayers": 100,
  "logLevel": "info"
}
```

### 2️⃣ Conectar la App Móvil

1. **Abre la app** en tu dispositivo Android

2. **Completa el formulario de conexión**:
   - **Nombre de jugador**: Tu nombre EXACTO en Minecraft
   - **Código de vinculación**: El código de 4 dígitos que aparece en Minecraft
   - **URL del servidor**:
     - Si el servidor está en la misma PC: `ws://localhost:8080`
     - Si el servidor está en otra PC: `ws://192.168.1.XXX:8080`
       (Reemplaza XXX con la IP del servidor)

3. **Toca "Conectar"**

4. **Verificar conexión**:
   - En Minecraft verás: "✅ Conectado al servidor"
   - En la app verás: "🎤 Chat de Voz Activo"

### 3️⃣ Configurar el Addon en Minecraft

Edita `behavior_pack/config/config.json`:

```json
{
  "proximityVoice": {
    "proximityRange": 30,        // Rango de audición (bloques)
    "maxVolume": 1.0,            // Volumen máximo (0.0-1.0)
    "minVolume": 0.1,            // Volumen mínimo
    "volumeFalloff": 1.5,        // Velocidad de caída del volumen
    "teamChat": {
      "enabled": true            // Equipos se escuchan siempre
    },
    "globalChat": {
      "enabled": false           // Chat global (todos se escuchan)
    }
  }
}
```

---

## 🎮 Cómo Usar el Sistema

### Hablar en el Juego

**Opción 1 - Mantener presionado**:
1. En la app móvil, mantén presionado el botón **"🎤 Hablar"**
2. Habla por el micrófono
3. Suelta el botón para dejar de hablar

**Opción 2 - Activación por voz** (si está configurado):
1. Simplemente habla, se activará automáticamente
2. La sensibilidad se configura en la app

### Silenciar Micrófono

- Toca el botón **"🔇 Silenciar"** en la app
- Para reactivar, toca **"🔊 Activar"**

### Ver Jugadores Cercanos

- En la pantalla de la app verás una lista de jugadores cercanos hablando
- En Minecraft verás indicadores visuales en el HUD

### Comandos en Minecraft

```
/function init              # Reiniciar el sistema
/function voice_update      # Actualizar estados
/function voice_detect      # Detectar jugadores con voz
```

### Crear Equipos

Para que jugadores del mismo equipo se escuchen sin límite de distancia:

```
/tag @p add team:red
/tag @p add team:blue
/tag @p add team:green
```

---

## 🔧 Solución de Problemas

### ❌ "No se puede conectar al servidor"

**Causas comunes**:
- El servidor WebSocket no está ejecutándose
- URL del servidor incorrecta
- Firewall bloqueando el puerto 8080
- Dispositivo móvil y servidor en redes diferentes

**Soluciones**:
1. Verifica que el servidor esté corriendo (`node server.js`)
2. Confirma la IP correcta con `ipconfig` (Windows) o `ifconfig` (Mac/Linux)
3. Permite el puerto 8080 en el firewall:
   ```powershell
   # Windows PowerShell (como administrador)
   New-NetFirewallRule -DisplayName "Voice Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
   ```
4. Asegúrate de que ambos dispositivos estén en la **misma red WiFi**

### ❌ "Código de vinculación inválido"

**Causas**:
- Código expirado (duran 10 minutos)
- Código mal ingresado
- Nombre de jugador incorrecto

**Soluciones**:
1. Verifica que el código en Minecraft coincida exactamente
2. Asegúrate de que el nombre de jugador sea EXACTAMENTE igual
3. Si el código expiró, reinicia el mundo para generar uno nuevo

### ❌ "No puedo escuchar a otros jugadores"

**Causas**:
- Fuera del rango de proximidad
- Micrófono del otro jugador silenciado
- Conexión WebSocket interrumpida

**Soluciones**:
1. Acércate al otro jugador (rango por defecto: 30 bloques)
2. Verifica que el otro jugador tenga su micrófono activo
3. Revisa el estado de conexión en ambas apps
4. Reinicia la conexión desconectando y reconectando

### ❌ "El addon no aparece en Minecraft"

**Soluciones**:
1. Verifica que el archivo sea `.mcaddon` (no `.zip`)
2. Asegúrate de tener Minecraft Bedrock 1.21.0 o superior
3. Intenta reiniciar Minecraft
4. Verifica en Configuración → Almacenamiento que los paquetes estén instalados

### ❌ "Error de Beta APIs"

**Solución**:
1. Ve a Configuración del Mundo → Experimentos
2. Activa **Beta APIs** y **Molang Features**
3. Acepta la advertencia
4. Reinicia el mundo

---

## 📊 Configuración de Red Avanzada

### Configuración para LAN

Si quieres que jugadores en tu red local se conecten:

1. **Obtén tu IP local**:
   ```bash
   # Windows
   ipconfig
   
   # Busca "Dirección IPv4": 192.168.1.XXX
   ```

2. **Configura el firewall**:
   ```powershell
   # Windows (PowerShell como admin)
   New-NetFirewallRule -DisplayName "Minecraft Voice Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
   ```

3. **Comparte la URL**:
   - Los jugadores deben usar: `ws://TU_IP:8080`
   - Ejemplo: `ws://192.168.1.100:8080`

### Configuración para Internet (Tailscale)

Para jugar con amigos por Internet:

1. **Instala Tailscale** ([tailscale.com](https://tailscale.com/))
   - En la PC del servidor
   - En el dispositivo Android

2. **Conéctate a Tailscale**:
   - Inicia sesión en ambos dispositivos
   - Ambos estarán en una red virtual privada

3. **Usa la IP de Tailscale**:
   - En Tailscale, anota tu IP (ejemplo: `100.64.X.X`)
   - Los jugadores usan: `ws://100.64.X.X:8080`

---

## 📝 Especificaciones Técnicas

### Servidor WebSocket
- **Puerto**: 8080 (configurable)
- **Protocolo**: WebSocket (ws://)
- **Codec de Audio**: Opus OGG
- **Bitrate**: 64 kbps
- **Sample Rate**: 16000 Hz
- **Canales**: Mono

### App Móvil Android
- **Plataforma**: Android 7.0+ (API 24+)
- **Tamaño**: ~46 MB
- **Permisos**: Micrófono, Notificaciones, Internet, Wake Lock
- **Tecnología**: Flutter/Dart

### Addon de Minecraft
- **Versión Minecraft**: 1.21.0+
- **APIs Requeridas**: @minecraft/server 1.8.0, @minecraft/server-ui 1.2.0
- **Experimentos**: Beta APIs, Molang Features
- **Tamaño**: ~9 KB

---

## 🎯 Mejores Prácticas

1. **Siempre inicia el servidor primero** antes de abrir Minecraft o la app
2. **Mantén la app en primer plano** para mejor rendimiento
3. **Usa auriculares** para evitar eco y retroalimentación
4. **Configura el rango de proximidad** según el tamaño de tu mundo
5. **Activa el modo background** en la app para llamadas largas
6. **Cierra otras apps** en el móvil para mejor calidad de audio
7. **Usa una red estable** (WiFi preferiblemente)

---

## 📞 Contacto y Soporte

Si encuentras problemas:
1. Revisa esta guía completa
2. Consulta los logs en `logs/` para errores del servidor
3. Activa `debugMode: true` en las configuraciones para más información

---

**¡Disfruta del chat de voz de proximidad en Minecraft!** 🎮🎤

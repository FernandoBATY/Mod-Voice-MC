# 🔧 Solución de Errores - Chat de Voz de Proximidad

## ✅ Problemas Corregidos

### 1. **Errores de JavaScript en el Addon (main.js)**
- ❌ **Error**: `TypeError: not a function` en línea 460
- ❌ **Error**: `Cannot read property 'subscribe' of undefined` en línea 480
- ✅ **Solución**: 
  - Removida declaración duplicada de variable `world`
  - Corregido método `onScreenDisplay.setTitleArea()` → `onScreenDisplay.setTitle()`

### 2. **Errores de Sintaxis en Comandos (.mcfunction)**
- ❌ **Error**: Caracteres `<<` y `>>` no permitidos en comandos
- ❌ **Error**: Sintaxis incorrecta con `store result`
- ❌ **Error**: Selectores con parámetros incorrectos
- ✅ **Solución**: Simplificados los archivos `.mcfunction` con comandos válidos

### 3. **Problema de Sincronización de Posiciones**
- ❌ **Problema**: Los jugadores no se escuchaban aunque estuvieran cerca
- ❌ **Causa**: La app de Windows NO recibía la posición del jugador desde Minecraft
- ✅ **Solución**: 
  - El servidor ahora sincroniza las posiciones entre dispositivos del mismo jugador
  - El addon envía actualizaciones de posición cada 500ms
  - La app recibe la lista de jugadores cercanos con distancias y volúmenes calculados

## 📦 Nuevo Addon Generado

**Archivo**: `proximity_voice_addon_v1.0.2.mcaddon`

Este addon **REEMPLAZA** el anterior (`proximity_voice_addon_v1.0.1.mcaddon`)

## 🚀 Pasos para Actualizar

### 1. **Remover el Addon Antiguo**
1. Abre Minecraft
2. Ve a **Configuración** → **Almacenamiento** → **Cached Data**
3. Borra el addon anterior "Chat de Voz de Proximidad"

### 2. **Instalar el Nuevo Addon**
1. Localiza el archivo: `proximity_voice_addon_v1.0.2.mcaddon`
2. Haz doble clic para instalarlo
3. Minecraft se abrirá automáticamente e importará el addon

### 3. **Activar en tu Mundo**
1. Edita tu mundo
2. Ve a **Behavior Packs**
3. Activa "Chat de Voz de Proximidad v1.0.2"
4. Ve a **Resource Packs**
5. Activa "Chat de Voz de Proximidad UI v1.0.2"
6. **Importante**: Asegúrate de activar **Experiments** → **Beta APIs**

### 4. **Conectar la App de Windows**

#### Paso 1: Entrar al Mundo de Minecraft
1. Entra primero a tu mundo de Minecraft
2. Verás un código de 4 dígitos en pantalla (ej: `1234`)
3. El código es válido por **10 minutos**

#### Paso 2: Abrir la App de Windows
1. Abre la aplicación de Windows
2. Ingresa:
   - **Nombre de Jugador**: El mismo que usas en Minecraft
   - **Código de Vinculación**: El código de 4 dígitos
   - **Server URL**: `ws://localhost:8080` (si el server está en la misma PC)
3. Haz clic en **Conectar**

### 5. **Verificar Conexión**

En el **servidor** (terminal) deberías ver:
```
[info] Nueva conexión intento: TuNombre (minecraft) sin código
[info] [Nuevo] Jugador TuNombre creado - código: 1234
[info] [Multi-Device] TuNombre conectando con windows
[info] ✅ [Código Válido] TuNombre vinculado correctamente
```

En la **app de Windows**:
- Debe decir "Conectado" en verde
- Debe mostrar la lista de jugadores cercanos con distancias

## 🎮 Cómo Usar

### Comandos en Minecraft
- `!codigo` - Ver tu código de vinculación actual
- `!nuevoCodigo` - Generar un nuevo código
- `!voice` - Ver estado del sistema

### En la App de Windows
- **Push to Talk**: Mantén presionado el botón del micrófono para hablar
- **Mute**: Silencia tu micrófono completamente
- **Lista de Jugadores**: Muestra jugadores cercanos con distancia y volumen

## 🔍 Solución de Problemas

### "No nos escuchamos aunque estamos cerca"

**Verifica**:
1. ✅ Ambos jugadores están en la **misma dimensión** (Overworld, Nether, End)
2. ✅ La distancia es menor a **30 bloques**
3. ✅ La app de Windows muestra al otro jugador en la lista de "Nearby Players"
4. ✅ El servidor muestra ambas conexiones

**En el servidor debe aparecer**:
```
[info] Jugador conectado: Jugador1 ...
[info] Jugador conectado: Jugador2 ...
```

### "Error: Se requiere código de vinculación"

**Solución**:
1. Primero entra al mundo de Minecraft
2. Espera a ver el código en pantalla
3. Luego conecta la app con ese código

### "El código expiró"

**Solución**:
1. En Minecraft escribe: `/say !nuevoCodigo`
2. Aparecerá un nuevo código válido por 10 minutos

## 📊 Mejoras Implementadas

1. **Sincronización Multi-Dispositivo**: Un jugador puede usar Minecraft + App simultáneamente
2. **Actualización de Posición en Tiempo Real**: Cada 500ms el addon envía la posición
3. **Lista de Jugadores Cercanos**: La app muestra quién está cerca y a qué distancia
4. **Cálculo de Volumen Automático**: El volumen se ajusta según la distancia
5. **Verificación de Dimensión**: Solo se escuchan jugadores en la misma dimensión

## 🆘 Si Sigues Teniendo Problemas

### Revisar Logs del Servidor
```powershell
# Ver logs en tiempo real
cd c:\Users\bryan\Desktop\Proyecto-voice-MC\server
npm start
```

### Revisar Logs de Minecraft
1. Presiona `Ctrl + H` en Minecraft para abrir el chat
2. Los errores aparecerán con `[Scripting][error]`
3. Los mensajes normales aparecerán con `[Chat de Voz]`

### Reiniciar Todo
1. Cierra Minecraft
2. Cierra la app de Windows
3. Detén el servidor (Ctrl+C en la terminal)
4. Inicia el servidor: `npm start`
5. Abre Minecraft y entra al mundo
6. Conecta la app de Windows

---

## 📝 Notas Técnicas

### Flujo de Sincronización

```
MINECRAFT ADDON  →  SERVIDOR  →  APP WINDOWS
     (posición)      (calcula)     (muestra)
                    (distancias)
                    (volúmenes)
```

1. El **addon de Minecraft** envía la posición del jugador cada 500ms
2. El **servidor** recibe la posición y calcula:
   - Qué jugadores están cerca (< 30 bloques)
   - El volumen para cada jugador según distancia
3. El **servidor** envía a la app:
   - Lista de jugadores cercanos
   - Distancia a cada uno
   - Volumen calculado
4. La **app** muestra la información y reproduce el audio con el volumen correcto

### Verificación de Dimensión

Los jugadores solo se escuchan si están en la **misma dimensión**:
- ✅ Overworld + Overworld = Se escuchan
- ✅ Nether + Nether = Se escuchan
- ❌ Overworld + Nether = NO se escuchan
- ❌ Overworld + The End = NO se escuchan

---

¡Listo! Con estos cambios el sistema debería funcionar correctamente. 🎉

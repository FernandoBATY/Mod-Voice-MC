# 🔗 Cómo Obtener el Código de Vinculación

## 📍 ¿Dónde Aparece el Código?

El código de vinculación se muestra **automáticamente en la pantalla del juego** cuando entras a tu mundo de Minecraft con el addon activado.

---

## 👀 Ubicación del Código en Pantalla

### En el Juego (Minecraft):

Cuando entres al mundo verás en la **parte superior de la pantalla**:

```
🔗 Código: 1234 (120s) ██████████
Ingresa este código en la app para vincular tu dispositivo
```

**Características del código**:
- 📱 **4 dígitos** (ejemplo: 1234, 5678, 9012)
- ⏱️ **Duración**: 10 minutos (600 segundos)
- 👁️ **Visible**: Durante los primeros 2 minutos
- 🔄 **Único**: Cada vez que entras al mundo se genera uno nuevo

---

## 📋 Pasos Detallados para Obtener el Código

### PASO 1: Inicia el Servidor WebSocket

**IMPORTANTE**: El servidor DEBE estar ejecutándose primero.

```bash
# En PowerShell/CMD
cd C:\Users\bryan\Desktop\Proyecto-voice-MC\server
node server.js
```

✅ Verás: `Servidor WebSocket escuchando en el puerto 8080`

---

### PASO 2: Entra al Mundo de Minecraft

1. Abre **Minecraft Bedrock Edition**
2. Selecciona tu mundo (con el addon activado)
3. Presiona **Jugar**

---

### PASO 3: Observa la Pantalla

**Inmediatamente después de entrar** verás:

**En la parte superior central de la pantalla**:
```
🔗 Código: XXXX (XXXs) ████████
Ingresa este código en la app para vincular tu dispositivo
```

**Y en el chat también aparecerá**:
```
[Voz] Conectado al Chat de Voz de Proximidad!
[Código] Código recibido: XXXX (válido 600s)
```

---

### PASO 4: Anota el Código

El código son **4 números** que aparecen después de "Código:".

**Ejemplo**:
- Si ves: `🔗 Código: 7482 (120s)`
- Tu código es: **7482**

---

### PASO 5: Ingresa el Código en la App Móvil

1. Abre la **app de Android** en tu teléfono
2. Completa el formulario:
   - **Nombre de jugador**: Tu nombre EXACTO en Minecraft
   - **Código de vinculación**: Los 4 dígitos que viste (ej: 7482)
   - **URL del servidor**: 
     - Mismo dispositivo: `ws://localhost:8080`
     - Otro dispositivo: `ws://192.168.X.X:8080` (tu IP local)
3. Toca **"Conectar"**

---

## ❓ Problemas Comunes

### ❌ "No veo ningún código en pantalla"

**Causas posibles**:

1. **El servidor no está ejecutándose**
   ```bash
   # Verifica que esto esté corriendo:
   cd server
   node server.js
   ```

2. **El addon no está activado correctamente**
   - Ve a **Editar Mundo** → **Complementos**
   - Verifica que ambos paquetes estén activos (✓)
   - Ve a **Experimentos**
   - Verifica que "Beta APIs" esté activado (✓)

3. **No has esperado suficiente**
   - El código puede tardar 2-3 segundos en aparecer
   - Espera unos momentos después de entrar al mundo

4. **El HUD está desactivado**
   - Presiona **F1** (en PC) para mostrar el HUD
   - En consolas: verifica que el HUD esté visible

---

### ❌ "El código desapareció de la pantalla"

**Solución**: El código se oculta después de 2 minutos, pero **sigue siendo válido por 10 minutos**.

**Opciones**:

**Opción 1 - Ver en el chat**:
1. Abre el chat (presiona **T** en PC)
2. Desplázate hacia arriba
3. Busca el mensaje: `[Código] Código recibido: XXXX`

**Opción 2 - Regenerar el código**:
1. Sal del mundo
2. Vuelve a entrar
3. Se generará un **nuevo código**

**Opción 3 - Usar comando** (próximamente):
```
/function refresh_code
```

---

### ❌ "El código no funciona en la app"

**Verifica**:

1. **Código correcto**: Revisa que hayas ingresado los 4 dígitos exactos
2. **No ha expirado**: Los códigos duran 10 minutos
3. **Nombre exacto**: El nombre debe ser IDÉNTICO al de Minecraft
   - Incluye mayúsculas/minúsculas
   - Sin espacios extras
4. **Servidor correcto**: Verifica la URL del servidor
5. **Servidor activo**: El servidor debe estar ejecutándose

---

### ❌ "Código inválido o expirado"

**Causas**:
- El código expiró (10 minutos)
- Ingresaste mal el código
- El servidor se reinició

**Solución**:
1. Sal del mundo de Minecraft
2. Vuelve a entrar
3. Obtén el **nuevo código** que aparece
4. Conéctate nuevamente con el nuevo código

---

## 🎯 Consejos Útiles

### ✅ Mejor Práctica:

1. **Primero**: Inicia el servidor (`node server.js`)
2. **Segundo**: Entra al mundo de Minecraft
3. **Tercero**: Anota el código inmediatamente
4. **Cuarto**: Abre la app y conéctate

### ⏱️ Gestión de Tiempo:

- Tienes **10 minutos** para usar el código
- El código se muestra en pantalla **2 minutos**
- Después de 2 minutos, búscalo en el **chat**

### 📸 Toma una Captura:

Para no olvidar el código:
- **PC**: Presiona **F2** para captura en Minecraft
- **Xbox**: Botón Xbox + Y
- **PlayStation**: Botón Share
- **Switch**: Botón Captura
- **Móvil**: Captura de pantalla del dispositivo

---

## 🔄 Flujo Completo de Vinculación

```
1. 🖥️  Inicia servidor
   │
   ├─> node server.js
   │
2. 🎮 Entra a Minecraft
   │
   ├─> Mundo con addon activado
   │
3. 👀 Observa pantalla
   │
   ├─> Código: XXXX aparece arriba
   │
4. 📝 Anota código
   │
   ├─> Ejemplo: 7482
   │
5. 📱 Abre app Android
   │
   ├─> Nombre: TuNombreExacto
   ├─> Código: 7482
   ├─> URL: ws://192.168.X.X:8080
   │
6. 🔗 Conectar
   │
   └─> ✅ ¡Conectado!
```

---

## 📺 Ejemplo Visual

**Lo que verás en Minecraft**:

```
═══════════════════════════════════════════════
        🔗 Código: 7482 (120s) ██████████
    Ingresa este código en la app para vincular
═══════════════════════════════════════════════

[Chat]
[Voz] Conectado al Chat de Voz de Proximidad!
[Código] Código recibido: 7482 (válido 600s)
```

**Lo que ingresarás en la app**:

```
┌─────────────────────────────────────┐
│  Chat de Voz de Proximidad          │
├─────────────────────────────────────┤
│                                     │
│  Nombre de jugador:                 │
│  ┌─────────────────────────────┐   │
│  │ TuNombre                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Código de vinculación:             │
│  ┌─────────────────────────────┐   │
│  │ 7482                        │   │
│  └─────────────────────────────┘   │
│                                     │
│  URL del servidor:                  │
│  ┌─────────────────────────────┐   │
│  │ ws://192.168.1.100:8080     │   │
│  └─────────────────────────────┘   │
│                                     │
│        [ 🔗 CONECTAR ]              │
│                                     │
└─────────────────────────────────────┘
```

---

## 🆘 ¿Todavía Tienes Problemas?

Si después de seguir todos estos pasos aún no ves el código:

1. **Verifica los logs del servidor**:
   ```bash
   # En la ventana donde corre el servidor
   # Busca líneas como:
   [Código] Código generado: XXXX para jugador: Nombre
   ```

2. **Verifica la consola de Minecraft**:
   - Busca mensajes de error
   - Debería aparecer: `[Chat de Voz de Proximidad] Script cargado exitosamente!`

3. **Reinicia todo**:
   - Cierra Minecraft
   - Detén el servidor (Ctrl+C)
   - Inicia el servidor nuevamente
   - Entra al mundo otra vez

4. **Revisa el archivo [GUIA_INSTALACION_COMPLETA.md](GUIA_INSTALACION_COMPLETA.md)** para verificar que todo esté instalado correctamente.

---

**¡El código aparecerá en la pantalla automáticamente! Solo necesitas entrar al mundo.** 🎮

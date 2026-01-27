# 🎮 Comandos del Addon - Chat de Voz de Proximidad

## 📋 Resumen de Comandos

| Comando | Descripción |
|---------|-------------|
| `!codigo` o `!code` | Ver tu código de vinculación actual |
| `!nuevoCodigo` o `!newcode` | Generar un nuevo código de vinculación |
| `!voice` | Ver estado completo del chat de voz |
| `!voice-range <número>` | Cambiar el rango de proximidad |
| `!voice-team` | Ver estado del chat de equipo |

---

## 🔗 Obtener el Código de Vinculación

### ✅ MÉTODO 1: Automático al Entrar

Cuando entres al mundo, verás automáticamente en el **chat**:

```
╔═══════════════════════════════════╗
║  Chat de Voz de Proximidad      ║
╠═══════════════════════════════════╣
║  🔗 Tu código de vinculación:   ║
║      1234                        ║
║  (Válido por 10 minutos)         ║
╚═══════════════════════════════════╝
Ingresa este código en la app móvil
```

---

### ✅ MÉTODO 2: Comando !codigo

Si el mensaje desapareció del chat, escribe:

```
!codigo
```

o en inglés:

```
!code
```

Verás:

```
╔═══════════════════════════════════╗
║  🔗 Tu código de vinculación:   ║
║      1234                        ║
║  (Expira en 543s)                ║
╚═══════════════════════════════════╝
```

---

### ✅ MÉTODO 3: Generar Nuevo Código

Si tu código expiró o quieres uno nuevo:

```
!nuevoCodigo
```

o en inglés:

```
!newcode
```

Verás:

```
╔═══════════════════════════════════╗
║  ✅ Nuevo código generado!        ║
╠═══════════════════════════════════╣
║  🔗 Tu código de vinculación:   ║
║      5678                        ║
║  (Válido por 10 minutos)         ║
╚═══════════════════════════════════╝
```

---

## 📊 Ver Estado del Sistema

### Comando: `!voice`

Muestra información completa:

```
!voice
```

Respuesta:

```
=== Chat de Voz de Proximidad ===
Estado: Silencio
Rango: 30 bloques
Equipo: Ninguno
Código: 1234

Comandos disponibles:
  !codigo - Ver código actual
  !nuevoCodigo - Generar nuevo código
  !voice - Ver estado
  !voice-range <número> - Cambiar rango
```

---

## ⚙️ Configurar Rango de Proximidad

### Comando: `!voice-range <número>`

Cambia la distancia a la que se pueden escuchar los jugadores.

**Ejemplos**:

```
!voice-range 50
```
→ Los jugadores se escucharán hasta 50 bloques de distancia

```
!voice-range 20
```
→ Los jugadores se escucharán hasta 20 bloques de distancia

```
!voice-range 100
```
→ Los jugadores se escucharán hasta 100 bloques de distancia

**Respuesta**:
```
[Voz] Rango de proximidad establecido a 50 bloques
```

---

## 👥 Chat de Equipo

### Comando: `!voice-team`

Ver si el chat de equipo está activado:

```
!voice-team
```

Respuesta:
```
[Voz] Chat de equipo: Activado
```

### Crear Equipos

Para que los jugadores del mismo equipo se escuchen sin importar la distancia:

```
/tag @p add team:red
/tag @p add team:blue
/tag @p add team:green
```

---

## 📱 Pasos Completos de Vinculación

### 1. En Minecraft:

Cuando entres al mundo, verás tu código en el chat, o escribe:
```
!codigo
```

### 2. En la App Móvil:

Ingresa:
- **Nombre de jugador**: TuNombreExacto (como aparece en Minecraft)
- **Código de vinculación**: 1234 (el que viste en el chat)
- **URL del servidor**: ws://192.168.X.X:8080

### 3. Conectar:

Toca el botón **"Conectar"** en la app.

---

## ❓ Preguntas Frecuentes

### ¿Cuánto dura un código?

- **10 minutos** desde que se genera
- Después de 10 minutos, genera uno nuevo con `!nuevoCodigo`

### ¿Puedo tener varios códigos?

No, solo hay un código activo a la vez por jugador. Al generar uno nuevo, el anterior se invalida.

### ¿El código aparece en pantalla (HUD)?

Sí, aparece en el chat del juego. Si configuraste el HUD personalizado, también puede aparecer arriba en pantalla.

### ¿Qué pasa si olvido mi código?

Escribe `!codigo` en el chat para verlo de nuevo (mientras no haya expirado).

### ¿Puedo usar el mismo código varias veces?

Sí, puedes conectar y desconectar la app varias veces con el mismo código mientras no expire.

---

## 🎯 Resumen Rápido

**Para obtener tu código**:
1. Entra al mundo → aparece automáticamente
2. O escribe: `!codigo`
3. O genera uno nuevo: `!nuevoCodigo`

**Para usar el código**:
1. Abre la app móvil
2. Ingresa tu nombre + código + URL del servidor
3. Toca "Conectar"
4. ¡Listo! 🎤

---

**Archivo actualizado**: `proximity_voice_addon_v1.0.1.mcaddon`  
**Fecha**: 25 de Enero de 2026

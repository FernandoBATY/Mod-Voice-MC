# Proyecto Chat de Voz de Proximidad

Este es un proyecto personal que desarrolle para jugar con mis amigos en nuestro mundo de Minecraft Bedrock. La idea es tener un chat de voz que funcione por proximidad, o sea, que solo escuches a los que estan cerca de ti en el juego, y que el volumen baje mientras mas lejos esten.

Lo programe como practica de la universidad y para hacer mas inmersivas las partidas. Es un codigo sencillo y directo, pensado para funcionar en nuestra red local o un servidor pequeño.

## Componentes
El proyecto tiene dos partes principales:
1. **Servidor (Node.js)**: Se encarga de recibir el audio y las posiciones de los jugadores y reenviarlo a quien corresponda.
2. **Addon (Minecraft Bedrock)**: Son los scripts y la interfaz que van dentro del juego para capturar la info y mandarla al servidor.

## Como correrlo
Si alguno de ustedes quiere probarlo o modificarlo:

1. Vayan a la carpeta `server` e instalen las dependencias (ya saben, `npm install`).
2. Ejecuten el servidor con `node server.js`.
3. Instalen el mcaddon en su Minecraft.
4. Asegurense de que todos esten conectados a la misma red o que el servidor sea accesible.

## Notas
- El codigo esta limpio de comentarios para que no estorbe, pero es facil de entender si saben JS basico.
- Quite todos los emojis y cosas raras para mantenerlo simple.
- Si algo falla, reinicien el script o el servidor, suele arreglarse.

Disfrutenlo y cualquier cosa me dicen.

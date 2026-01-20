# App Movil - Chat de Voz de Proximidad

Proyecto Flutter para conectar al chat de voz desde Android e iOS.

## ⚠️ Requisito Importante: Flutter

El error `El término 'flutter' no se reconoce...` significa que **no tienes el Kit de Desarrollo de Flutter (SDK) instalado** o configurado en tu computadora.

Para poder correr esta aplicación móvil, necesitas instalarlo:

1.  **Descargar Flutter**: Ve a [flutter.dev/docs/get-started/install/windows](https://docs.flutter.dev/get-started/install/windows).
2.  **Instalar**: Sigue los pasos para descargar el zip y extraerlo (ej: en `C:\src\flutter`).
3.  **Configurar PATH**: Tienes que agregar la carpeta `bin` de Flutter a las variables de entorno de Windows para que la terminal reconozca el comando.
4.  **Verificar**: Cierra y abre la terminal, y ejecuta `flutter doctor`.

## Como correrlo (Una vez instalado Flutter)

1. Abrir una terminal en esta carpeta (`c:/Users/bryan/Desktop/Proyecto-voice-MC/apps/mobile`).
2. Ejecutar estos comandos para preparar el proyecto:
   ```powershell
   flutter create .
   flutter pub get
   ```
3. Conectar tu celular por USB o abrir un emulador AVD.
4. Ejecutar `flutter run`.

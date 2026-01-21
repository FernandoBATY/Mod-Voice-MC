import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_background/flutter_background.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';

void main() {
  runApp(const ProximityVoiceChatApp());
}

class ProximityVoiceChatApp extends StatelessWidget {
  const ProximityVoiceChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chat de Voz de Proximidad',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF5C6BC0)),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      darkTheme: ThemeData.dark(useMaterial3: true),
      themeMode: ThemeMode.dark,
      home: const LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

// ============================================
// UTILIDADES
// ============================================

String generateUUID(String playerName) {
  final bytes = utf8.encode(playerName);
  final hash = sha256.convert(bytes);
  final hexString = hash.toString();
  
  return '${hexString.substring(0, 8)}-${hexString.substring(8, 12)}-${hexString.substring(12, 16)}-${hexString.substring(16, 20)}-${hexString.substring(20, 32)}';
}

// ============================================
// PANTALLA DE LOGIN
// ============================================

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _playerNameController = TextEditingController();
  final TextEditingController _linkingCodeController = TextEditingController();
  final TextEditingController _serverUrlController = TextEditingController(
    text: 'ws://192.168.1.1:8080'
  );
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _loadSavedData();
  }

  Future<void> _requestPermissions() async {
    await Permission.microphone.request();
  }

  Future<void> _loadSavedData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _playerNameController.text = prefs.getString('last_player_name') ?? '';
      _serverUrlController.text = prefs.getString('last_server_url') ?? 'ws://192.168.1.1:8080';
    });
  }

  Future<void> _saveData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_player_name', _playerNameController.text);
    await prefs.setString('last_server_url', _serverUrlController.text);
  }

  Future<void> _handleLogin() async {
    if (_playerNameController.text.isEmpty) {
      setState(() {
        _errorMessage = 'Por favor ingresa tu nombre de jugador';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    await _saveData();

    try {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => VoiceChatScreen(
              playerName: _playerNameController.text,
              serverUrl: _serverUrlController.text,
              linkingCode: _linkingCodeController.text.toUpperCase(),
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Conexión fallida: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(50),
                      border: Border.all(color: const Color(0xFF5C6BC0), width: 3),
                    ),
                    child: const Icon(
                      Icons.mic,
                      size: 50,
                      color: Color(0xFF5C6BC0),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Título
                  const Text(
                    'Chat de Voz',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Minecraft Bedrock Edition',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // Campo Nombre
                  TextField(
                    controller: _playerNameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Nombre de Jugador',
                      labelStyle: const TextStyle(color: Colors.white70),
                      hintText: 'Ingresa tu nombre',
                      hintStyle: TextStyle(color: Colors.grey[600]),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF5C6BC0), width: 2),
                      ),
                      prefixIcon: const Icon(Icons.person, color: Color(0xFF5C6BC0)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Campo Código de Vinculación
                  TextField(
                    controller: _linkingCodeController,
                    style: const TextStyle(color: Colors.white, letterSpacing: 4),
                    textCapitalization: TextCapitalization.characters,
                    maxLength: 6,
                    decoration: InputDecoration(
                      labelText: 'Código de Vinculación (opcional)',
                      labelStyle: const TextStyle(color: Colors.white70),
                      hintText: 'ABC123',
                      hintStyle: TextStyle(color: Colors.grey[600]),
                      helperText: 'Si ya estás en Minecraft, ingresa el código del HUD',
                      helperStyle: const TextStyle(color: Colors.white54, fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF5C6BC0), width: 2),
                      ),
                      prefixIcon: const Icon(Icons.link, color: Color(0xFF5C6BC0)),
                    ),
                    onChanged: (value) {
                      _linkingCodeController.value = _linkingCodeController.value.copyWith(
                        text: value.toUpperCase(),
                        selection: TextSelection.collapsed(offset: value.length),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // Campo URL del Servidor
                  TextField(
                    controller: _serverUrlController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'URL del Servidor',
                      labelStyle: const TextStyle(color: Colors.white70),
                      hintText: 'ws://servidor:8080',
                      hintStyle: TextStyle(color: Colors.grey[600]),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF5C6BC0), width: 2),
                      ),
                      prefixIcon: const Icon(Icons.dns, color: Color(0xFF5C6BC0)),
                    ),
                  ),
                  
                  // Mensaje de Error
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.redAccent),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.redAccent),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 32),
                  
                  // Botón Conectar
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF5C6BC0),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 4,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Conectar',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _playerNameController.dispose();
    _linkingCodeController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }
}

// ============================================
// PANTALLA DE VOZ
// ============================================

class VoiceChatScreen extends StatefulWidget {
  final String playerName;
  final String serverUrl;
  final String linkingCode;

  const VoiceChatScreen({
    super.key,
    required this.playerName,
    required this.serverUrl,
    this.linkingCode = '',
  });

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  WebSocketChannel? _channel;
  FlutterSoundRecorder? _recorder;
  FlutterSoundPlayer? _player;
  
  bool _isConnected = false;
  bool _isMuted = false;
  bool _isSpeaking = false;
  bool _isRecording = false;
  List<Map<String, dynamic>> _nearbyPlayers = [];
  String? _linkingCode;
  int? _linkingCodeExpires;
  Timer? _linkingCodeTimer;
  
  String? _uuid;
  StreamSubscription? _messageSubscription;
  
  // Reconexión automática
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 10;
  bool _isReconnecting = false;
  
  // Configuración persistente
  double _microphoneVolume = 1.0;
  Set<String> _mutedPlayers = {};
  
  // Background mode y notificaciones
  late FlutterLocalNotificationsPlugin _notificationsPlugin;
  bool _backgroundModeEnabled = false;

  @override
  void initState() {
    super.initState();
    _uuid = generateUUID(widget.playerName);
    _initBackgroundMode();
    _initNotifications();
    _initAudio();
    _connectToServer();
  }

  Future<void> _initBackgroundMode() async {
    try {
      // Configurar background mode para Android
      final androidConfig = AndroidConfig(
        onStart: onStart,
        autoStart: true,
        isForeground: true,
      );

      _backgroundModeEnabled = await FlutterBackground.initialize(androidConfig: androidConfig);
      
      if (_backgroundModeEnabled) {
        // Habilitar modo background
        await FlutterBackground.enableBackgroundExecution();
        
        // Mantener pantalla activa si es necesario
        await WakelockPlus.enable();
        
        print('✅ Background mode habilitado');
      }
    } catch (e) {
      print('⚠️ Error al habilitar background mode: $e');
    }
  }

  Future<void> _initNotifications() async {
    _notificationsPlugin = FlutterLocalNotificationsPlugin();
    
    const android = AndroidInitializationSettings('app_icon');
    const iOS = DarwinInitializationSettings();
    
    const settings = InitializationSettings(android: android, iOS: iOS);
    
    await _notificationsPlugin.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        // Manejar tap en notificación
        print('Notificación tapped: ${response.payload}');
      },
    );
  }

  Future<void> _showPersistentNotification(String title, String body) async {
    const android = AndroidNotificationDetails(
      'voice_chat_channel',
      'Voice Chat',
      channelDescription: 'Notificaciones del chat de voz',
      importance: Importance.max,
      priority: Priority.high,
      autoCancel: false,
      ongoing: true, // Notificación persistente
      icon: 'app_icon',
    );
    
    const iOS = DarwinNotificationDetails();
    
    const details = NotificationDetails(android: android, iOS: iOS);
    
    await _notificationsPlugin.show(
      0, // ID de notificación
      title,
      body,
      details,
      payload: 'voice_chat',
    );
  }

  // Callback para background task
  static void onStart() {
    // Este método se ejecuta en background
    print('🔄 Background task ejecutándose');
  }

  Future<void> _initAudio() async {
    _recorder = FlutterSoundRecorder();
    _player = FlutterSoundPlayer();
    
    await _recorder!.openRecorder();
    await _player!.openPlayer();
    
    // Cargar configuración guardada
    await _loadSettings();
    
    print('🎤 Audio inicializado');
  }
  
  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _microphoneVolume = prefs.getDouble('microphone_volume') ?? 1.0;
      final mutedList = prefs.getStringList('muted_players') ?? [];
      _mutedPlayers = Set.from(mutedList);
    });
  }
  
  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('microphone_volume', _microphoneVolume);
    await prefs.setStringList('muted_players', _mutedPlayers.toList());
  }

  Future<void> _connectToServer() async {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse(widget.serverUrl),
      );

      // Escuchar mensajes
      _messageSubscription = _channel!.stream.listen(
        _handleMessage,
        onError: (error) {
          print('❌ Error WebSocket: $error');
          _showSnackBar('Error de conexión: $error');
          setState(() => _isConnected = false);
          _attemptReconnect();
        },
        onDone: () {
          print('🔌 Desconectado del servidor');
          setState(() => _isConnected = false);
          _attemptReconnect();
        },
      );

      // Enviar mensaje de join
      final joinMessage = {
        'type': 'player_join',
        'uuid': _uuid,
        'name': widget.playerName,
        'version': '2.0.0',
        'deviceType': 'android',
      };

      if (widget.linkingCode.isNotEmpty) {
        joinMessage['linkingCode'] = widget.linkingCode;
      }

      _channel!.sink.add(jsonEncode(joinMessage));
      print('📡 Conectando al servidor...');
      
    } catch (e) {
      print('❌ Error conectando: $e');
      _showSnackBar('Error de conexión: $e');
    }
  }

  void _handleMessage(dynamic data) {
    try {
      final message = jsonDecode(data);
      final type = message['type'];

      switch (type) {
        case 'join_confirm':
          setState(() => _isConnected = true);
          _resetReconnectState();
          _showSnackBar('✅ Conectado al servidor');
          
          // Mostrar notificación persistente
          await _showPersistentNotification(
            '🎤 Chat de Voz Activo',
            'Conectado como ${widget.playerName}',
          );
          
          // Guardar código de vinculación si existe
          if (message['linkingCode'] != null) {
            setState(() {
              _linkingCode = message['linkingCode'];
              _linkingCodeExpires = message['linkingCodeExpires'];
            });
            _startLinkingCodeTimer();
          }
          break;

        case 'linking_code':
          setState(() {
            _linkingCode = message['code'];
            _linkingCodeExpires = message['expiresIn'];
          });
          _startLinkingCodeTimer();
          _showSnackBar('🔗 Código recibido: ${message['code']}');
          break;

        case 'linking_required':
          _showSnackBar('⚠️ Se requiere código de vinculación');
          break;

        case 'linking_failed':
          _showSnackBar('❌ Vinculación falló: ${message['error']}');
          break;

        case 'linking_result':
          if (message['success'] == true) {
            _showSnackBar('✅ Dispositivo vinculado correctamente');
          } else {
            _showSnackBar('❌ Error: ${message['error']}');
          }
          break;

        case 'player_update':
          // Actualizar lista de jugadores cercanos
          _updateNearbyPlayers(message);
          break;

        case 'audio_chunk':
          // Reproducir audio recibido
          _playAudioChunk(message);
          break;

        default:
          print('📨 Mensaje no manejado: $type');
      }
    } catch (e) {
      print('❌ Error procesando mensaje: $e');
    }
  }

  void _startLinkingCodeTimer() {
    _linkingCodeTimer?.cancel();
    _linkingCodeTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_linkingCodeExpires != null && _linkingCodeExpires! > 0) {
        setState(() {
          _linkingCodeExpires = _linkingCodeExpires! - 1;
        });
      } else {
        setState(() {
          _linkingCode = null;
          _linkingCodeExpires = null;
        });
        timer.cancel();
      }
    });
  }

  void _updateNearbyPlayers(Map<String, dynamic> message) {
    if (message['nearbyPlayers'] != null) {
      setState(() {
        _nearbyPlayers = List<Map<String, dynamic>>.from(
          message['nearbyPlayers'].map((player) => {
            'uuid': player['uuid'],
            'name': player['name'],
            'distance': player['distance'],
            'isSpeaking': player['isSpeaking'] ?? false,
          })
        );
      });
    }
  }
  
  void _attemptReconnect() {
    if (_isReconnecting || _reconnectAttempts >= _maxReconnectAttempts) {
      if (_reconnectAttempts >= _maxReconnectAttempts) {
        _showSnackBar('❌ Conexión perdida. Máximo de intentos alcanzado.');
      }
      return;
    }
    
    _isReconnecting = true;
    _reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    final delay = Duration(
      milliseconds: (1000 * (1 << (_reconnectAttempts - 1))).clamp(1000, 30000)
    );
    
    _showSnackBar('🔄 Reconectando en ${delay.inSeconds}s... (${_reconnectAttempts}/$_maxReconnectAttempts)');
    
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      _isReconnecting = false;
      _connectToServer();
    });
  }
  
  void _resetReconnectState() {
    _reconnectAttempts = 0;
    _isReconnecting = false;
    _reconnectTimer?.cancel();
  }

  void _playAudioChunk(Map<String, dynamic> message) async {
    try {
      final audioData = message['audioChunk'];
      final codec = message['codec'] ?? 'pcm16';
      
      if (audioData == null) return;
      
      // Decodificar base64
      final Uint8List audioBytes;
      if (audioData is String) {
        audioBytes = base64Decode(audioData);
      } else if (audioData is List) {
        audioBytes = Uint8List.fromList(audioData.cast<int>());
      } else {
        return;
      }
      
      // Verificar si el jugador está muteado
      final speakerUuid = message['speaker'];
      if (_mutedPlayers.contains(speakerUuid)) {
        return; // No reproducir audio de jugadores muteados
      }
      
      // Reproducir audio
      if (_player != null && _player!.isPlaying == false) {
        // Flutter Sound puede reproducir desde buffer
        // Nota: Para Opus necesitarías decodificar primero
        await _player!.startPlayer(
          fromDataBuffer: audioBytes,
          codec: codec == 'opus' ? Codec.opusOGG : Codec.pcm16,
          whenFinished: () {
            print('🔊 Audio reproducido de: $speakerUuid');
          },
        );
      }
    } catch (e) {
      print('❌ Error reproduciendo audio: $e');
    }
  }

  Future<void> _toggleMute() async {
    setState(() {
      _isMuted = !_isMuted;
    });

    _channel?.sink.add(jsonEncode({
      'type': 'mute_status',
      'muted': _isMuted,
    }));

    _showSnackBar(_isMuted ? '🔇 Micrófono silenciado' : '🔊 Micrófono activo');
  }

  Future<void> _startSpeaking() async {
    if (_isMuted || _isRecording) return;

    setState(() {
      _isSpeaking = true;
      _isRecording = true;
    });

    try {
      await _recorder!.startRecorder(
        toStream: (buffer) {
          // Enviar chunks de audio al servidor
          _channel?.sink.add(jsonEncode({
            'type': 'audio_chunk',
            'player': {'uuid': _uuid},
            'audioData': base64Encode(buffer),
          }));
        },
        codec: Codec.opusOGG, // Usar Opus en lugar de PCM16
        sampleRate: 16000,
        numChannels: 1,
        bitRate: 64000, // 64kbps bitrate
      );

      _channel?.sink.add(jsonEncode({
        'type': 'audio_start',
        'player': {'uuid': _uuid},
      }));
    } catch (e) {
      print('❌ Error iniciando grabación: $e');
    }
  }

  Future<void> _stopSpeaking() async {
    if (!_isRecording) return;

    setState(() {
      _isSpeaking = false;
      _isRecording = false;
    });

    try {
      await _recorder!.stopRecorder();

      _channel?.sink.add(jsonEncode({
        'type': 'audio_stop',
        'player': {'uuid': _uuid},
      }));
    } catch (e) {
      print('❌ Error deteniendo grabación: $e');
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              _buildHeader(),
              
              // Código de Vinculación (si existe)
              if (_linkingCode != null) _buildLinkingCodeBanner(),
              
              // Contenido Principal
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Indicador de Estado
                    _buildStatusIndicator(),
                    
                    const SizedBox(height: 48),
                    
                    // Botón PTT (Push-to-Talk)
                    _buildPTTButton(),
                    
                    const SizedBox(height: 32),
                    
                    // Controles
                    _buildControls(),
                  ],
                ),
              ),
              
              // Jugadores Cercanos
              _buildNearbyPlayers(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.8),
        border: const Border(
          bottom: BorderSide(color: Color(0xFF334155), width: 1),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () {
              Navigator.of(context).pop();
            },
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.playerName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _isConnected ? Colors.green : Colors.red,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isConnected ? 'Conectado' : 'Desconectado',
                    style: TextStyle(
                      color: _isConnected ? Colors.green : Colors.red,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLinkingCodeBanner() {
    final progress = (_linkingCodeExpires ?? 0) / 120.0;
    
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF5C6BC0).withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF5C6BC0), width: 2),
      ),
      child: Column(
        children: [
          const Row(
            children: [
              Icon(Icons.link, color: Color(0xFF5C6BC0)),
              SizedBox(width: 8),
              Text(
                'Código de Vinculación',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _linkingCode ?? '',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
              letterSpacing: 8,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Válido por ${_linkingCodeExpires ?? 0} segundos',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white24,
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF5C6BC0)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator() {
    return Column(
      children: [
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _isSpeaking
                ? Colors.red.withOpacity(0.2)
                : Colors.blue.withOpacity(0.1),
            border: Border.all(
              color: _isSpeaking ? Colors.red : Colors.blue,
              width: 4,
            ),
          ),
          child: Icon(
            _isMuted ? Icons.mic_off : Icons.mic,
            size: 60,
            color: _isSpeaking ? Colors.red : Colors.blue,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          _isSpeaking ? '🎤 HABLANDO...' : (_isMuted ? '🔇 SILENCIADO' : '🎙️ Listo'),
          style: TextStyle(
            color: _isSpeaking ? Colors.red : Colors.white70,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildPTTButton() {
    return GestureDetector(
      onLongPressStart: (_) => _startSpeaking(),
      onLongPressEnd: (_) => _stopSpeaking(),
      child: Container(
        width: 200,
        height: 200,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: _isSpeaking
                ? [Colors.red, Colors.red.shade900]
                : [const Color(0xFF5C6BC0), const Color(0xFF3949AB)],
          ),
          boxShadow: [
            BoxShadow(
              color: (_isSpeaking ? Colors.red : const Color(0xFF5C6BC0))
                  .withOpacity(0.5),
              blurRadius: 30,
              spreadRadius: 5,
            ),
          ],
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.mic,
                size: 80,
                color: Colors.white,
              ),
              SizedBox(height: 8),
              Text(
                'Mantén\npara hablar',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Botón Silenciar
        FloatingActionButton(
          heroTag: 'mute',
          onPressed: _toggleMute,
          backgroundColor: _isMuted ? Colors.red : const Color(0xFF334155),
          child: Icon(
            _isMuted ? Icons.mic_off : Icons.mic,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildNearbyPlayers() {
    if (_nearbyPlayers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.8),
        border: const Border(
          top: BorderSide(color: Color(0xFF334155), width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Jugadores Cercanos',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          ..._nearbyPlayers.map((player) => _buildPlayerCard(player)),
        ],
      ),
    );
  }

  Widget _buildPlayerCard(Map<String, dynamic> player) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF334155).withOpacity(0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            player['isSpeaking'] == true ? Icons.volume_up : Icons.person,
            color: player['isSpeaking'] == true ? Colors.green : Colors.white70,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              player['name'] ?? 'Jugador',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
              ),
            ),
          ),
          Text(
            '${player['distance'] ?? 0}m',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _messageSubscription?.cancel();
    _channel?.sink.close();
    _recorder?.closeRecorder();
    _player?.closePlayer();
    _linkingCodeTimer?.cancel();
    _reconnectTimer?.cancel();
    
    // Limpiar background mode
    if (_backgroundModeEnabled) {
      FlutterBackground.disableBackgroundExecution();
      WakelockPlus.disable();
    }
    
    // Cancelar notificación persistente
    _notificationsPlugin.cancel(0);
    
    _saveSettings();
    super.dispose();
  }
}

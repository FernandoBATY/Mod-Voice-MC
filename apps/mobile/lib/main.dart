import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:convert';
import 'dart:async';

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
      home: const LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _playerNameController = TextEditingController();
  final TextEditingController _serverUrlController = TextEditingController(
    text: 'ws://192.168.1.X:8080'
  );
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    await Permission.microphone.request();
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

    try {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => VoiceChatScreen(
              playerName: _playerNameController.text,
              serverUrl: _serverUrlController.text,
            ),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Conexion fallida: ${e.toString()}';
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
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color.fromARGB(255, 30, 36, 56),
                    borderRadius: BorderRadius.circular(40),
                    border: Border.all(color: const Color(0xFF5C6BC0), width: 2),
                  ),
                  child: const Icon(
                    Icons.mic,
                    size: 40,
                    color: Color(0xFF5C6BC0),
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Chat de Voz',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Minecraft Bedrock',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: 48),
                TextField(
                  controller: _playerNameController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Nombre de Jugador',
                    hintStyle: TextStyle(color: Colors.grey[400]),
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
                    prefixIcon: const Icon(Icons.person, color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _serverUrlController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'URL del Servidor',
                    hintStyle: TextStyle(color: Colors.grey[400]),
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
                    prefixIcon: const Icon(Icons.dns, color: Colors.grey),
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
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
                              color: Colors.white,
                              strokeWidth: 2,
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
    );
  }

  @override
  void dispose() {
    _playerNameController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }
}

class VoiceChatScreen extends StatefulWidget {
  final String playerName;
  final String serverUrl;

  const VoiceChatScreen({
    super.key,
    required this.playerName,
    required this.serverUrl,
  });

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  late WebSocketChannel _channel;
  bool _isMuted = false;
  bool _isSpeaking = false;
  double _microphoneSensitivity = 0.5;
  final List<NearbyPlayer> _nearbyPlayers = [];
  ConnectionStatus _connectionStatus = ConnectionStatus.connecting;
  int _playerCount = 0;
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    _connectToServer();
    _setupHeartbeat();
  }

  Future<void> _connectToServer() async {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse(widget.serverUrl),
      );

      _channel.sink.add(jsonEncode({
        'type': 'player_join',
        'player': {
          'uuid': _generateUUID(),
          'name': widget.playerName,
          'version': '1.0.0',
        },
      }));

      _channel.stream.listen(
        (message) {
          _handleServerMessage(jsonDecode(message));
        },
        onDone: () {
          if (mounted) {
            setState(() {
              _connectionStatus = ConnectionStatus.disconnected;
            });
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() {
              _connectionStatus = ConnectionStatus.error;
            });
          }
        },
      );

      if (mounted) {
        setState(() {
          _connectionStatus = ConnectionStatus.connected;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _connectionStatus = ConnectionStatus.error;
        });
      }
    }
  }

  void _setupHeartbeat() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_connectionStatus == ConnectionStatus.connected) {
        try {
          _channel.sink.add(jsonEncode({
            'type': 'heartbeat',
            'player': {
              'uuid': _generateUUID(),
            },
          }));
        } catch (e) {
          // Ignore write errors
        }
      }
    });
  }

  void _handleServerMessage(Map<String, dynamic> message) {
    if (!mounted) return;
    
    final type = message['type'];

    switch (type) {
      case 'join_confirm':
        _handleJoinConfirm(message);
        break;
      case 'player_update':
        break;
      case 'player_event':
        _handlePlayerEvent(message);
        break;
    }
  }

  void _handleJoinConfirm(Map<String, dynamic> message) {
    final otherPlayers = message['otherPlayers'] as List?;
    setState(() {
      _playerCount = (otherPlayers?.length ?? 0) + 1;
    });
  }

  void _handlePlayerEvent(Map<String, dynamic> message) {
    final event = message['event'];
    setState(() {
      if (event == 'player_join') {
        _playerCount++;
        // Demo logic: add dummy nearby player for UI visualization
        if (!_nearbyPlayers.any((p) => p.name == message['data']['name'])) {
            _nearbyPlayers.add(NearbyPlayer(
                name: message['data']['name'], 
                distance: 5.0, 
                volume: 0.8
            ));
        }
      } else if (event == 'player_leave') {
        _playerCount--;
        _nearbyPlayers.removeWhere((p) => p.name == message['data']['name']);
      }
    });
  }

  void _toggleMute() {
    setState(() {
      _isMuted = !_isMuted;
    });

    _channel.sink.add(jsonEncode({
      'type': 'mute_status',
      'muted': _isMuted,
    }));
  }

  void _startSpeaking() {
    setState(() {
      _isSpeaking = true;
    });

    _channel.sink.add(jsonEncode({
      'type': 'audio_start',
      'player': {'uuid': _generateUUID()},
    }));
  }

  void _stopSpeaking() {
    setState(() {
      _isSpeaking = false;
    });

    _channel.sink.add(jsonEncode({
      'type': 'audio_stop',
      'player': {'uuid': _generateUUID()},
    }));
  }

  String _generateUUID() {
    return 'player_${widget.playerName.hashCode}';
  }

  Color _getConnectionColor() {
    switch (_connectionStatus) {
      case ConnectionStatus.connected:
        return Colors.greenAccent;
      case ConnectionStatus.connecting:
        return Colors.orangeAccent;
      case ConnectionStatus.disconnected:
      case ConnectionStatus.error:
        return Colors.redAccent;
    }
  }

  String _getConnectionText() {
    switch (_connectionStatus) {
      case ConnectionStatus.connected:
        return 'Conectado';
      case ConnectionStatus.connecting:
        return 'Conectando...';
      case ConnectionStatus.disconnected:
        return 'Desconectado';
      case ConnectionStatus.error:
        return 'Error de Conexion';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(widget.playerName, style: const TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: _getConnectionColor().withValues(alpha: 0.1),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: _getConnectionColor(),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _getConnectionColor().withValues(alpha: 0.5),
                        blurRadius: 4,
                        spreadRadius: 2,
                      )
                    ]
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getConnectionText(),
                        style: TextStyle(
                            fontWeight: FontWeight.bold, 
                            color: _getConnectionColor(),
                            fontSize: 14
                        ),
                      ),
                      Text(
                        'Jugadores en linea: $_playerCount',
                        style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _nearbyPlayers.isEmpty 
                ? Center(
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                            Icon(Icons.people_outline, size: 64, color: Colors.grey[800]),
                            const SizedBox(height: 16),
                            Text(
                                "No hay jugadores cerca",
                                style: TextStyle(color: Colors.grey[600]),
                            )
                        ],
                    ),
                )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                        Text(
                        'JUGADORES CERCANOS',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                            color: Colors.grey[500],
                        ),
                        ),
                        const SizedBox(height: 12),
                        ..._nearbyPlayers.map((player) => PlayerTile(player: player)),
                    ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
              boxShadow: [
                  BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, -5))
              ]
            ),
            child: Column(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sensibilidad del Microfono',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[300]),
                    ),
                    SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                            activeTrackColor: const Color(0xFF5C6BC0),
                            thumbColor: const Color(0xFF5C6BC0),
                        ),
                        child: Slider(
                            value: _microphoneSensitivity,
                            onChanged: (value) {
                                setState(() {
                                _microphoneSensitivity = value;
                                });
                            },
                        ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Column(
                      children: [
                        FloatingActionButton(
                          heroTag: "muteBtn",
                          onPressed: _toggleMute,
                          backgroundColor:
                              _isMuted ? Colors.redAccent : const Color(0xFF5C6BC0),
                          child: Icon(
                            _isMuted ? Icons.mic_off : Icons.mic,
                            size: 28,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _isMuted ? 'Silenciado' : 'Activo',
                          style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onLongPressStart: (_) => _startSpeaking(),
                      onLongPressEnd: (_) => _stopSpeaking(),
                      child: Column(
                        children: [
                          FloatingActionButton(
                             heroTag: "pttBtn",
                            onPressed: () {},
                            backgroundColor:
                                _isSpeaking ? Colors.amber[700] : const Color(0xFF334155),
                            child: const Icon(
                              Icons.record_voice_over,
                              size: 28,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isSpeaking
                                ? 'Hablando...'
                                : 'Presiona para hablar',
                            style: TextStyle(
                                fontSize: 12, 
                                color: _isSpeaking ? Colors.amber : Colors.grey[400],
                                fontWeight: _isSpeaking ? FontWeight.bold : FontWeight.normal
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _channel.sink.close();
    _heartbeatTimer?.cancel();
    super.dispose();
  }
}

class NearbyPlayer {
  final String name;
  final double distance;
  final double volume;

  NearbyPlayer({
    required this.name,
    required this.distance,
    required this.volume,
  });
}

class PlayerTile extends StatelessWidget {
  final NearbyPlayer player;

  const PlayerTile({super.key, required this.player});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF334155))
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: const Color(0xFF5C6BC0),
            foregroundColor: Colors.white,
            child: Text(player.name[0].toUpperCase()),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  player.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  '${player.distance.toStringAsFixed(1)}m • Volumen: ${(player.volume * 100).toStringAsFixed(0)}%',
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
              ],
            ),
          ),
          Icon(Icons.volume_up, color: Colors.grey[600], size: 20),
        ],
      ),
    );
  }
}

enum ConnectionStatus { connected, connecting, disconnected, error }

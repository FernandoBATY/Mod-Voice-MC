import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import 'package:permission_handler/permission_handler.dart';
import 'dart:convert';
import 'dart:async';

void main() {
  runApp(const ProximityVoiceChatApp());
}

class ProximityVoiceChatApp extends StatelessWidget {
  const ProximityVoiceChatApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Proximity Voice Chat',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

// ============================================
// LOGIN SCREEN
// ============================================

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _playerNameController = TextEditingController();
  final TextEditingController _serverUrlController = TextEditingController(
    text: 'ws://localhost:8080'
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
    await Permission.camera.request();
  }

  Future<void> _handleLogin() async {
    if (_playerNameController.text.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter your player name';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Navigate to main chat screen
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
        _errorMessage = 'Connection failed: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.blue[900]!, Colors.blue[600]!],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.mic,
                    size: 48,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(height: 32),
                // Title
                const Text(
                  'Proximity Voice Chat',
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
                // Player Name Input
                TextField(
                  controller: _playerNameController,
                  decoration: InputDecoration(
                    hintText: 'Enter your player name',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    prefixIcon: const Icon(Icons.person),
                  ),
                ),
                const SizedBox(height: 16),
                // Server URL Input
                TextField(
                  controller: _serverUrlController,
                  decoration: InputDecoration(
                    hintText: 'Server URL',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    prefixIcon: const Icon(Icons.dns),
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red[900]),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                // Login Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Connect',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
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

// ============================================
// VOICE CHAT MAIN SCREEN
// ============================================

class VoiceChatScreen extends StatefulWidget {
  final String playerName;
  final String serverUrl;

  const VoiceChatScreen({
    Key? key,
    required this.playerName,
    required this.serverUrl,
  }) : super(key: key);

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  late WebSocketChannel _channel;
  bool _isMuted = false;
  bool _isSpeaking = false;
  double _microphoneSensitivity = 0.5;
  List<NearbyPlayer> _nearbyPlayers = [];
  ConnectionStatus _connectionStatus = ConnectionStatus.connecting;
  int _playerCount = 0;

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

      // Send join message
      _channel.sink.add(jsonEncode({
        'type': 'player_join',
        'player': {
          'uuid': _generateUUID(),
          'name': widget.playerName,
          'version': '1.0.0',
        },
      }));

      // Listen to server messages
      _channel.stream.listen(
        (message) {
          _handleServerMessage(jsonDecode(message));
        },
        onDone: () {
          setState(() {
            _connectionStatus = ConnectionStatus.disconnected;
          });
        },
        onError: (error) {
          setState(() {
            _connectionStatus = ConnectionStatus.error;
          });
        },
      );

      setState(() {
        _connectionStatus = ConnectionStatus.connected;
      });
    } catch (e) {
      setState(() {
        _connectionStatus = ConnectionStatus.error;
      });
    }
  }

  void _setupHeartbeat() {
    Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_connectionStatus == ConnectionStatus.connected) {
        _channel.sink.add(jsonEncode({
          'type': 'heartbeat',
          'player': {
            'uuid': _generateUUID(),
          },
        }));
      }
    });
  }

  void _handleServerMessage(Map<String, dynamic> message) {
    final type = message['type'];

    switch (type) {
      case 'join_confirm':
        _handleJoinConfirm(message);
        break;
      case 'player_update':
        _handlePlayerUpdate(message);
        break;
      case 'audio_start':
        _handleAudioStart(message);
        break;
      case 'audio_stop':
        _handleAudioStop(message);
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

  void _handlePlayerUpdate(Map<String, dynamic> message) {
    // Update nearby players list
  }

  void _handleAudioStart(Map<String, dynamic> message) {
    // Start playing audio from speaker
  }

  void _handleAudioStop(Map<String, dynamic> message) {
    // Stop playing audio
  }

  void _handlePlayerEvent(Map<String, dynamic> message) {
    final event = message['event'];
    setState(() {
      if (event == 'player_join') {
        _playerCount++;
      } else if (event == 'player_leave') {
        _playerCount--;
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
    // Simple UUID generation - should be consistent for the player
    return 'player_${widget.playerName.hashCode}';
  }

  Color _getConnectionColor() {
    switch (_connectionStatus) {
      case ConnectionStatus.connected:
        return Colors.green;
      case ConnectionStatus.connecting:
        return Colors.orange;
      case ConnectionStatus.disconnected:
      case ConnectionStatus.error:
        return Colors.red;
    }
  }

  String _getConnectionText() {
    switch (_connectionStatus) {
      case ConnectionStatus.connected:
        return 'Connected';
      case ConnectionStatus.connecting:
        return 'Connecting...';
      case ConnectionStatus.disconnected:
        return 'Disconnected';
      case ConnectionStatus.error:
        return 'Connection Error';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.playerName),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Connection Status Bar
          Container(
            padding: const EdgeInsets.all(16),
            color: _getConnectionColor().withOpacity(0.1),
            child: Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: _getConnectionColor(),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getConnectionText(),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Players online: $_playerCount',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Nearby Players
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Nearby Players',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                ..._nearbyPlayers.map((player) => PlayerTile(player: player)),
              ],
            ),
          ),
          // Controls Section
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            child: Column(
              children: [
                // Microphone Sensitivity Slider
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Microphone Sensitivity',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Slider(
                      value: _microphoneSensitivity,
                      onChanged: (value) {
                        setState(() {
                          _microphoneSensitivity = value;
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Control Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Mute Button
                    Column(
                      children: [
                        FloatingActionButton(
                          onPressed: _toggleMute,
                          backgroundColor:
                              _isMuted ? Colors.red : Colors.green,
                          child: Icon(
                            _isMuted ? Icons.mic_off : Icons.mic,
                            size: 28,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _isMuted ? 'Muted' : 'Unmuted',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    // Push-to-Talk Button
                    GestureDetector(
                      onLongPressStart: (_) => _startSpeaking(),
                      onLongPressEnd: (_) => _stopSpeaking(),
                      child: Column(
                        children: [
                          FloatingActionButton(
                            onPressed: () {},
                            backgroundColor:
                                _isSpeaking ? Colors.red : Colors.blue,
                            child: Icon(
                              Icons.record_voice_over,
                              size: 28,
                              color:
                                  _isSpeaking ? Colors.white : Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isSpeaking
                                ? 'Speaking...'
                                : 'Push to Talk',
                            style: const TextStyle(fontSize: 12),
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

  const PlayerTile({Key? key, required this.player}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              child: Text(player.name[0]),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    player.name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${player.distance.toStringAsFixed(1)}m - Volume: ${(player.volume * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum ConnectionStatus { connected, connecting, disconnected, error }

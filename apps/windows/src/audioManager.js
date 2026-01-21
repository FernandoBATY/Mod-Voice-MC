// Audio Manager - WebRTC Audio Processing
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.audioWorklet = null;
        this.analyser = null;
        this.speakers = new Map(); // uuid -> AudioPlayer
        this.micGain = null;
        this.isRecording = false;
        this.vadThreshold = 0.02; // Voice Activity Detection threshold
        this.sampleRate = 48000;
    }

    async initialize() {
        try {
            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate,
                latencyHint: 'interactive'
            });

            console.log('[Audio] AudioContext initialized:', {
                sampleRate: this.audioContext.sampleRate,
                state: this.audioContext.state
            });

            return true;
        } catch (error) {
            console.error('[Audio] Failed to initialize:', error);
            return false;
        }
    }

    async getMicrophoneAccess() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: this.sampleRate,
                    channelCount: 1
                }
            };

            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create audio processing chain
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Gain control
            this.micGain = this.audioContext.createGain();
            this.micGain.gain.value = 1.0;
            
            // Analyser for volume detection
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connect chain
            source.connect(this.micGain);
            this.micGain.connect(this.analyser);
            
            console.log('[Audio] Microphone access granted');
            return true;
        } catch (error) {
            console.error('[Audio] Microphone access denied:', error);
            return false;
        }
    }

    startRecording(onAudioData) {
        if (!this.mediaStream || this.isRecording) return;

        this.isRecording = true;

        // Create ScriptProcessor for audio capture
        const bufferSize = 4096;
        const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        processor.onaudioprocess = (e) => {
            if (!this.isRecording) return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Voice Activity Detection
            const rms = this.calculateRMS(inputData);
            if (rms < this.vadThreshold) return; // Silence, don't send

            // Convert Float32Array to Int16Array (PCM)
            const pcmData = this.float32ToInt16(inputData);
            
            // Send audio chunk
            if (onAudioData) {
                onAudioData({
                    data: pcmData,
                    sampleRate: this.sampleRate,
                    timestamp: Date.now(),
                    volume: rms
                });
            }
        };

        this.micGain.connect(processor);
        processor.connect(this.audioContext.destination);
        
        this.processor = processor;
        console.log('[Audio] Recording started');
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        console.log('[Audio] Recording stopped');
    }

    // Play audio from remote speaker
    playAudioChunk(speakerUuid, audioData, volume = 1.0, pan = 0) {
        if (!this.audioContext) return;

        try {
            // Get or create AudioPlayer for this speaker
            let player = this.speakers.get(speakerUuid);
            if (!player) {
                player = new AudioPlayer(this.audioContext);
                this.speakers.set(speakerUuid, player);
            }

            // Set volume and spatial position
            player.setVolume(volume);
            player.setPan(pan);
            
            // Play audio chunk
            player.playChunk(audioData);
        } catch (error) {
            console.error('[Audio] Failed to play chunk:', error);
        }
    }

    stopSpeaker(speakerUuid) {
        const player = this.speakers.get(speakerUuid);
        if (player) {
            player.stop();
            this.speakers.delete(speakerUuid);
        }
    }

    setMicrophoneVolume(volume) {
        if (this.micGain) {
            this.micGain.gain.value = Math.max(0, Math.min(2, volume));
        }
    }

    getMicrophoneLevel() {
        if (!this.analyser) return 0;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sum += normalized * normalized;
        }
        
        return Math.sqrt(sum / dataArray.length);
    }

    calculateRMS(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    float32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }

    int16ToFloat32(int16Array) {
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
        }
        return float32Array;
    }

    destroy() {
        this.stopRecording();
        
        this.speakers.forEach(player => player.stop());
        this.speakers.clear();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Individual speaker audio player with spatial audio
class AudioPlayer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.gainNode = audioContext.createGain();
        this.panNode = audioContext.createStereoPanner();
        this.queue = [];
        this.isPlaying = false;
        
        // Connect nodes
        this.gainNode.connect(this.panNode);
        this.panNode.connect(audioContext.destination);
    }

    setVolume(volume) {
        this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }

    setPan(pan) {
        // -1 (left) to 1 (right)
        this.panNode.pan.value = Math.max(-1, Math.min(1, pan));
    }

    playChunk(pcmData) {
        // Convert Int16Array to Float32Array
        const float32Data = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            float32Data[i] = pcmData[i] / (pcmData[i] < 0 ? 0x8000 : 0x7FFF);
        }

        // Create audio buffer
        const audioBuffer = this.audioContext.createBuffer(
            1, // mono
            float32Data.length,
            this.audioContext.sampleRate
        );
        
        audioBuffer.getChannelData(0).set(float32Data);

        // Create source and play
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);
        
        const currentTime = this.audioContext.currentTime;
        source.start(currentTime);
        
        this.isPlaying = true;
    }

    stop() {
        this.gainNode.disconnect();
        this.panNode.disconnect();
        this.isPlaying = false;
    }
}

// Export singleton instance
const audioManager = new AudioManager();
window.audioManager = audioManager;

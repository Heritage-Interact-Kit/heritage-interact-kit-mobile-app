import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppConfig } from '../config/app';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  artist?: string;
  onClose?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title = 'Audio Track',
  artist = 'Heritage Interact',
  onClose,
}) => {
  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFinished, setHasFinished] = useState(false);
  
  // Animation values
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setupAudio();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      // Cleanup
      player.release();
    };
  }, []);

  useEffect(() => {
    // Update loading state based on status
    if (status.isLoaded !== undefined) {
      setIsLoading(!status.isLoaded);
    }

    // Check if audio has finished
    if (status.isLoaded && status.duration && status.duration > 0) {
      // Check multiple conditions to determine if audio has finished
      const isAtEnd = status.currentTime >= status.duration - 0.5;
      const isStopped = !status.playing;
      const didJustFinish = status.didJustFinish === true;
      
      if (didJustFinish || (isAtEnd && isStopped)) {
        setHasFinished(true);
      } else if (status.playing || status.currentTime < status.duration - 1) {
        setHasFinished(false);
      }
    }

    // Update progress animation
    if (status.duration && status.duration > 0) {
      const progress = status.currentTime / status.duration;
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [status]);

  const setupAudio = async () => {
    try {
      setError(null);

      // Configure audio mode
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
        allowsRecording: false,
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Error setting up audio:', err);
      setError('Failed to setup audio');
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (hasFinished) {
        // Reset to beginning and play
        await player.seekTo(0);
        await player.play();
        setHasFinished(false);
      } else if (status.playing) {
        await player.pause();
      } else {
        await player.play();
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Playback error');
    }
  };

  const seekTo = async (percentage: number) => {
    if (!status.duration || status.duration === 0) return;

    try {
      const newPosition = percentage * status.duration;
      await player.seekTo(newPosition);
    } catch (err) {
      console.error('Error seeking:', err);
    }
  };

  const rewind = async () => {
    try {
      const newPosition = Math.max(0, status.currentTime - 10); // Rewind 10 seconds
      await player.seekTo(newPosition);
    } catch (err) {
      console.error('Error rewinding:', err);
    }
  };

  const forward = async () => {
    if (!status.duration || status.duration === 0) return;

    try {
      const newPosition = Math.min(status.duration, status.currentTime + 10); // Forward 10 seconds
      await player.seekTo(newPosition);
    } catch (err) {
      console.error('Error forwarding:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = status.duration && status.duration > 0 
    ? status.currentTime / status.duration 
    : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
            
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Main Content - Horizontal Layout */}
        <View style={styles.mainContent}>
          {/* Controls and Progress */}
          <View style={styles.playerControls}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(status.currentTime || 0)}</Text>
              <TouchableOpacity
                style={styles.progressBar}
                activeOpacity={0.9}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // Calculate based on the actual progress bar width
                  const progressBarWidth = 180; // Reduced width for compact layout
                  seekTo(locationX / progressBarWidth);
                }}
              >
                <View style={styles.progressBackground}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.progressThumb,
                      {
                        left: progressAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(status.duration || 0)}</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                onPress={rewind}
                style={styles.controlButton}
                disabled={isLoading || !status.isLoaded}
              >
                <Icon name="replay-10" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={[styles.playButton, (isLoading || !status.isLoaded) && styles.disabledButton]}
                disabled={isLoading || !status.isLoaded}
              >
                {isLoading || !status.isLoaded ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon 
                    name={hasFinished ? "replay" : (status.playing ? "pause" : "play-arrow")} 
                    size={hasFinished ? 24 : 28} 
                    color="#fff" 
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={forward}
                style={styles.controlButton}
                disabled={isLoading || !status.isLoaded}
              >
                <Icon name="forward-10" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradient: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    // flexDirection: 'row',
    // alignItems: 'center',
    // gap: 16,
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trackArtist: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
  playerControls: {
    width: '100%',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: 200,
    marginHorizontal: 8,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppConfig.colors.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    transform: [{ translateX: -8 }],
  },
  timeText: {
    color: '#fff',
    fontSize: 10,
    minWidth: 35,
    opacity: 0.7,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppConfig.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: AppConfig.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
});
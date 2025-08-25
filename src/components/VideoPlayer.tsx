import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppConfig } from '../config/app';

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  artist?: string;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title = 'Video Content',
  artist = 'Heritage Interact',
  onClose,
}) => {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<string>('');
  const [playerError, setPlayerError] = useState<any>(null);
  
  // Animation values
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Subscribe to player events
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Add status change listener
  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status, error }) => {
      setPlayerStatus(status);
      setPlayerError(error);
      console.log('Player status changed: ', status);
      
      // Update loading state based on status
      switch (status) {
        case 'idle':
          setIsLoading(false);
          break;
        case 'loading':
          setIsLoading(true);
          break;
        case 'readyToPlay':
          setIsLoading(false);
          if (player.duration && player.duration > 0) {
            setDuration(player.duration);
          }
          break;
        case 'error':
          setIsLoading(false);
          console.error('Video player error:', error);
          break;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player]);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Update progress periodically when playing
    let progressInterval: NodeJS.Timeout;
    if (isPlaying) {
      progressInterval = setInterval(() => {
        setCurrentTime(player.currentTime);
        if (player.duration && player.duration > 0 && duration === 0) {
          setDuration(player.duration);
        }
      }, 100);
    }

    return () => {
      clearInterval(progressInterval);
    };
  }, [isPlaying, duration]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      player.release();
    };
  }, []);

  useEffect(() => {
    // Update progress animation
    if (duration > 0) {
      const progress = currentTime / duration;
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [currentTime, duration]);

  const togglePlayPause = () => {
    if (playerStatus === 'idle' || (currentTime >= duration && duration > 0)) {
      // Reset and play from beginning
      player.seekTo(0);
      player.play();
    } else if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const seekTo = (percentage: number) => {
    if (!duration || duration === 0) return;

    try {
      const newPosition = percentage * duration;
      // TODO: seekTo might not be available in current expo-video version
      // player.seekTo(newPosition);
      setCurrentTime(newPosition);
    } catch (err) {
      console.error('Error seeking:', err);
    }
  };

  const rewind = () => {
    try {
      const newPosition = Math.max(0, currentTime - 10); // Rewind 10 seconds
      // TODO: seekTo might not be available in current expo-video version
      // player.seekTo(newPosition);
      setCurrentTime(newPosition);
    } catch (err) {
      console.error('Error rewinding:', err);
    }
  };

  const forward = () => {
    if (!duration || duration === 0) return;

    try {
      const newPosition = Math.min(duration, currentTime + 10); // Forward 10 seconds
      // TODO: seekTo might not be available in current expo-video version
      // player.seekTo(newPosition);
      setCurrentTime(newPosition);
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

  const hasFinished = duration > 0 && currentTime >= duration - 0.5;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>VIDEO PLAYER</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Video View */}
        <View style={styles.videoContainer}>
          <VideoView 
            style={styles.video} 
            player={player} 
            allowsFullscreen 
            allowsPictureInPicture
            contentFit="contain"
            onFullscreenEnter={() => setIsFullscreen(true)}
            onFullscreenExit={() => setIsFullscreen(false)}
          />
          
          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{title}</Text>
          <Text style={styles.trackArtist}>{artist}</Text>
        </View>

        {/* Controls and Progress */}
        <View style={styles.playerControls}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <TouchableOpacity
              style={styles.progressBar}
              activeOpacity={0.9}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const progressBarWidth = Dimensions.get('window').width - 120; // Account for margins and time text
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
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={rewind}
              style={styles.controlButton}
              disabled={isLoading}
            >
              <Icon name="replay-10" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={togglePlayPause}
              style={[styles.playButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              <Icon 
                name={hasFinished ? "replay" : (isPlaying ? "pause" : "play-arrow")} 
                size={hasFinished ? 24 : 28} 
                color="#fff" 
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={forward}
              style={styles.controlButton}
              disabled={isLoading}
            >
              <Icon name="forward-10" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {playerStatus === 'error' && playerError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {typeof playerError === 'string' ? playerError : 'Failed to load video'}
            </Text>
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
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  trackInfo: {
    marginBottom: 12,
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
    marginBottom: 12,
    width: '100%',
  },
  progressBar: {
    flex: 1,
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

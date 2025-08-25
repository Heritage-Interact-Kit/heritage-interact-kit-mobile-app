import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { tourAssetDownloader } from '../services/tourAssetDownloader';
import { Tour } from '../types/api';
import { AppConfig } from '../config/app';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

interface DownloadModalState {
  visible: boolean;
  tourId: number | null;
  tourTitle: string;
  progress: {
    total: number;
    downloaded: number;
    currentFile: string;
    percentage: number;
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedTours, setCachedTours] = useState<Set<number>>(new Set());
  const [downloadModal, setDownloadModal] = useState<DownloadModalState>({
    visible: false,
    tourId: null,
    tourTitle: '',
    progress: { total: 0, downloaded: 0, currentFile: '', percentage: 0 }
  });
  const { settings, user, logout } = useAuth();

  useEffect(() => {
    loadTours();
    checkCachedTours();
  }, []);

  const loadTours = async () => {
    try {
      const response = await apiService.getTours();
      setTours(response.data);
    } catch (error: any) {
      Alert.alert(AppConfig.text.errors.generic, AppConfig.text.errors.loadTours);
      console.error('Failed to load tours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCachedTours = async () => {
    try {
      const response = await apiService.getTours();
      const tourIds = response.data.map(tour => tour.id);
      
      const cachedSet = new Set<number>();
      for (const tourId of tourIds) {
        const isCached = await tourAssetDownloader.isTourCached(tourId);
        if (isCached) {
          cachedSet.add(tourId);
        }
      }
      setCachedTours(cachedSet);
    } catch (error) {
      console.error('Error checking cached tours:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTours();
    await checkCachedTours();
    setRefreshing(false);
  };

  const startTour = async (tour: Tour) => {
    // Check if tour is already cached
    const isCached = await tourAssetDownloader.isTourCached(tour.id);
    
    if (isCached) {
      // Navigate directly if cached
      navigation.navigate('Tour', { 
        tourId: tour.id, 
        tourTitle: tour.title,
        useCachedData: true 
      });
      return;
    }

    // Show download modal and start downloading
    setDownloadModal({
      visible: true,
      tourId: tour.id,
      tourTitle: tour.title,
      progress: { total: 0, downloaded: 0, currentFile: AppConfig.text.download.preparing, percentage: 0 }
    });

    try {
      await tourAssetDownloader.downloadTourAssets(tour.id, (progress) => {
        setDownloadModal(prev => ({
          ...prev,
          progress
        }));
      });

      // Update cached tours state
      setCachedTours(prev => new Set([...prev, tour.id]));

      // Close modal
      setDownloadModal(prev => ({ ...prev, visible: false }));

      // Navigate to tour
      navigation.navigate('Tour', { 
        tourId: tour.id, 
        tourTitle: tour.title,
        useCachedData: true 
      });

    } catch (error: any) {
      setDownloadModal(prev => ({ ...prev, visible: false }));
      Alert.alert(
        AppConfig.text.download.failed, 
        AppConfig.text.download.failedMessage,
        [
          { text: AppConfig.text.download.cancel, style: 'cancel' },
          { text: AppConfig.text.download.tryAgain, onPress: () => startTour(tour) }
        ]
      );
      console.error('Tour download failed:', error);
    }
  };

  const cancelDownload = () => {
    setDownloadModal(prev => ({ ...prev, visible: false }));
  };

  const clearTourCache = async (tourId: number) => {
    try {
      await tourAssetDownloader.clearTourCache(tourId);
      setCachedTours(prev => {
        const newSet = new Set(prev);
        newSet.delete(tourId);
        return newSet;
      });
      Alert.alert(AppConfig.text.cache.cleared, AppConfig.text.cache.clearedMessage);
    } catch (error) {
      Alert.alert(AppConfig.text.errors.generic, AppConfig.text.cache.clearError);
      console.error('Error clearing cache:', error);
    }
  };

  const showTourOptions = (tour: Tour) => {
    const isCached = cachedTours.has(tour.id);
    
    const options: any[] = [
      { text: AppConfig.text.download.cancel, style: 'cancel' },
      { text: 'Start Tour', onPress: () => startTour(tour) }
    ];

    if (isCached) {
      options.splice(1, 0, { 
        text: 'Clear Cache', 
        onPress: () => clearTourCache(tour.id),
        style: 'destructive'
      });
    }

    Alert.alert(
      tour.title,
      isCached ? 'This tour is downloaded and ready for offline use.' : 'This tour needs to be downloaded first.',
      options
    );
  };

  const handleLogout = () => {
    Alert.alert(
      AppConfig.text.auth.logout,
      AppConfig.text.auth.logoutConfirm,
      [
        { text: AppConfig.text.download.cancel, style: 'cancel' },
        { text: AppConfig.text.auth.logout, style: 'destructive', onPress: logout },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppConfig.colors.primary} />
        <Text style={styles.loadingText}>{AppConfig.text.loading.tours}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section - VR Experience */}
        <ImageBackground
          source={require('../../assets/banner.png')}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            {/* Header with user greeting and logout */}
            <View style={styles.heroHeader}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.welcomeText}>{AppConfig.text.welcome.text}</Text>
                <Text style={styles.userName}>{user?.display_name || AppConfig.text.welcome.defaultUser}!</Text>
              </View>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <MaterialIcons name="logout" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Main VR Experience Section */}
            <View style={styles.vrExperienceSection}>
              <Text style={styles.heroTitle}>{AppConfig.text.hero.title1}</Text>
              <Text style={styles.heroTitle}>{AppConfig.text.hero.title2}</Text>
              <Text style={styles.heroSubtitle}>
                {AppConfig.text.hero.subtitle}
              </Text>
              
              <TouchableOpacity 
                style={[styles.startButton, { backgroundColor: AppConfig.colors.primary }]}
                onPress={() => {
                  if (tours.length > 0) {
                    showTourOptions(tours[0]);
                  }
                }}
              >
                <Text style={styles.startButtonText}>{AppConfig.text.hero.startButton}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* Popular Heritage Tours Section */}
        <View style={styles.toursSection}>
          <Text style={styles.sectionTitle}>{AppConfig.text.sections.popularTours}</Text>
          
          {tours.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>{AppConfig.text.empty.icon}</Text>
              <Text style={styles.emptyStateText}>{AppConfig.text.empty.tours}</Text>
              <Text style={styles.emptyStateSubtext}>
                {AppConfig.text.empty.toursSubtext}
              </Text>
            </View>
          ) : (
            <View style={styles.toursGrid}>
              {tours.map((tour) => {
                const isCached = cachedTours.has(tour.id);
                return (
                  <TouchableOpacity
                    key={tour.id}
                    style={styles.tourCard}
                    onPress={() => showTourOptions(tour)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tourImageContainer}>
                      {tour.thumbnail_url ? (
                        <Image
                          source={{ uri: tour.thumbnail_url }}
                          style={styles.tourImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={[AppConfig.colors.primary, AppConfig.colors.accent]}
                          style={styles.placeholderImage}
                        >
                          <Text style={styles.placeholderText}>🏛️</Text>
                        </LinearGradient>
                      )}
                      
                      {/* Play button overlay */}
                      <View style={styles.playButtonOverlay}>
                        <View style={[styles.playButton, { backgroundColor: AppConfig.colors.primary }]}>
                          <Text style={styles.playButtonText}>▶</Text>
                        </View>
                      </View>

                      {/* Cache status */}
                      <View style={styles.cacheIndicator}>
                        <View style={[
                          styles.cacheStatus,
                          { backgroundColor: isCached ? '#10b981' : '#f59e0b' }
                        ]}>
                          <Text style={styles.cacheStatusText}>
                            {isCached ? '✓' : '↓'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Tour info */}
                    <View style={styles.tourInfo}>                      
                      <Text style={styles.tourTitle} numberOfLines={2}>
                        {tour.title}
                      </Text>
                      
                      <Text style={styles.tourDescription} numberOfLines={2}>
                        {tour.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Download Progress Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={downloadModal.visible}
        onRequestClose={cancelDownload}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModal}>
            <Text style={styles.downloadModalTitle}>
              Downloading {downloadModal.tourTitle}
            </Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${downloadModal.progress.percentage}%`,
                      backgroundColor: AppConfig.colors.primary 
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {downloadModal.progress.percentage}%
              </Text>
            </View>

            <Text style={styles.progressDetails}>
              {downloadModal.progress.downloaded} of {downloadModal.progress.total} files
            </Text>
            
            <Text style={styles.currentFile} numberOfLines={1}>
              {downloadModal.progress.currentFile}
            </Text>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: '#ef4444' }]}
              onPress={cancelDownload}
            >
              <Text style={styles.cancelButtonText}>{AppConfig.text.download.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  heroContainer: {
    height: 500,
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vrExperienceSection: {
    alignItems: 'center',
    marginVertical: 40,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tourCounter: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  tourCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toursSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  toursGrid: {
    gap: 20,
  },
  tourCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  tourImageContainer: {
    height: 200,
    position: 'relative',
  },
  tourImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 3,
  },
  vrLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vrLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cacheIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  cacheStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cacheStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tourInfo: {
    padding: 16,
  },
  tourLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  tourDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  downloadModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  downloadModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    minWidth: 40,
  },
  progressDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  currentFile: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
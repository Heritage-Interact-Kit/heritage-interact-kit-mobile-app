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
  Linking,
  Platform,
} from 'react-native';
import { apiService } from '../services/api';
import { tourAssetDownloader } from '../services/tourAssetDownloader';
import { TourDetails, TourObject, Asset } from '../types/api';
import { AppConfig } from '../config/app';
import { AudioPlayer } from '../components/AudioPlayer';
import { VideoPlayer } from '../components/VideoPlayer';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TourScreenProps {
  route: any;
  navigation: any;
}

export const TourScreen: React.FC<TourScreenProps> = ({ route, navigation }) => {
  const { tourId, tourTitle, useCachedData } = route.params;
  const [tour, setTour] = useState<TourDetails | null>(null);
  const [selectedObject, setSelectedObject] = useState<TourObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [cachedData, setCachedData] = useState<any>(null);

  useEffect(() => {
    navigation.setOptions({ title: tourTitle });
    loadTourDetails();
  }, [tourId, tourTitle, navigation, useCachedData]);

  // Handle reopening the object modal when coming back from ObjectInteractScreen
  useEffect(() => {
    if (route.params?.reopenObjectModal && route.params?.selectedObjectId && tour) {
      const objectToReopen = tour.objects.find(obj => obj.id === route.params.selectedObjectId);
      if (objectToReopen) {
        setSelectedObject(objectToReopen);
        setModalVisible(true);
        // Clear the parameters to avoid reopening on subsequent renders
        navigation.setParams({ 
          reopenObjectModal: undefined, 
          selectedObjectId: undefined 
        });
      }
    }
  }, [route.params?.reopenObjectModal, route.params?.selectedObjectId, tour, navigation]);

  const loadTourDetails = async () => {
    try {
      if (useCachedData) {
        // Try to load from cache first
        const cached = await tourAssetDownloader.getCachedTourData(tourId);
        if (cached) {
          setTour(cached.tourDetails);
          setCachedData(cached);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to API if no cached data or not using cache
      const response = await apiService.getTourDetails(tourId);
      setTour(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load tour details');
      console.error('Failed to load tour details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // For refresh, always fetch from API to get latest data
    try {
      const response = await apiService.getTourDetails(tourId);
      setTour(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to refresh tour details');
      console.error('Failed to refresh tour details:', error);
    }
    setRefreshing(false);
  };

  const openObjectModal = (object: TourObject) => {
    setSelectedObject(object);
    setModalVisible(true);
  };

  const closeObjectModal = () => {
    setModalVisible(false);
    setSelectedObject(null);
  };

  const handleInteract = () => {
    if (selectedObject && selectedObject.assets && selectedObject.assets.length > 0) {
      // Navigate with the first asset if available
      navigation.navigate('ObjectInteract', {
        object: selectedObject,
        asset: selectedObject.assets[0], // Use first asset
        cachedData: cachedData,
      });
      closeObjectModal();
    } else {
      Alert.alert('No Assets', 'This object has no interactive assets available.');
    }
  };

  const handleAssetInteract = (asset: Asset) => {
    if (selectedObject) {
      // Navigate for non-audio assets (audio assets now show players directly)
      navigation.navigate('ObjectInteract', {
        object: selectedObject,
        asset: asset, // Pass the specific asset
        cachedData: cachedData,
      });
      closeObjectModal();
    }
  };

  const handleTasks = () => {
    // TODO: Implement tasks feature
    Alert.alert('Tasks', 'Tasks feature will be implemented in the future');
  };

  const handleTaskPress = (task: any) => {
    navigation.navigate('Task', {
      taskId: task.id,
      taskTitle: task.title,
    });
    closeObjectModal();
  };

  const handleNavigateToLocation = (lat: number, lng: number, title: string) => {
    const destination = `${lat},${lng}`;
    const label = encodeURIComponent(title);
    
    // Create different URLs based on platform
    let url: string;
    
    if (Platform.OS === 'ios') {
      // For iOS, use Apple Maps
      url = `http://maps.apple.com/?daddr=${destination}&q=${label}`;
    } else {
      // For Android, use Google Maps
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`;
    }
    
    // Try to open the maps app
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback to Google Maps web version
          const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
          return Linking.openURL(fallbackUrl);
        }
      })
      .catch((err) => {
        Alert.alert('Error', 'Unable to open maps application');
        console.error('Failed to open maps:', err);
      });
  };

  const getInteractionMethodText = (method: string | undefined) => {
    switch (method) {
      case 'place_on_plane':
        return 'Place on Surface';
      case 'show_on_marker':
        return 'Show on Marker';
      case 'show_directly':
        return 'Show in AR';
      default:
        return 'View in AR';
    }
  };

  // Helper function to get the correct image source
  const getImageSource = (remoteUrl: string | undefined) => {
    if (!remoteUrl) return undefined;
    
    if (cachedData) {
      const localPath = tourAssetDownloader.getLocalPath(remoteUrl, cachedData);
      if (localPath) {
        return { uri: localPath };
      }
    }
    
    // Fallback to remote URL
    return { uri: remoteUrl };
  };

  // Helper function to check if image source is valid
  const hasValidImageSource = (remoteUrl: string | undefined) => {
    return !!remoteUrl;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading tour details...</Text>
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tour not found</Text>
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
        {/* Hero Banner */}
        <ImageBackground
          source={require('../../assets/banner.png')}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{tour.title}</Text>
              <Text style={styles.heroDescription}>{tour.description}</Text>
              
              {/* Cache Status Indicator */}
              {cachedData && (
                <View style={styles.offlineIndicator}>
                  <Text style={styles.offlineText}>📱 Available Offline</Text>
                </View>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* Objects Section */}
        <View style={styles.objectsContainer}>
          <Text style={styles.sectionTitle}>Explore Objects</Text>
          
          {tour.objects.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No objects in this tour</Text>
              <Text style={styles.emptyStateSubtext}>
                Objects will be added soon
              </Text>
            </View>
          ) : (
            <View style={styles.objectsGrid}>
              {tour.objects.map((object) => (
                <TouchableOpacity
                  key={object.id}
                  style={styles.objectCard}
                  onPress={() => openObjectModal(object)}
                >
                  {hasValidImageSource(object.thumbnail_url) ? (
                    <Image
                      source={getImageSource(object.thumbnail_url)}
                      style={styles.objectImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Text style={styles.placeholderText}>Object</Text>
                    </View>
                  )}
                  
                  <View style={styles.objectContent}>
                    <Text style={styles.objectTitle} numberOfLines={2}>
                      {object.title}
                    </Text>
                    <Text style={styles.objectDescription} numberOfLines={3}>
                      {object.description}
                    </Text>
                    
                    <View style={styles.objectFooter}>
                      <Text style={styles.viewText}>View Details →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Object Detail Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeObjectModal}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeObjectModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedObject && (
              <>
                {/* Object Image */}
                {hasValidImageSource(selectedObject.thumbnail_url) ? (
                  <Image
                    source={getImageSource(selectedObject.thumbnail_url)}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalPlaceholderImage}>
                    <Text style={styles.modalPlaceholderText}>Object Image</Text>
                  </View>
                )}

                {/* Object Details */}
                <View style={styles.modalDetailsContainer}>
                  <Text style={styles.modalTitle}>{selectedObject.title}</Text>
                  <Text style={styles.modalDescription}>
                    {selectedObject.description}
                  </Text>

                  {/* Location Info */}
                  {selectedObject.lat && selectedObject.lng && (
                    <View style={styles.locationContainer}>
                      <Text style={styles.locationTitle}>Location</Text>
                      <TouchableOpacity
                        style={styles.navigationButtonContainer}
                        onPress={() => 
                          handleNavigateToLocation(
                            selectedObject.lat!,
                            selectedObject.lng!,
                            selectedObject.title
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[AppConfig.colors.primary, AppConfig.colors.primary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.navigationButton}
                        >
                          <View style={styles.navigationIconContainer}>
                            <MaterialIcons 
                              name="navigation" 
                              size={20} 
                              color="#ffffff" 
                            />
                          </View>
                          <View style={styles.navigationTextContainer}>
                            <Text style={styles.navigationButtonText}>Navigate</Text>
                            <Text style={styles.navigationButtonSubtext}>Open in Maps</Text>
                          </View>
                          <MaterialIcons 
                            name="arrow-forward-ios" 
                            size={16} 
                            color="#ffffff" 
                            style={styles.navigationArrow}
                          />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Assets Section */}
                  {selectedObject?.assets && selectedObject.assets.length > 0 && (
                    <View style={styles.assetsSection}>
                      <Text style={styles.assetsSectionTitle}>Available Interactive Media</Text>
                      <View style={styles.assetsList}>
                        {selectedObject.assets.map((asset) => (
                          <View key={asset.id}>
                             {hasValidImageSource(asset.thumbnail_image_url) && (
                                <View>
                                  <Image
                                    source={getImageSource(asset.thumbnail_image_url)}
                                    style={styles.assetItemImage}
                                    resizeMode="contain"
                                  />
                                </View>
                              )}
                              <View style={styles.assetItemContent}>
                              <Text style={styles.assetItemTitle} numberOfLines={2}>
                                {asset.title}
                              </Text>
                              <Text style={styles.assetItemDescription} numberOfLines={2}>
                                {asset.description}
                              </Text>
                            </View>
                            {/* Show Audio Player directly for audio assets */}
                            {asset.audio_url && (
                              <AudioPlayer
                                audioUrl={getImageSource(asset.audio_url)?.uri || asset.audio_url}
                                title={asset.title}
                                artist={selectedObject.title}
                              />
                            )}
                            {/* Show Video Player directly for video assets */}
                            {asset.video_url && (
                              <VideoPlayer
                                videoUrl={getImageSource(asset.video_url)?.uri || asset.video_url}
                                title={asset.title}
                                artist={selectedObject.title}
                              />
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  {selectedObject?.assets && selectedObject.assets.length > 0 && (
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.interactButton]}
                        onPress={handleInteract}
                      >
                        <View style={styles.buttonContent}>
                          <MaterialIcons 
                            name="view-in-ar" 
                            size={20} 
                            color="#ffffff" 
                            style={styles.buttonIcon}
                          />
                          <Text style={styles.actionButtonText}>View 3D Model</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Tasks Section */}
                  {selectedObject?.tasks && selectedObject.tasks.length > 0 && (
                    <View style={styles.tasksSection}>
                      <Text style={styles.tasksSectionTitle}>Available Tasks</Text>
                      <View style={styles.tasksList}>
                        {selectedObject.tasks.map((task) => (
                          <TouchableOpacity
                            key={task.id}
                            style={styles.taskItem}
                            onPress={() => handleTaskPress(task)}
                          >
                            {hasValidImageSource(task.thumbnail_url) ? (
                              <Image
                                source={getImageSource(task.thumbnail_url)}
                                style={styles.taskItemImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.taskItemPlaceholder}>
                                <Text style={styles.taskItemPlaceholderText}>📋</Text>
                              </View>
                            )}
                            <View style={styles.taskItemContent}>
                              <Text style={styles.taskItemTitle} numberOfLines={2}>
                                {task.title}
                              </Text>
                              <Text style={styles.taskItemDescription} numberOfLines={2}>
                                {task.description}
                              </Text>
                              <Text style={styles.taskItemAction}>Start Task →</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
  heroContainer: {
    minHeight: 250,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: '#e5e7eb',
    lineHeight: 24,
    marginBottom: 20,
  },
  offlineIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  objectsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  },
  objectsGrid: {
    gap: 16,
  },
  objectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  objectImage: {
    width: '100%',
    height: 200,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  objectContent: {
    padding: 16,
  },
  objectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  objectDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  objectFooter: {
    alignItems: 'flex-end',
  },
  viewText: {
    fontSize: 14,
    color: AppConfig.colors.primary,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
    backgroundColor: AppConfig.colors.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalImage: {
    width: '100%',
    height: 300,
  },
  modalPlaceholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlaceholderText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalDetailsContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  locationContainer: {
    marginBottom: 32,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  navigationButtonContainer: {
    alignSelf: 'stretch',
    borderRadius: 12,
    shadowColor: AppConfig.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  navigationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  navigationTextContainer: {
    flex: 1,
    marginLeft: 4,
  },
  navigationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navigationButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  navigationArrow: {
    opacity: 0.8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  interactButton: {
    backgroundColor: AppConfig.colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tasksButton: {
    backgroundColor: AppConfig.colors.accent,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  tasksSection: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tasksSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  taskItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  taskItemPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  taskItemPlaceholderText: {
    fontSize: 24,
    color: '#6b7280',
  },
  taskItemContent: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  taskItemAction: {
    fontSize: 14,
    color: AppConfig.colors.primary,
    fontWeight: '600',
  },
  // New styles for Assets Section
  assetsSection: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  assetsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  assetsList: {
    gap: 12,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  assetItemImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 6,
  },
  assetItemPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  assetItemPlaceholderText: {
    fontSize: 24,
    color: '#6b7280',
  },
  assetItemContent: {
    flex: 1,
  },
  assetItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  assetItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  assetItemAction: {
    fontSize: 12,
    color: AppConfig.colors.primary,
    fontWeight: '600',
  },
  audioIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioIndicatorText: {
    fontSize: 16,
  },
}); 
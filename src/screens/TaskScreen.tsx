import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { apiService } from '../services/api';
import { imageUploadService } from '../services/imageUpload';
import { Task, TourObject } from '../types/api';
import { AppConfig } from '../config/app';

interface TaskScreenProps {
  route: any;
  navigation: any;
}

export const TaskScreen: React.FC<TaskScreenProps> = ({ route, navigation }) => {
  const { taskId, taskTitle } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [taskObject, setTaskObject] = useState<TourObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: taskTitle || 'Task Details' });
    loadTaskDetails();
  }, [taskId, taskTitle, navigation]);

  const loadTaskDetails = async () => {
    try {
      const response = await apiService.getTaskDetails(taskId);

      console.log('Task details response:', response.data);
      
      setTask(response.data);
      
      // The task might include object info based on API docs
      if (response.data.object) {
        setTaskObject(response.data.object);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load task details');
      console.error('Failed to load task details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      // Request media library permissions only
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need camera roll permissions to select images.');
        return false;
      }
    }
    return true;
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      // Request camera permissions only
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need camera permissions to take photos.');
        return false;
      }
    }
    return true;
  };

  const selectImages = async () => {
    // Only request media library permission for selecting photos
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...imageUris]);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const takePhoto = async () => {
    // Only request camera permission when taking photos
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please check camera permissions.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!task) return;

    if (!remarks.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please add some text or select images before submitting.');
      return;
    }

    setIsSubmitting(true);
    let uploadedImageUrls: string[] = [];

    try {
      // Upload images to Supabase if any are selected
      if (selectedImages.length > 0) {
        setIsUploadingImages(true);
        console.log('Uploading images to Supabase...');
        
        const uploadResults = await imageUploadService.uploadMultipleImages(selectedImages);
        uploadedImageUrls = uploadResults.map(result => result.url);
        
        console.log('Images uploaded successfully:', uploadedImageUrls);
        setIsUploadingImages(false);
      }

      // Submit the task with cloud URLs
      await apiService.createSubmission({
        task_id: task.id,
        remarks: remarks.trim(),
        submitted_files: uploadedImageUrls, // Now using cloud URLs instead of local URIs
      });

      Alert.alert(
        'Success',
        'Task submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit task:', error);
      
      if (error.message?.includes('Upload failed')) {
        Alert.alert('Error', 'Failed to upload images. Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to submit task. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingImages(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppConfig.colors.primary} />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={20}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{task.title}</Text>
        {taskObject && (
          <Text style={styles.headerSubtitle}>
            From: {taskObject.title}
          </Text>
        )}
      </View>

      {/* Task Image Card */}
      {task.detailed_img_url || task.thumbnail_url ? (
        <View style={styles.imageCard}>
          <Image
            source={{ uri: task.detailed_img_url || task.thumbnail_url }}
            style={styles.taskImage}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={styles.imageCard}>
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>📋</Text>
          </View>
        </View>
      )}

      {/* Description Card */}
      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionTitle}>Description</Text>
        <Text style={styles.description}>{task.description}</Text>
      </View>

      {/* Submission Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Submit Your Response</Text>
        
        {/* Text Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Comments</Text>
          <TextInput
            style={[
              styles.textInput,
              isInputFocused && styles.textInputFocused
            ]}
            value={remarks}
            onChangeText={setRemarks}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Share your thoughts, observations, or answers..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.inputLabel}>Photos</Text>
          
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={[styles.photoButton]} 
              onPress={takePhoto}
            >
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.photoButton]} 
              onPress={selectImages}
            >
              <Text style={styles.photoButtonIcon}>🖼️</Text>
              <Text style={styles.photoButtonText}>Select Photos</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Images */}
          {selectedImages.length > 0 && (
            <View style={styles.selectedImagesContainer}>
              <Text style={styles.selectedImagesTitle}>Selected Photos ({selectedImages.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesRow}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.selectedImageContainer}>
                      <Image source={{ uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton, 
            (isSubmitting || isUploadingImages) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isUploadingImages}
        >
          {isSubmitting || isUploadingImages ? (
            <View style={styles.submitButtonContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitButtonText}>
                {isUploadingImages ? 'Uploading Images...' : 'Submitting...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Task</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
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
    fontWeight: '500',
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
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: AppConfig.colors.primary,
    fontWeight: '500',
  },
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  taskImage: {
    width: '100%',
    height: 200,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fafbfc',
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    lineHeight: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  textInputFocused: {
    borderColor: AppConfig.colors.primary,
    borderWidth: 2,
    shadowColor: AppConfig.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  photoSection: {
    marginBottom: 32,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  photoButtonIcon: {
    fontSize: 20,
    marginBottom: 6,
    opacity: 0.8,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedImagesContainer: {
    marginTop: 16,
  },
  selectedImagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  selectedImageContainer: {
    position: 'relative',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: AppConfig.colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: AppConfig.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
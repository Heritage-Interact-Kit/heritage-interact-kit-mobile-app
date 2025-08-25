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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { Submission } from '../types/api';
import { AppConfig } from '../config/app';

const { width } = Dimensions.get('window');

interface TasksScreenProps {
  navigation: any;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ navigation }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await apiService.getUserSubmissions();
      setSubmissions(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load submissions');
      console.error('Failed to load submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    setRefreshing(false);
  };

  const handleTaskPress = (submission: Submission) => {
    if (submission.task) {
      navigation.navigate('Task', {
        taskId: submission.task.id,
        taskTitle: submission.task.title,
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppConfig.colors.primary} />
        <Text style={styles.loadingText}>Loading your tasks...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with VR Theme */}
      <LinearGradient
        colors={[AppConfig.colors.primary, AppConfig.colors.accent]}
        style={styles.headerContainer}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSubtitle}>
            Track your heritage exploration progress
          </Text>
          
          {/* Stats Card */}
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <Text style={styles.statsNumber}>{submissions.length}</Text>
              <Text style={styles.statsLabel}>Completed</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsNumber}>
                {submissions.reduce((total, sub) => total + sub.submitted_files.length, 0)}
              </Text>
              <Text style={styles.statsLabel}>Photos</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsNumber}>
                {new Set(submissions.map(sub => sub.object?.title)).size}
              </Text>
              <Text style={styles.statsLabel}>Objects</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tasks Section */}
      <View style={styles.tasksContainer}>
        <Text style={styles.sectionTitle}>RECENT SUBMISSIONS</Text>
        
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[AppConfig.colors.primary + '20', AppConfig.colors.accent + '20']}
              style={styles.emptyStateGradient}
            >
              <Text style={styles.emptyStateIcon}>📋</Text>
            </LinearGradient>
            <Text style={styles.emptyStateText}>No submissions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Complete tasks from heritage tours to track your progress here
            </Text>
          </View>
        ) : (
          <View style={styles.submissionsGrid}>
            {submissions.map((submission) => (
              <TouchableOpacity 
                key={submission.id} 
                style={styles.submissionCard}
                onPress={() => handleTaskPress(submission)}
                activeOpacity={0.8}
              >
                {/* Task Header */}
                <View style={styles.taskHeader}>
                  <View style={styles.taskImageContainer}>
                    {submission.task?.thumbnail_url ? (
                      <Image
                        source={{ uri: submission.task.thumbnail_url }}
                        style={styles.taskImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[AppConfig.colors.primary, AppConfig.colors.accent]}
                        style={styles.placeholderImage}
                      >
                        <Text style={styles.placeholderText}>📋</Text>
                      </LinearGradient>
                    )}
                    
                    {/* Status badge */}
                    <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.statusText}>✓</Text>
                    </View>
                  </View>
                  
                  <View style={styles.taskInfoContent}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {submission.task?.title || 'Unknown Task'}
                    </Text>
                    <Text style={styles.objectTitle} numberOfLines={1}>
                      📍 {submission.object?.title || 'Unknown Object'}
                    </Text>
                    <Text style={styles.submissionDate}>
                      Completed {formatDate(submission.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Submission Content */}
                <View style={styles.submissionContent}>
                  {submission.remarks && (
                    <Text style={styles.submissionRemarks} numberOfLines={3}>
                      "{submission.remarks}"
                    </Text>
                  )}

                  {/* Photos preview */}
                  {submission.submitted_files.length > 0 && (
                    <View style={styles.photosSection}>
                      <View style={styles.photosHeader}>
                        <Text style={styles.photosLabel}>
                          📸 {submission.submitted_files.length} photo{submission.submitted_files.length > 1 ? 's' : ''} uploaded
                        </Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.photosPreview}>
                          {submission.submitted_files.slice(0, 4).map((fileUrl, index) => (
                            <View key={index} style={styles.photoContainer}>
                              <Image
                                source={{ uri: fileUrl }}
                                style={styles.photoPreview}
                                resizeMode="cover"
                              />
                            </View>
                          ))}
                          {submission.submitted_files.length > 4 && (
                            <View style={[styles.photoContainer, styles.morePhotosIndicator]}>
                              <Text style={styles.morePhotosText}>
                                +{submission.submitted_files.length - 4}
                              </Text>
                            </View>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Action footer */}
                  <View style={styles.actionFooter}>
                    <Text style={[styles.viewTaskText, { color: AppConfig.colors.primary }]}>
                      View Task Details →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
  headerContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  tasksContainer: {
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
  emptyStateGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  submissionsGrid: {
    gap: 20,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  taskImageContainer: {
    width: 70,
    height: 70,
    position: 'relative',
  },
  taskImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskInfoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 22,
  },
  objectTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  submissionDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  submissionContent: {
    padding: 16,
  },
  submissionRemarks: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: 'italic',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: AppConfig.colors.primary,
  },
  photosSection: {
    marginBottom: 16,
  },
  photosHeader: {
    marginBottom: 12,
  },
  photosLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  photosPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  photoContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  morePhotosIndicator: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  actionFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  viewTaskText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 
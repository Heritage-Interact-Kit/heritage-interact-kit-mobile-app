import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { UserReward } from '../types/api';
import { AppConfig } from '../config/app';

const { width } = Dimensions.get('window');

interface MyRewardsScreenProps {
  navigation: any;
}

export const MyRewardsScreen: React.FC<MyRewardsScreenProps> = ({ navigation }) => {
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      // Only load badge rewards for initial launch
      const response = await apiService.getUserRewards({ reward_type: 'badge' });

      setRewards(response.data || []);
    } catch (error: any) {
      console.error('Failed to load rewards:', error);
      Alert.alert('Error', 'Failed to load rewards. Please try again.');
      setRewards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRewards();
    setIsRefreshing(false);
  }, []);

  const handleRewardPress = (reward: UserReward) => {
    if (!reward.reward) {
      Alert.alert('Error', 'Reward information is not available.');
      return;
    }
    
    Alert.alert(
      reward.reward.title,
      `${reward.reward.description}\n\nEarned: ${new Date(reward.claimed_at).toLocaleDateString()}\nStatus: ${reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}`
    );
  };

  const getRewardTypeIcon = (type: string) => {
    // For initial launch, only badge rewards
    return '🏆';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      claimed: '#10b981',
      redeemed: '#f59e0b',
      expired: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };



  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppConfig.colors.primary} />
        <Text style={styles.loadingText}>Loading your rewards...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header with gradient background */}
      <LinearGradient
        colors={[AppConfig.colors.primary, AppConfig.colors.accent]}
        style={styles.headerContainer}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Badges</Text>
          <Text style={styles.headerSubtitle}>
            {rewards.length > 0 
              ? `${rewards.length} badge${rewards.length === 1 ? '' : 's'} earned` 
              : 'Your earned badges from heritage exploration'}
          </Text>
        </View>
      </LinearGradient>

      {/* Rewards Section */}
      <View style={styles.rewardsContainer}>
        <Text style={styles.sectionTitle}>YOUR BADGE COLLECTION</Text>
        
        {rewards.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[AppConfig.colors.primary + '20', AppConfig.colors.accent + '20']}
              style={styles.emptyStateGradient}
            >
              <Text style={styles.emptyStateIcon}>🏆</Text>
            </LinearGradient>
            <Text style={styles.emptyStateTitle}>No badges yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Complete heritage tours and tasks to earn your first badge!
            </Text>
          </View>
        ) : (
          <View style={styles.rewardsGrid}>
            {rewards.filter(userReward => userReward.reward).map((userReward) => (
              <TouchableOpacity
                key={userReward.id}
                style={styles.rewardCard}
                onPress={() => handleRewardPress(userReward)}
                activeOpacity={0.8}
              >
                {/* Reward Image with overlay */}
                <View style={styles.rewardImageContainer}>
                  {userReward.reward.thumbnail_url ? (
                    <>
                      <Image
                        source={{ uri: userReward.reward.thumbnail_url }}
                        style={styles.rewardImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
                        style={styles.imageOverlay}
                      />
                    </>
                  ) : (
                    <LinearGradient
                      colors={[AppConfig.colors.primary, AppConfig.colors.accent]}
                      style={styles.placeholderImage}
                    >
                      <Text style={styles.placeholderIcon}>
                        {getRewardTypeIcon(userReward.reward.reward_type)}
                      </Text>
                    </LinearGradient>
                  )}
                  
                  {/* Status Badge */}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(userReward.status) }
                  ]}>
                    <Text style={styles.statusText}>
                      {userReward.status === 'claimed' ? '✓' : userReward.status === 'redeemed' ? '★' : '!'}
                    </Text>
                  </View>

                  {/* Reward Title Overlay */}
                  <View style={styles.titleOverlay}>
                    <Text style={styles.overlayTitle} numberOfLines={2}>
                      {userReward.reward.title}
                    </Text>
                  </View>
                </View>

                {/* Reward Info */}
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardDescription} numberOfLines={2}>
                    {userReward.reward.description}
                  </Text>
                  
                  {/* Earned Info */}
                  <View style={styles.earnedInfo}>
                    <Text style={styles.earnedDate}>
                      Earned {new Date(userReward.claimed_at).toLocaleDateString()}
                    </Text>
                    {userReward.reward.task && (
                      <Text style={[styles.earnedSource, { color: AppConfig.colors.primary }]}>
                        From: {userReward.reward.task.title}
                      </Text>
                    )}
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
    fontWeight: '500',
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
    fontWeight: '500',
  },
  rewardsContainer: {
    padding: 20,
    paddingTop: 20,
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
  emptyStateTitle: {
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
  rewardsGrid: {
    gap: 20,
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  rewardImageContainer: {
    position: 'relative',
    height: 240,
  },
  rewardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rewardInfo: {
    padding: 20,
  },
  rewardDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  earnedInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  earnedDate: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 6,
    fontWeight: '500',
  },
  earnedSource: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
}); 
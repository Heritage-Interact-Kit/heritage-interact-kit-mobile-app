import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  SignupRequest,
  Tour,
  TourDetails,
  TourObject,
  Task,
  Submission,
  SubmissionRequest,
  SiteSettings,
  UserReward,
  UserRewardsData,
  Reward,
} from '../types/api';
import { API_CONFIG, STORAGE_KEYS } from '../config/api';

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store session data
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.session.access_token);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.session.refresh_token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));

    return response;
  }

  async signup(userData: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.makeRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Store session data
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.session.access_token);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.session.refresh_token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));

    return response;
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN, 
      STORAGE_KEYS.REFRESH_TOKEN, 
      STORAGE_KEYS.USER
    ]);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  }

  async getCurrentUser() {
    const userString = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userString ? JSON.parse(userString) : null;
  }

  // Settings
  async getSettings(): Promise<ApiResponse<SiteSettings>> {
    return this.makeRequest<SiteSettings>('/settings');
  }

  // Tours
  async getTours(): Promise<ApiResponse<Tour[]>> {
    return this.makeRequest<Tour[]>('/tours');
  }

  async getTourDetails(id: number): Promise<ApiResponse<TourDetails>> {
    return this.makeRequest<TourDetails>(`/tours/${id}`);
  }

  // Objects
  async getObjectDetails(id: number): Promise<ApiResponse<TourObject>> {
    return this.makeRequest<TourObject>(`/objects/${id}`);
  }

  // Tasks
  async getUserTasks(showAll = false, objectId?: number): Promise<ApiResponse<Task[]>> {
    let endpoint = '/tasks/user';
    const params = new URLSearchParams();
    
    if (showAll) params.append('show_all', 'true');
    if (objectId) params.append('object_id', objectId.toString());
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.makeRequest<Task[]>(endpoint);
  }

  async getTaskDetails(id: number): Promise<ApiResponse<Task>> {
    return this.makeRequest<Task>(`/tasks/${id}`);
  }

  // Submissions
  async createSubmission(submission: SubmissionRequest): Promise<ApiResponse<Submission>> {
    return this.makeRequest<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getUserSubmissions(): Promise<ApiResponse<Submission[]>> {
    return this.makeRequest<Submission[]>('/submissions/user');
  }

  // Rewards
  async getUserRewards(params?: {
    status?: 'claimed' | 'redeemed' | 'expired';
    reward_type?: 'badge' | 'points' | 'item' | 'digital_content';
    obtained_via?: 'task_completion' | 'direct_claim';
  }): Promise<ApiResponse<UserReward[]>> {
    let endpoint = '/rewards/user';
    const searchParams = new URLSearchParams();
    
    if (params?.status) searchParams.append('status', params.status);
    if (params?.reward_type) searchParams.append('reward_type', params.reward_type);
    if (params?.obtained_via) searchParams.append('obtained_via', params.obtained_via);
    
    if (searchParams.toString()) {
      endpoint += `?${searchParams.toString()}`;
    }

    return this.makeRequest<UserReward[]>(endpoint);
  }

  async getRewardDetails(id: number): Promise<ApiResponse<Reward & { user_claim_status?: UserReward }>> {
    return this.makeRequest<Reward & { user_claim_status?: UserReward }>(`/rewards/${id}`);
  }
}

export const apiService = new ApiService(); 
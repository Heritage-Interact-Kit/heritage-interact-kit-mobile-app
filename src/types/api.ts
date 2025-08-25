export interface User {
  id: number;
  auth_user_id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  last_login_at: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  site_logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  settings: SiteSettings;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  display_name: string;
  username: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface Tour {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface Asset {
  id: number;
  title: string;
  description: string;
  model_url?: string;
  material_urls: string[];
  thumbnail_image_url?: string;
  folder_id: string;
  created_at: string;
  interaction_method?: 'place_on_plane' | 'show_on_marker' | 'show_directly';
  marker_image_url?: string;
  audio_url?: string;
  video_url?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  detailed_img_url?: string;
  created_at: string;
  object?: TourObject;
  hasSubmission: boolean;
}

export interface TourObject {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  lat?: number;
  lng?: number;
  created_at: string;
  assets?: Asset[];
  tasks?: Task[];
}

export interface TourDetails extends Tour {
  objects: TourObject[];
}

export interface Submission {
  id: number;
  task_id: number;
  object_id: number;
  end_user_id: number;
  remarks?: string;
  submitted_files: string[];
  created_at: string;
  updated_at: string;
  task?: Task;
  object?: TourObject;
}

export interface SubmissionRequest {
  task_id: number;
  remarks?: string;
  submitted_files: string[];
}

export interface Reward {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  reward_type: 'badge' | 'points' | 'item' | 'digital_content';
  task?: { id: number; title: string };
  object?: TourObject;
}

export interface UserReward {
  id: number;
  reward_id: number;
  end_user_id: number;
  obtained_via: 'task_completion' | 'direct_claim';
  submission_id?: number;
  status: 'claimed' | 'redeemed' | 'expired';
  claimed_at: string;
  reward: Reward;
  submission?: {
    id: number;
    created_at: string;
    remarks?: string;
  };
}

export interface RewardsStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_obtained_via: Record<string, number>;
}

export interface UserRewardsData {
  data: UserReward[];
  stats: RewardsStats;
} 
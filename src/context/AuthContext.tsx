import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import { User, SiteSettings } from '../types/api';

interface AuthContextType {
  user: User | null;
  settings: SiteSettings | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await apiService.isAuthenticated();
      if (authenticated) {
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Also fetch fresh settings
        try {
          const settingsResponse = await apiService.getSettings();
          setSettings(settingsResponse.settings);
        } catch (settingsError) {
          console.error('Error fetching settings:', settingsError);
          // Continue even if settings fetch fails
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({ email, password });
      setUser(response.data.user);
      setSettings(response.settings);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email: string, password: string, displayName: string, username: string) => {
    try {
      const response = await apiService.signup({
        email,
        password,
        display_name: displayName,
        username,
      });
      setUser(response.data.user);
      setSettings(response.settings);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setSettings(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value: AuthContextType = {
    user,
    settings,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TourDetails, TourObject, Asset, Task } from '../types/api';
import { apiService } from './api';

interface DownloadProgress {
  total: number;
  downloaded: number;
  currentFile: string;
  percentage: number;
}

interface CachedTourData {
  tourDetails: TourDetails;
  downloadedAt: string;
  localAssets: Record<string, string>; // URL -> local path mapping
}

export class TourAssetDownloader {
  private cacheDir = `${FileSystem.documentDirectory}tour_cache/`;
  private readonly CACHE_EXPIRY_HOURS = 24;
  private _cacheInitialized = false;

  constructor() {
    // Don't call async methods in constructor
  }

  private async ensureCacheDirectoryExists() {
    if (this._cacheInitialized) return;
    
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
    this._cacheInitialized = true;
  }

  /**
   * Download all assets for a tour with progress tracking
   */
  async downloadTourAssets(
    tourId: number, 
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<CachedTourData> {
    try {
      // Ensure cache directory exists before starting
      await this.ensureCacheDirectoryExists();
      
      // First, get tour details
      const tourResponse = await apiService.getTourDetails(tourId);
      const tourDetails = tourResponse.data;

      // Collect all assets to download
      const urlsToDownload = this.collectAllAssetUrls(tourDetails);
      
      let downloaded = 0;
      const total = urlsToDownload.length;
      const localAssets: Record<string, string> = {};

      onProgress?.({
        total,
        downloaded,
        currentFile: 'Starting download...',
        percentage: 0
      });

      // Download each asset
      for (const url of urlsToDownload) {
        if (url) {
          try {
            onProgress?.({
              total,
              downloaded,
              currentFile: this.getFileNameFromUrl(url),
              percentage: Math.round((downloaded / total) * 100)
            });

            const localPath = await this.downloadFile(url);
            localAssets[url] = localPath;
          } catch (error) {
            console.warn(`Failed to download ${url}:`, error);
            // Continue with other downloads even if one fails
          }
        }
        
        downloaded++;
        onProgress?.({
          total,
          downloaded,
          currentFile: downloaded < total ? 'Next file...' : 'Complete!',
          percentage: Math.round((downloaded / total) * 100)
        });
      }

      // Save cached tour data
      const cachedData: CachedTourData = {
        tourDetails,
        downloadedAt: new Date().toISOString(),
        localAssets
      };

      await AsyncStorage.setItem(
        `cached_tour_${tourId}`, 
        JSON.stringify(cachedData)
      );

      return cachedData;
    } catch (error) {
      console.error('Tour asset download failed:', error);
      throw error;
    }
  }

  /**
   * Check if tour assets are cached and not expired
   */
  async isTourCached(tourId: number): Promise<boolean> {
    try {
      const cachedDataString = await AsyncStorage.getItem(`cached_tour_${tourId}`);
      if (!cachedDataString) return false;

      const cachedData: CachedTourData = JSON.parse(cachedDataString);
      const downloadedAt = new Date(cachedData.downloadedAt);
      const expiryTime = new Date(downloadedAt.getTime() + (this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000));
      
      return new Date() < expiryTime;
    } catch (error) {
      console.error('Error checking tour cache:', error);
      return false;
    }
  }

  /**
   * Get cached tour data
   */
  async getCachedTourData(tourId: number): Promise<CachedTourData | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(`cached_tour_${tourId}`);
      if (!cachedDataString) return null;

      return JSON.parse(cachedDataString);
    } catch (error) {
      console.error('Error getting cached tour data:', error);
      return null;
    }
  }

  /**
   * Get local path for a remote URL
   */
  getLocalPath(remoteUrl: string, cachedData: CachedTourData): string | null {
    return cachedData.localAssets[remoteUrl] || null;
  }

  /**
   * Clear cache for a specific tour
   */
  async clearTourCache(tourId: number): Promise<void> {
    try {
      await this.ensureCacheDirectoryExists();
      await AsyncStorage.removeItem(`cached_tour_${tourId}`);
      
      // Also remove files from file system
      const tourCacheDir = `${this.cacheDir}tour_${tourId}/`;
      const dirInfo = await FileSystem.getInfoAsync(tourCacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(tourCacheDir);
      }
    } catch (error) {
      console.error('Error clearing tour cache:', error);
    }
  }

  /**
   * Clear all cached tours
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.ensureCacheDirectoryExists();
      // Get all keys and remove tour cache entries
      const keys = await AsyncStorage.getAllKeys();
      const tourCacheKeys = keys.filter(key => key.startsWith('cached_tour_'));
      await AsyncStorage.multiRemove(tourCacheKeys);

      // Remove cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDir);
      }
      
      await this.ensureCacheDirectoryExists();
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  private collectAllAssetUrls(tourDetails: TourDetails): string[] {
    const urls: string[] = [];

    // Tour thumbnail
    if (tourDetails.thumbnail_url) {
      urls.push(tourDetails.thumbnail_url);
    }

    // Object and asset URLs
    tourDetails.objects.forEach((object: TourObject) => {
      // Object thumbnail
      if (object.thumbnail_url) {
        urls.push(object.thumbnail_url);
      }

      // Asset URLs
      object.assets?.forEach((asset: Asset) => {
        if (asset.thumbnail_image_url) {
          urls.push(asset.thumbnail_image_url);
        }
        if (asset.model_url) {
          urls.push(asset.model_url);
        }
        if (asset.material_urls) {
          asset.material_urls.forEach(url => {
            if (url) urls.push(url);
          });
        }
        if (asset.marker_image_url) {
          urls.push(asset.marker_image_url);
        }
        if (asset.audio_url) {
          urls.push(asset.audio_url);
        }
        if (asset.video_url) {
          urls.push(asset.video_url);
        }
      });

      // Task URLs
      object.tasks?.forEach((task: Task) => {
        if (task.thumbnail_url) {
          urls.push(task.thumbnail_url);
        }
        if (task.detailed_img_url) {
          urls.push(task.detailed_img_url);
        }
      });
    });

    // Remove duplicates
    return Array.from(new Set(urls));
  }

  private async downloadFile(url: string): Promise<string> {
    await this.ensureCacheDirectoryExists();
    const fileName = this.getFileNameFromUrl(url);
    const localPath = `${this.cacheDir}${fileName}`;

    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      return localPath;
    }

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(url, localPath);
    
    if (downloadResult.status === 200) {
      return downloadResult.uri;
    } else {
      throw new Error(`Failed to download ${url}: Status ${downloadResult.status}`);
    }
  }

  private getFileNameFromUrl(url: string): string {
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Add timestamp to avoid conflicts
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    // Extract extension
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > 0) {
      const name = fileName.substring(0, dotIndex);
      const ext = fileName.substring(dotIndex);
      fileName = `${name}_${timestamp}_${randomId}${ext}`;
    } else {
      fileName = `${fileName}_${timestamp}_${randomId}`;
    }
    
    return fileName;
  }
}

export const tourAssetDownloader = new TourAssetDownloader(); 
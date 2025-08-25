import { supabase, STORAGE_BUCKET } from '../config/supabase';
import { Platform } from 'react-native';

export interface UploadResult {
  url: string;
  path: string;
}

export class ImageUploadService {
  /**
   * Upload an image to Supabase storage
   * @param uri - Local file URI from image picker
   * @param fileName - Custom filename (optional)
   * @returns Promise with the public URL and storage path
   */
  async uploadImage(uri: string, fileName?: string): Promise<UploadResult> {
    try {
      // Generate a unique filename if not provided
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const finalFileName = fileName || `image_${timestamp}_${randomId}.jpg`;
      
      // Create file path in storage
      const filePath = `task-submissions/${finalFileName}`;
      
      console.log('Starting upload for:', uri);
      
      let blob: Blob;
      
      if (Platform.OS === 'web') {
        // Web: use standard fetch
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // React Native: Use XMLHttpRequest for better local file handling
        blob = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() {
            resolve(xhr.response);
          };
          xhr.onerror = function() {
            reject(new Error('XMLHttpRequest failed'));
          };
          xhr.responseType = 'blob';
          xhr.open('GET', uri, true);
          xhr.send();
        });
      }
      
      console.log('Blob details:', {
        size: blob.size,
        type: blob.type || 'not set'
      });
      
      // Check if blob is empty
      if (blob.size === 0) {
        console.error('ERROR: Blob is empty! The image data was not properly fetched.');
        throw new Error('Failed to fetch image data - blob is empty');
      }
      
      // Additional debug: Check first few bytes to ensure it's image data
      if (blob.size > 0) {
        const slice = blob.slice(0, 4);
        const reader = new FileReader();
        reader.onload = () => {
          const arr = new Uint8Array(reader.result as ArrayBuffer);
          console.log('First 4 bytes:', Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(' '));
          // JPEG starts with FF D8, PNG starts with 89 50 4E 47
        };
        reader.readAsArrayBuffer(slice);
      }
      
      // For React Native, we need to convert blob to ArrayBuffer manually
      let uploadData: ArrayBuffer | Blob;
      
      if (Platform.OS === 'web') {
        // Web supports blob.arrayBuffer()
        uploadData = await blob.arrayBuffer();
        console.log('ArrayBuffer size:', uploadData.byteLength);
      } else {
        // React Native: Use FileReader to convert blob to ArrayBuffer
        uploadData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as ArrayBuffer;
            console.log('ArrayBuffer size:', result.byteLength);
            resolve(result);
          };
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsArrayBuffer(blob);
        });
      }
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, uploadData, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('Supabase upload error:', error);
        console.error('Error details:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: (error as any).error,
          details: (error as any).details
        });
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images concurrently
   * @param uris - Array of local file URIs
   * @returns Promise with array of upload results
   */
  async uploadMultipleImages(uris: string[]): Promise<UploadResult[]> {
    try {
      const uploadPromises = uris.map((uri, index) => 
        this.uploadImage(uri, `image_${Date.now()}_${index}.jpg`)
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Multiple image upload error:', error);
      throw error;
    }
  }

  /**
   * Delete an image from storage
   * @param path - Storage path of the image
   */
  async deleteImage(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Image delete error:', error);
      throw error;
    }
  }
}

export const imageUploadService = new ImageUploadService(); 
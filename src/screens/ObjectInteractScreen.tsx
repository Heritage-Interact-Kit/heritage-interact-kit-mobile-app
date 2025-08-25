import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView 
} from "react-native";
import { Asset } from "../types/api";
import { tourAssetDownloader } from "../services/tourAssetDownloader";
import { Model3DViewer } from "../components/Model3DViewer";
import { AppConfig } from "../config/app";

interface ObjectInteractScreenProps {
  route: any;
  navigation: any;
}

export const ObjectInteractScreen: React.FC<ObjectInteractScreenProps> = ({ 
  route, 
  navigation 
}) => {
  const { object, asset: initialAsset, cachedData } = route.params;
  const [asset, setAsset] = useState<Asset | undefined>(initialAsset);
  const [positionControls, setPositionControls] = useState<any>(null);

  React.useEffect(() => {
    setAsset(initialAsset);
  }, [initialAsset]);

  const handleBackPress = () => {
    // Audio player will be automatically cleaned up
    // Pass data back to TourScreen to reopen the modal
    navigation.navigate({
      name: 'Tour',
      params: {
        reopenObjectModal: true,
        selectedObjectId: object?.id,
      },
      merge: true,
    });
  };

  // Helper function to get local or remote asset URLs
  const getAssetUrl = (remoteUrl: string | undefined) => {
    if (!remoteUrl) {
      console.log('getAssetUrl: No remote URL provided');
      return undefined;
    }
    
    try {
      console.log('getAssetUrl: Processing URL:', remoteUrl);
      
      if (cachedData) {
        const localPath = tourAssetDownloader.getLocalPath(remoteUrl, cachedData);
        console.log('getAssetUrl: Local path from cache:', localPath);
        
        if (localPath) {
          console.log('getAssetUrl: Using local cached path:', localPath);
          return localPath;
        }
      }
      
      console.log('getAssetUrl: Using remote URL:', remoteUrl);
      return remoteUrl;
    } catch (error) {
      console.log('Error getting asset URL:', error);
      return remoteUrl;
    }
  };

  return (
    <View style={styles.container}>
      {/* 3D Model Viewer */}
      <View style={styles.modelContainer}>
        {asset ? (
          <Model3DViewer 
            asset={asset} 
            cachedData={cachedData}
            getAssetUrl={getAssetUrl}
            onPositionControlsReady={setPositionControls}
          />
        ) : (
          <View style={styles.noAssetContainer}>
            <Text style={styles.noAssetText}>No 3D model available</Text>
          </View>
        )}
        
        {/* Back Button Overlay */}
        <SafeAreaView style={styles.backButtonContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Title Overlay */}
        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.objectTitle}>{asset?.title || '3D Object'}</Text>
          <Text style={styles.instructionText}>
            {asset?.model_url ? 'Interactive 3D Model' : 'Placeholder Model'}
          </Text>
          {cachedData && (
            <Text style={styles.offlineText}>📱 Using offline assets</Text>
          )}
        </View>
        {/* Controls Overlay */}
        <View style={styles.controlPanel} pointerEvents="box-none">
          <View style={styles.positionOnlyContainer}>
            <View style={[styles.gridRow, { justifyContent: 'center' }]}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => positionControls?.moveLeft?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => positionControls?.moveRight?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => positionControls?.moveUp?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => positionControls?.moveDown?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>↓</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => positionControls?.zoomOut?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={() => positionControls?.zoomIn?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>＋</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              {/* <TouchableOpacity
                style={[styles.compactButton, styles.resetButton]}
                onPress={() => positionControls?.resetPosition?.()}
                disabled={!positionControls}
              >
                <Text style={styles.compactButtonText}>↺</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  modelContainer: {
    flex: 1,
    position: 'relative',
  },
  noAssetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noAssetText: {
    color: '#666',
    fontSize: 18,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
    padding: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  titleOverlay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1,
    paddingTop: 10
  },
  objectTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  offlineText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  positionOnlyContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  controlGrid: {
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  gridCell: {
    width: 32,
    height: 32,
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppConfig.colors.primary + '80', // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: AppConfig.colors.primary + '40', // 25% opacity
  },
  compactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: AppConfig.colors.primary + 'CC', // 80% opacity
    borderColor: AppConfig.colors.primary + '80', // 50% opacity
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  controlHint: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 0.8,
  },
});
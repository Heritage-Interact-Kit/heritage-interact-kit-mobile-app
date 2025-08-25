import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator, LayoutChangeEvent, Dimensions } from 'react-native';
import {
  FilamentScene,
  FilamentView,
  DefaultLight,
  Model as FilamentModel,
  Camera,
  useCameraManipulator,
} from 'react-native-filament';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-worklets-core';
import { Asset } from '../types/api';

interface Model3DViewerProps {
  asset: Asset;
  cachedData?: any;
  getAssetUrl: (url: string | undefined) => string | undefined;
  onPositionControlsReady?: (controls: {
    moveUp: () => void;
    moveDown: () => void;
    moveLeft: () => void;
    moveRight: () => void;
    resetPosition: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
  }) => void;
}

export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  asset,
  cachedData,
  getAssetUrl,
  onPositionControlsReady,
}) => {
  const [viewSize, setViewSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Moved reset logic into inner component where Filament context is available

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewSize({ width, height });
    if (!isReady && width > 0 && height > 0) setIsReady(true);
  }, [isReady]);

  const modelUrlRaw = asset.model_url ? getAssetUrl(asset.model_url) : undefined;
  const modelUrl = React.useMemo(() => {
    if (!modelUrlRaw) return undefined;
    if (modelUrlRaw.startsWith('http://') || modelUrlRaw.startsWith('https://') || modelUrlRaw.startsWith('file://')) {
      return modelUrlRaw;
    }
    // Local absolute path
    return `file://${modelUrlRaw}`;
  }, [modelUrlRaw]);

  const isGlbLike = (url: string | undefined) => (url ? url.toLowerCase().endsWith('.glb') || url.toLowerCase().includes('.glb?') : false);

  // Camera manipulator and gestures moved into inner component to ensure Filament context

  // Validate URL / extension
  React.useEffect(() => {
    if (!modelUrl) {
      setError(null);
      return;
    }
    if (!isGlbLike(modelUrl)) {
      setError('Only .glb models are supported by the 3D viewer');
    } else {
      setError(null);
    }
  }, [modelUrl]);

  if (!modelUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.noAssetContainer}>
          <Text style={styles.noAssetText}>No 3D model available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {!isReady && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4080ff" />
          <Text style={styles.loadingText}>Preparing 3D Viewer...</Text>
        </View>
      )}

      {isReady && modelUrl && (
        <FilamentScene>
          <FilamentContent
            modelUrl={modelUrl}
            viewSize={viewSize}
            onPositionControlsReady={onPositionControlsReady}
            hasError={error != null}
          />
        </FilamentScene>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
    </View>
  );
};

interface FilamentContentProps {
  modelUrl: string;
  viewSize: { width: number; height: number };
  onPositionControlsReady?: (controls: {
    moveUp: () => void;
    moveDown: () => void;
    moveLeft: () => void;
    moveRight: () => void;
    resetPosition: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
  }) => void;
  hasError: boolean;
}

const FilamentContent: React.FC<FilamentContentProps> = ({ modelUrl, viewSize, onPositionControlsReady, hasError }) => {
  // Camera manipulator for orbit controls (must be inside FilamentScene context)
  const cameraManipulator = useCameraManipulator({
    orbitHomePosition: [0, 0, 8],
    targetPosition: [0, 0, 0],
    upVector: [0, 1, 0],
    orbitSpeed: [0.003, 0.003],
    zoomSpeed: [0.01],
  });

  // Pan gesture
  const viewHeight = Dimensions.get('window').height
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      console.log('panGesture onBegin', event)
      const yCorrected = viewHeight - event.translationY
      cameraManipulator?.grabBegin(event.translationX, yCorrected, false) // false means rotation instead of translation
    })
    .onUpdate((event) => {
      const yCorrected = viewHeight - event.translationY
      cameraManipulator?.grabUpdate(event.translationX, yCorrected)
    })
    .maxPointers(1)
    .onEnd(() => {
      cameraManipulator?.grabEnd()
    })

  // Scale gesture
  const previousScale = useSharedValue(1)
  const scaleMultiplier = 100
  const pinchGesture = Gesture.Pinch()
    .onBegin(({ scale }) => {
      previousScale.value = scale
    })
    .onUpdate(({ scale, focalX, focalY }) => {
      const delta = scale - previousScale.value
      cameraManipulator?.scroll(focalX, focalY, -delta * scaleMultiplier)
      previousScale.value = scale
    })
  const combinedGesture = Gesture.Race(pinchGesture, panGesture);

  // Programmatic controls for buttons
  const performMove = React.useCallback((dx: number, dy: number) => {
    const anyManipulator = cameraManipulator as any
    try {
      const cx = viewSize.width * 0.5
      const cy = Math.max(0, viewSize.height - viewSize.height * 0.5)
      anyManipulator?.grabBegin?.(cx, cy, false)
      anyManipulator?.grabUpdate?.(cx + dx, cy + dy)
      anyManipulator?.grabEnd?.()
    } catch (e) {
      // no-op
    }
  }, [cameraManipulator, viewSize.width, viewSize.height])

  const moveLeft = React.useCallback(() => performMove(-40, 0), [performMove])
  const moveRight = React.useCallback(() => performMove(40, 0), [performMove])
  const moveUp = React.useCallback(() => performMove(0, 40), [performMove])
  const moveDown = React.useCallback(() => performMove(0, -40), [performMove])

  const resetPosition = React.useCallback(() => {
    const anyManipulator = cameraManipulator as any
    try {
      // Reset orbit home and target; jump to home resets rotation and zoom distance
      anyManipulator?.setOrbitHomePosition?.([0, 0, 8])
      anyManipulator?.setTargetPosition?.([0, 0, 0])
      anyManipulator?.setUpVector?.([0, 1, 0])
      if (anyManipulator?.jumpToHome) {
        anyManipulator.jumpToHome()
        return
      }
      const cx = viewSize.width * 0.5
      const cy = Math.max(0, viewSize.height - viewSize.height * 0.5)
      anyManipulator?.grabBegin?.(cx, cy, true)
      anyManipulator?.grabUpdate?.(cx, cy)
      anyManipulator?.grabEnd?.()
    } catch (e) {
      // no-op
    }
  }, [cameraManipulator, viewSize.width, viewSize.height])

  const zoomIn = React.useCallback(() => {
    try {
      const cx = viewSize.width * 0.5
      const cy = Math.max(0, viewSize.height - viewSize.height * 0.5)
      cameraManipulator?.scroll?.(cx, cy, -50)
    } catch (e) {}
  }, [cameraManipulator, viewSize.width, viewSize.height])

  const zoomOut = React.useCallback(() => {
    try {
      const cx = viewSize.width * 0.5
      const cy = Math.max(0, viewSize.height - viewSize.height * 0.5)
      cameraManipulator?.scroll?.(cx, cy, 50)
    } catch (e) {}
  }, [cameraManipulator, viewSize.width, viewSize.height])

  React.useEffect(() => {
    if (!onPositionControlsReady) return
    onPositionControlsReady({ moveUp, moveDown, moveLeft, moveRight, resetPosition, zoomIn, zoomOut })
  }, [onPositionControlsReady, moveUp, moveDown, moveLeft, moveRight, resetPosition, zoomIn, zoomOut])

  return (
    <View style={styles.canvasContainer}>
      <GestureDetector gesture={combinedGesture}>
        <FilamentView style={styles.canvas}>
          <Camera cameraManipulator={cameraManipulator} />
          <DefaultLight />
          {!hasError && (
            <FilamentModel source={{ uri: modelUrl }} castShadow receiveShadow transformToUnitCube />
          )}
        </FilamentView>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
});

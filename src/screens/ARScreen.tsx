import React, { useState } from "react";
import { StyleSheet } from "react-native";
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroARTrackingTargets,
  ViroARImageMarker,
  ViroSphere,
  ViroMaterials,
  ViroAnimations,
  ViroAmbientLight,
  ViroLightingEnvironment,
  ViroSpotLight,
  ViroQuad,
  Viro3DObject,
} from "@reactvision/react-viro";

ViroARTrackingTargets.createTargets({
  target: {
    source: require("../../assets/icon.png"),
    orientation: "Up",
    physicalWidth: 0.165, // real world width in meters
  },
});

ViroMaterials.createMaterials({
  white_sphere: {
    lightingModel: "PBR",
    diffuseColor: "rgb(131,131,131)",
  },
});

ViroAnimations.registerAnimations({
  scaleUp: {
    properties: { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 },
    duration: 500,
    easing: "bounce",
  },
});

const ARScene = () => {
  const [runAnimation, setRunAnimation] = useState(false);

  function onAnchorFound() {
    console.log("anchor found");
    setRunAnimation(true);
  }

  return (
    <ViroARScene>
      <ViroLightingEnvironment source={{
        uri: "https://github.com/viromedia/viro/raw/refs/heads/master/code-samples/js/ARCarDemo/res/tesla/garage_1k.hdr"
      }} />
      <ViroAmbientLight color="#ffffff" />
      <ViroARImageMarker target={"target"} onAnchorFound={onAnchorFound}>
      <Viro3DObject
        source={{
          uri: "https://useai4work.s3.ap-southeast-1.amazonaws.com/example/12140_Skull_v3_L2.obj"
        }}
        resources={[
            {
              uri: "https://useai4work.s3.ap-southeast-1.amazonaws.com/example/12140_Skull_v3_L2.mtl"
            },
            {
              uri: "https://useai4work.s3.ap-southeast-1.amazonaws.com/example/Skull.jpg"
            }
        ]}
        highAccuracyEvents={true}
        scale={[0, 0, 0]}
        animation={{ name: "scaleUp", run: runAnimation }}
        rotation={[0, 270, 180]}
        type="OBJ"
        position={[0, 0, 0]}
    />
      <ViroSpotLight
            innerAngle={5}
            outerAngle={25}
            direction={[0,-1,0]}
            position={[0, 5, 1]}
            color="#ffffff"
            castsShadow={true}
            shadowMapSize={2048}
            shadowNearZ={2}
            shadowFarZ={7}
            shadowOpacity={.7} />
      </ViroARImageMarker>
    </ViroARScene>
  );
};

export const ARScreen: React.FC = () => {
  return (
    <ViroARSceneNavigator
      autofocus={true}
      initialScene={{
        scene: ARScene,
      }}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
}); 
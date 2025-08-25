// Ensure Metro bundles .glb assets for react-native-filament
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'glb'];

module.exports = config;



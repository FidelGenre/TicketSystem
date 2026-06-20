const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('mov', 'mp4');

// @react-native-community/datetimepicker has no web build; alias to a stub
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName === '@react-native-community/datetimepicker'
  ) {
    return {
      filePath: path.resolve(__dirname, 'src/mocks/datetimepicker.web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

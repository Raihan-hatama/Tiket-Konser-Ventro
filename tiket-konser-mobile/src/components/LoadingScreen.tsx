import React from 'react';
import { ActivityIndicator, View } from 'react-native';

const LoadingScreen: React.FC = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color="#4F46E5" />
  </View>
);

export default LoadingScreen;

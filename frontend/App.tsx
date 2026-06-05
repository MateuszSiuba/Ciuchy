import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';

export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <BottomTabNavigator />
    </SafeAreaProvider>
  );
}

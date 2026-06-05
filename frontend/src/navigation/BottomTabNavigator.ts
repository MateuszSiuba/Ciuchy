/// <reference types="react" />

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { UploadScreen } from '../screens/UploadScreen';
import { WardrobeGalleryScreen } from '../screens/WardrobeGalleryScreen';
import { TryOnScreen } from '../screens/TryOnScreen';
import { StatsScreen } from '../screens/StatsScreen';

enableScreens(true);

const Tab = createBottomTabNavigator<BottomTabParamList>();

type BottomTabParamList = {
  Wardrobe: undefined;
  TryOn: undefined;
  Stats: undefined;
  'Add Item': undefined;
};

const DEMO_USER_ID = 'demo-user-id';
const NEON_LIME = '#D4FF00';

function AddItemTabScreen() {
  const navigation = useNavigation();

  return React.createElement(UploadScreen, {
    userId: DEMO_USER_ID,
    onUploaded: () => navigation.navigate('Wardrobe' as never)
  });
}

export function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  const baseTabHeight = 64;
  const paddingBottom = Math.max(10, insets.bottom ? insets.bottom : 10);

  return React.createElement(
    GestureHandlerRootView,
    { style: { flex: 1 } },
    React.createElement(
      NavigationContainer,
      null,
      React.createElement(
        Tab.Navigator,
        {
          initialRouteName: 'Wardrobe',
          children: [
            React.createElement(Tab.Screen, { key: 'Wardrobe', name: 'Wardrobe', component: WardrobeGalleryScreen, options: { title: 'Wardrobe' } }),
            React.createElement(Tab.Screen, { key: 'TryOn', name: 'TryOn', component: TryOnScreen, options: { title: 'Try On' } }),
            React.createElement(Tab.Screen, { key: 'Stats', name: 'Stats', component: StatsScreen, options: { title: 'Stats' } }),
            React.createElement(Tab.Screen, { key: 'Add Item', name: 'Add Item', component: AddItemTabScreen, options: { title: 'Add Item' } })
          ],
          screenOptions: ({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: NEON_LIME,
            tabBarInactiveTintColor: '#94a3b8',
            tabBarStyle: {
              borderTopColor: '#e2e8f0',
              backgroundColor: '#0b1220',
              height: baseTabHeight + paddingBottom,
              paddingTop: 8,
              paddingBottom
            },
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Wardrobe') {
                return React.createElement(Ionicons, { name: 'shirt-outline', color, size });
              }

              if (route.name === 'TryOn') {
                return React.createElement(Ionicons, { name: 'person-outline', color, size });
              }

              if (route.name === 'Stats') {
                return React.createElement(Ionicons, { name: 'stats-chart-outline', color, size });
              }

              return React.createElement(Ionicons, { name: 'add-circle-outline', color, size });
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600'
            }
          })
        }
      )
    )
  );
}
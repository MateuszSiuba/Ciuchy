/// <reference types="react" />

import React, { useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { UploadScreen } from '../screens/UploadScreen';
import { WardrobeGalleryScreen } from '../screens/WardrobeGalleryScreen';
import { TryOnScreen } from '../screens/TryOnScreen';
import { StatsScreen } from '../screens/StatsScreen';
import type { UserProfile } from '../services/api';

enableScreens(true);

const Tab = createBottomTabNavigator<BottomTabParamList>();

type BottomTabParamList = {
  Wardrobe: undefined;
  TryOn: undefined;
  Stats: undefined;
  'Add Item': undefined;
};

const NEON_LIME = '#D4FF00';

type BottomTabNavigatorProps = {
  user: UserProfile;
  onLogout: () => Promise<void> | void;
};

function AddItemTabScreen({ userId }: { userId: string }) {
  const navigation = useNavigation();

  return React.createElement(UploadScreen, {
    userId,
    onUploaded: () => navigation.navigate('Wardrobe' as never)
  });
}

function getAccountLabel(authType: string): string {
  switch (authType) {
    case 'EMAIL':
      return 'Email';
    case 'GOOGLE':
      return 'Google';
    case 'GUEST':
      return 'Gość';
    default:
      return authType;
  }
}

export function BottomTabNavigator({ user, onLogout }: BottomTabNavigatorProps) {
  const insets = useSafeAreaInsets();
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const baseTabHeight = 64;
  const paddingBottom = Math.max(10, insets.bottom ? insets.bottom : 10);

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      setProfileSheetVisible(false);
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  function renderAvatarButton(): React.ReactElement {
    const initial = user.name.trim().charAt(0).toUpperCase() || '?';

    return React.createElement(
      Pressable,
      { style: styles.avatarButton, onPress: () => setProfileSheetVisible(true) },
      React.createElement(Text, { style: styles.avatarLetter }, initial)
    );
  }

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
            React.createElement(Tab.Screen, {
              key: 'Wardrobe',
              name: 'Wardrobe',
              children: () => React.createElement(WardrobeGalleryScreen, { userId: user.id }),
              options: { title: 'Wardrobe' }
            }),
            React.createElement(Tab.Screen, {
              key: 'TryOn',
              name: 'TryOn',
              children: () => React.createElement(TryOnScreen, { userId: user.id }),
              options: { title: 'Try On' }
            }),
            React.createElement(Tab.Screen, {
              key: 'Stats',
              name: 'Stats',
              children: () => React.createElement(StatsScreen, { userId: user.id }),
              options: { title: 'Stats' }
            }),
            React.createElement(Tab.Screen, {
              key: 'Add Item',
              name: 'Add Item',
              children: () => React.createElement(AddItemTabScreen, { userId: user.id }),
              options: { title: 'Add Item' }
            })
          ],
          screenOptions: ({ route }) => ({
            headerShown: true,
            headerTitle: '',
            headerStyle: {
              backgroundColor: '#ffffff'
            },
            headerShadowVisible: false,
            headerRight: renderAvatarButton,
            tabBarStyle: {
              borderTopColor: '#e2e8f0',
              backgroundColor: '#0b1220',
              height: baseTabHeight + paddingBottom,
              paddingTop: 8,
              paddingBottom
            },
            tabBarActiveTintColor: NEON_LIME,
            tabBarInactiveTintColor: '#94a3b8',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600'
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
            }
          })
        }
      )
    ),
    React.createElement(
      Modal,
      {
        visible: profileSheetVisible,
        transparent: true,
        animationType: 'fade',
        onRequestClose: () => setProfileSheetVisible(false)
      },
      React.createElement(
        Pressable,
        { style: styles.sheetBackdrop, onPress: () => setProfileSheetVisible(false) },
        React.createElement(
          Pressable,
          { style: styles.sheetCard, onPress: () => undefined },
          React.createElement(View, { style: styles.sheetHandle }),
          React.createElement(Text, { style: styles.sheetName }, user.name),
          React.createElement(Text, { style: styles.sheetMeta }, `Account Type: ${getAccountLabel(user.authType)}`),
          React.createElement(Text, { style: styles.sheetMeta }, `Level: ${user.level}`),
          React.createElement(Text, { style: styles.sheetMeta }, `XP: ${user.xp}`),
          React.createElement(
            Pressable,
            { style: styles.logoutButton, onPress: () => void handleLogout(), disabled: loggingOut },
            React.createElement(Text, { style: styles.logoutButtonText }, loggingOut ? 'Wylogowywanie...' : 'Wyloguj się')
          )
        )
      )
    )
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.35)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  avatarLetter: {
    color: NEON_LIME,
    fontWeight: '800',
    fontSize: 15
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    justifyContent: 'flex-end'
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#0b1220',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)'
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(203, 213, 225, 0.45)',
    alignSelf: 'center',
    marginBottom: 16
  },
  sheetName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8
  },
  sheetMeta: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 6
  },
  logoutButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#d7263d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15
  }
});
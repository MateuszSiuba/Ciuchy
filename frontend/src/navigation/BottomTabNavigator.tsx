import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
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

function AddItemTabScreen(): JSX.Element {
  const navigation = useNavigation<BottomTabNavigationProp<BottomTabParamList>>();

  return <UploadScreen userId={DEMO_USER_ID} onUploaded={() => navigation.navigate('Wardrobe')} />;
}

export function BottomTabNavigator(): JSX.Element {
  const insets = useSafeAreaInsets();

  const baseTabHeight = 64;
  const paddingBottom = Math.max(10, insets.bottom ? insets.bottom : 10);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
          <Tab.Navigator
            initialRouteName="Wardrobe"
            screenOptions={({ route }) => ({
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
                  return <Ionicons name="shirt-outline" color={color} size={size} />;
                }

                if (route.name === 'TryOn') {
                  return <Ionicons name="person-outline" color={color} size={size} />;
                }

                if (route.name === 'Stats') {
                  return <Ionicons name="stats-chart-outline" color={color} size={size} />;
                }

                return <Ionicons name="add-circle-outline" color={color} size={size} />;
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '600'
              }
            })}
          >
            <Tab.Screen name="Wardrobe" component={WardrobeGalleryScreen} options={{ title: 'Wardrobe' }} />
            <Tab.Screen name="TryOn" component={TryOnScreen} options={{ title: 'Try On' }} />
            <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
            <Tab.Screen name="Add Item" component={AddItemTabScreen} options={{ title: 'Add Item' }} />
          </Tab.Navigator>
        </NavigationContainer>
    </GestureHandlerRootView>
  );
}
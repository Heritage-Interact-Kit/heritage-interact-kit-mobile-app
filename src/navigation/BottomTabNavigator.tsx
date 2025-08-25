import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { HomeScreen } from '../screens/HomeScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { MyRewardsScreen } from '../screens/MyRewardsScreen';
import { AppConfig } from '../config/app';

const Tab = createBottomTabNavigator();

// Icon component using react-native-vector-icons
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: { [key: string]: string } = {
    Tours: 'map-outline',
    Tasks: 'list-outline', 
    Rewards: 'trophy-outline',
  };

  const iconsFocused: { [key: string]: string } = {
    Tours: 'map',
    Tasks: 'list',
    Rewards: 'trophy',
  };

  return (
    <View style={styles.iconContainer}>
      <View style={[
        styles.iconBackground,
        focused && [styles.iconBackgroundFocused, { backgroundColor: AppConfig.colors.primary + '20' }]
      ]}>
        <Icon 
          name={focused ? iconsFocused[name] : icons[name]}
          size={16}
          color={focused ? AppConfig.colors.primary : '#9ca3af'}
          style={[
            styles.icon,
            focused && styles.iconFocused
          ]}
        />
      </View>
    </View>
  );
};

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: AppConfig.colors.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Tours" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Tours',
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen}
        options={{
          tabBarLabel: 'My Tasks',
        }}
      />
      <Tab.Screen 
        name="Rewards" 
        component={MyRewardsScreen}
        options={{
          tabBarLabel: 'My Rewards',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    height: 90,
    paddingTop: 10,
    paddingBottom: 25,
    paddingHorizontal: 10,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconBackgroundFocused: {
    backgroundColor: '#667eea20',
  },
  icon: {
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
}); 
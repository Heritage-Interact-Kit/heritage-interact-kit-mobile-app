import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { TourScreen } from '../screens/TourScreen';
import { TaskScreen } from '../screens/TaskScreen';
import { ObjectInteractScreen } from '../screens/ObjectInteractScreen';
import { AppConfig } from '../config/app';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: AppConfig.colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Tour" 
        component={TourScreen}
        options={{
          title: 'Tour Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="Task" 
        component={TaskScreen}
        options={{
          title: 'Task Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="ObjectInteract" 
        component={ObjectInteractScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}; 
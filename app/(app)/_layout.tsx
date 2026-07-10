import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '@/lib/theme';

// Bottom-tab navigation for the main features (NFR-09). Secondary screens are
// registered with href:null so they're navigable but hidden from the tab bar.
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: '800', fontSize: 20 },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="session" options={{ href: null, title: 'Active session' }} />
      <Tabs.Screen name="unsafe" options={{ href: null, title: 'Safety actions' }} />
      <Tabs.Screen name="fake-call" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ai-tips" options={{ href: null, title: 'AI safety tips' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
      <Tabs.Screen name="contact-edit" options={{ href: null, title: 'Contact' }} />
      <Tabs.Screen name="privacy-notice" options={{ href: null, title: 'Privacy' }} />
      <Tabs.Screen name="data-sources" options={{ href: null, title: 'Data sources' }} />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Banknote, Package, Smartphone, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsGear } from '@/components/navigation/SettingsGear';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

const TAB_BAR_CONTENT_HEIGHT = 56;

export const unstable_settings = {
  initialRouteName: 'insights',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      initialRouteName="insights"
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: {
          fontFamily: fonts.semibold,
          fontSize: 18,
          color: colors.text,
        },
        headerRight: () => <SettingsGear />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + tabBarBottomInset,
          paddingTop: 6,
          paddingBottom: tabBarBottomInset,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <TrendingUp size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color }) => <Package size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color }) => <Banknote size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'MOMO',
          tabBarIcon: ({ color }) => <Smartphone size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}

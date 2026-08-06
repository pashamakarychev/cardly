import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';
import { HomeFillIcon, HomeIcon } from './icons/HomeIcon';
import { SettingsFillIcon, SettingsIcon } from './icons/SettingsIcon';

const TABS = [
  {
    key: 'home',
    label: 'Home',
    Icon: HomeIcon,
    ActiveIcon: HomeFillIcon,
  },
  {
    key: 'settings',
    label: 'Settings',
    Icon: SettingsIcon,
    ActiveIcon: SettingsFillIcon,
  },
];

// Tab keys in the order they appear in the bar, so navigation can pick a
// transition direction from a tab's position.
export const TAB_KEYS = TABS.map(({ key }) => key);

const useNativeGlass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

export default function BottomNavigation({ activeTab, onTabPress }) {
  const items = TABS.map(({ key, label, Icon, ActiveIcon }) => {
    const active = key === activeTab;
    const IconComponent = active ? ActiveIcon : Icon;
    return (
      <Pressable
        key={key}
        style={[styles.item, active && styles.itemActive]}
        onPress={() => onTabPress?.(key)}
      >
        <IconComponent size={24} color={colors.textPrimary} />
        <Text
          numberOfLines={1}
          style={[
            active ? typography.navActive : typography.navInactive,
            styles.label,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  });

  if (useNativeGlass) {
    return (
      <GlassView style={styles.container} isInteractive>
        {items}
      </GlassView>
    );
  }

  return <View style={[styles.container, styles.containerDefault]}>{items}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    height: 64,
    padding: 4,
  },
  containerDefault: {
    backgroundColor: colors.background,
  },
  item: {
    alignItems: 'center',
    borderRadius: 999,
    gap: 4,
    height: 56,
    justifyContent: 'center',
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  itemActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  label: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

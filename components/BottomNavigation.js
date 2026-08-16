import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';
import { HomeFillIcon, HomeIcon } from './icons/HomeIcon';
import { SettingsFillIcon, SettingsIcon } from './icons/SettingsIcon';
import { useDelayedPressed } from './useDelayedPressed';

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

/** Base nav bar height at fontScale 1; multiply by useFontScale() for layout clearance. */
export const NAV_HEIGHT = 64;

const useNativeGlass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

// Active: rgba(0,0,0,0.05); Pressed: rgba(0,0,0,0.1) — Figma node 19034:319.
function NavigationItem({
  label,
  Icon,
  ActiveIcon,
  active,
  onPress,
  onPressedChange,
  fontScale,
}) {
  const { showPressed, pressProps } = useDelayedPressed({
    onChange: onPressedChange,
  });
  const emphasized = active || showPressed;
  const IconComponent = emphasized ? ActiveIcon : Icon;

  return (
    <Pressable
      onPress={onPress}
      {...pressProps}
      style={[
        styles.item,
        {
          height: 56 * fontScale,
          minWidth: 80 * fontScale,
          paddingHorizontal: 12 * fontScale,
          paddingVertical: 4 * fontScale,
        },
        active && styles.itemActive,
        showPressed && styles.itemPressed,
      ]}
    >
      <IconComponent size={24} color={colors.textPrimary} />
      <Text
        numberOfLines={1}
        style={[
          emphasized ? typography.navActive : typography.navInactive,
          styles.label,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function BottomNavigation({ activeTab, onTabPress }) {
  const fontScale = useFontScale();
  // While another item is pressed, the active item drops to the default look
  // so only one pill is highlighted at a time.
  const [pressedTab, setPressedTab] = useState(null);

  const items = TABS.map(({ key, label, Icon, ActiveIcon }) => (
    <NavigationItem
      key={key}
      label={label}
      Icon={Icon}
      ActiveIcon={ActiveIcon}
      fontScale={fontScale}
      // Stay active while this item itself is pressed so release goes
      // pressed → active with no default frame. Only a different pressed
      // item demotes the active one.
      active={key === activeTab && (pressedTab == null || pressedTab === key)}
      onPress={() => onTabPress?.(key)}
      onPressedChange={(isPressed) => {
        setPressedTab((current) => {
          if (isPressed) {
            return key;
          }
          return current === key ? null : current;
        });
      }}
    />
  ));

  const containerStyle = [
    styles.container,
    {
      height: NAV_HEIGHT * fontScale,
      padding: 4 * fontScale,
    },
  ];

  if (useNativeGlass) {
    return (
      <GlassView style={containerStyle} isInteractive>
        {items}
      </GlassView>
    );
  }

  return (
    <View style={[containerStyle, styles.containerDefault]}>{items}</View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
  },
  containerDefault: {
    backgroundColor: colors.background,
  },
  item: {
    alignItems: 'center',
    borderRadius: 999,
    gap: 4,
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  itemPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  label: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFontScale } from '../hooks/useFontScale';
import { colors, layout, typography } from '../theme';
import { HomeIcon } from './icons/HomeIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { useDelayedPressed } from './useDelayedPressed';

const ITEMS = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
];

// Figma code layer 53072:116: width/icon 200ms, labels 120ms;
// expansion delays are 200ms (brand), 240ms (Home), 280ms (Settings).
const WIDTH_DURATION = 200;
const LABEL_DURATION = 120;
const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function animatedLabelStyle(opacity, translateX) {
  return { opacity, transform: [{ translateX }] };
}

function SidebarItem({ item, active, collapsed, labelStyle, onPress }) {
  const { showPressed, pressProps } = useDelayedPressed();
  const [hovered, setHovered] = useState(false);
  const { Icon } = item;
  return (
    <Pressable
      {...pressProps}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={[styles.item, (active || hovered) && styles.itemActive, showPressed && styles.itemPressed]}
    >
      <View style={styles.itemIcon} accessible={false} importantForAccessibility="no-hide-descendants">
        <Icon size={20} color={active ? colors.primary : colors.textPrimary} />
      </View>
      <Animated.Text
        pointerEvents="none"
        numberOfLines={1}
        accessible={false}
        aria-hidden={collapsed}
        style={[styles.label, active && styles.labelActive, labelStyle]}
      >
        {item.label}
      </Animated.Text>
    </Pressable>
  );
}

export default function Sidebar({ activeTab = 'home', onTabPress }) {
  const [collapsed, setCollapsed] = useState(false);
  const fontScale = useFontScale();
  const expandedWidth = Math.max(layout.sidebarWidth, 240 * fontScale);
  const width = useRef(new Animated.Value(expandedWidth)).current;
  // Center the toggle over the collapsed nav icons; keep it right-aligned when expanded.
  const toggleLeft = width.interpolate({
    inputRange: [layout.sidebarCollapsedWidth, expandedWidth],
    outputRange: [(layout.sidebarCollapsedWidth - 32 - 36) / 2, expandedWidth - 32 - 36],
    extrapolate: 'clamp',
  });
  const dividerX = useRef(new Animated.Value(0)).current;
  const labelOpacities = useRef([0, 1, 2].map(() => new Animated.Value(1))).current;
  const labelOffsets = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const initialLabels = useRef(true);
  const insets = useSafeAreaInsets();
  const { showPressed, pressProps } = useDelayedPressed();

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(width, { toValue: collapsed ? layout.sidebarCollapsedWidth : expandedWidth,
        duration: WIDTH_DURATION, easing: EASE_OUT, useNativeDriver: false }),
      Animated.timing(dividerX, { toValue: collapsed ? 5 : 0,
        duration: WIDTH_DURATION, easing: EASE_OUT, useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [collapsed, expandedWidth, width, dividerX]);

  useEffect(() => {
    if (initialLabels.current) { initialLabels.current = false; return; }
    const animations = labelOpacities.flatMap((opacity, index) => {
      const offset = labelOffsets[index];
      offset.setValue(collapsed ? 0 : -8);
      if (!collapsed) opacity.setValue(0);
      const config = { duration: LABEL_DURATION, delay: collapsed ? 0 : 200 + index * 40,
        easing: collapsed ? Easing.bezier(0.25, 0.1, 0.25, 1) : EASE_OUT, useNativeDriver: false };
      return [Animated.timing(opacity, { ...config, toValue: collapsed ? 0 : 1 }),
        Animated.timing(offset, { ...config, toValue: 0 })];
    });
    const animation = Animated.parallel(animations);
    animation.start();
    return () => animation.stop();
  }, [collapsed, labelOpacities, labelOffsets]);

  return (
    <Animated.View style={[styles.sidebar, { width }]}>
      <ScrollView bounces={false} overScrollMode="never" contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.brand}>
          <Animated.Text pointerEvents="none" numberOfLines={1} accessibilityRole="header"
            aria-hidden={collapsed} accessibilityElementsHidden={collapsed}
            style={[styles.brandName, animatedLabelStyle(labelOpacities[0], labelOffsets[0])]}>
            Cardly
          </Animated.Text>
          <AnimatedPressable
            {...pressProps}
            onPress={() => setCollapsed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            accessibilityState={{ expanded: !collapsed }}
            style={[styles.toggle, { left: toggleLeft }, showPressed && styles.itemPressed]}
          >
            <View style={styles.toggleIcon} accessible={false} importantForAccessibility="no-hide-descendants">
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M4.16667 2.5H15.8333C16.7538 2.5 17.5 3.24619 17.5 4.16667V15.8333C17.5 16.7538 16.7538 17.5 15.8333 17.5H4.16667C3.24619 17.5 2.5 16.7538 2.5 15.8333V4.16667C2.5 3.24619 3.24619 2.5 4.16667 2.5Z"
                  stroke="black" strokeWidth={1.38889} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Animated.View style={[styles.divider, { transform: [{ translateX: dividerX }] }]}>
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path d="M7.5 2.5V17.5" stroke="black" strokeWidth={1.38889}
                    strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Animated.View>
            </View>
          </AnimatedPressable>
        </View>
        <View accessibilityRole="tablist">
          {ITEMS.map((item, index) => (
            <SidebarItem
              key={item.key}
              item={item}
              active={activeTab === item.key}
              collapsed={collapsed}
              labelStyle={animatedLabelStyle(labelOpacities[index + 1], labelOffsets[index + 1])}
              onPress={() => onTabPress?.(item.key)}
            />
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: colors.background, flexShrink: 0, overflow: 'hidden' },
  scrollContent: { paddingHorizontal: 16 },
  // Both children are absolute, so the header must reserve its own height.
  brand: { height: 100, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandName: { ...typography.logo, color: colors.textPrimary, position: 'absolute', left: 0 },
  toggle: { width: 36, height: 36, position: 'absolute', top: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  toggleIcon: { width: 20, height: 20 },
  divider: { position: 'absolute', left: 0, top: 0, width: 20, height: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, minHeight: 44, overflow: 'hidden' },
  itemIcon: { width: 20, height: 20, flexShrink: 0 },
  itemActive: { backgroundColor: colors.surface },
  itemPressed: { backgroundColor: colors.surfaceSubtle },
  label: { ...typography.navSidebar, color: colors.textPrimary, flexShrink: 0 },
  labelActive: { color: colors.primary },
});

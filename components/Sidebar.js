import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFontScale } from '../hooks/useFontScale';
import { colors, fontFamilies, layout, typography } from '../theme';
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
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        <Icon size={24} color={active ? colors.primary : colors.textPrimary} />
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
      Animated.timing(dividerX, { toValue: collapsed ? 6 : 0,
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
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.brand}>
          <Animated.Text pointerEvents="none" numberOfLines={1} accessibilityRole="header"
            aria-hidden={collapsed} accessibilityElementsHidden={collapsed}
            style={[styles.brandName, animatedLabelStyle(labelOpacities[0], labelOffsets[0])]}>
            Cardly
          </Animated.Text>
          <Pressable
            {...pressProps}
            onPress={() => setCollapsed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            accessibilityState={{ expanded: !collapsed }}
            style={[styles.toggle, showPressed && styles.itemPressed]}
          >
            <View style={styles.toggleIcon} accessible={false} importantForAccessibility="no-hide-descendants">
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"
                  stroke="black" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Animated.View style={[styles.divider, { transform: [{ translateX: dividerX }] }]}>
                <Image source={require('../images/sidebar-divider.svg')} style={styles.dividerImage} />
              </Animated.View>
            </View>
          </Pressable>
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
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 32 },
  brandName: { ...typography.h2, color: colors.textPrimary, position: 'absolute', left: 0 },
  toggle: { width: 48, height: 48, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  toggleIcon: { width: 24, height: 24 },
  divider: { position: 'absolute', left: 8, top: 2, width: 2, height: 20 },
  dividerImage: { width: 2, height: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, minHeight: 48 },
  itemActive: { backgroundColor: colors.surface },
  itemPressed: { backgroundColor: colors.surfaceSubtle },
  label: { fontFamily: fontFamilies.medium, fontSize: 14, color: colors.textPrimary, flexShrink: 0 },
  labelActive: { color: colors.primary },
});

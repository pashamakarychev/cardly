import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccessibleText from './AccessibleText';
import { CheckIcon } from './icons/CheckIcon';
import { useFontScale } from '../hooks/useFontScale';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useDelayedPressed } from './useDelayedPressed';
import { colors, typography } from '../theme';

function PickerOption({ option, disabled, selected, mobile, desktop, itemHeight, onSelect }) {
  const { showPressed, pressProps } = useDelayedPressed({ disabled });
  const [hovered, setHovered] = useState(false);
  return <Pressable
    onPress={onSelect}
    {...pressProps}
    onHoverIn={() => setHovered(true)}
    onHoverOut={() => setHovered(false)}
    disabled={disabled}
    accessibilityRole="radio"
    accessibilityLabel={option}
    accessibilityState={{ selected, disabled }}
    style={[styles.option, mobile && styles.mobileOption, { minHeight: itemHeight }, desktop && hovered && !disabled && styles.optionHovered, showPressed && (desktop || !mobile ? styles.dropdownOptionPressed : styles.optionPressed)]}
  >
    <AccessibleText style={[mobile ? styles.mobileOptionText : desktop ? styles.desktopOptionText : styles.tabletOptionText, disabled && styles.disabledText]}>{option}</AccessibleText>
    {selected && <CheckIcon size={16} color={colors.textPrimary} />}
  </Pressable>;
}

export default function SettingsPicker({ visible, options, selected, disabledOptions = [], onSelect, onClose, mobile, anchor }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fontScale = useFontScale();
  const desktop = useIsDesktop();
  const sheetHeight = Math.min(437 * fontScale, height * 0.8);
  const sheetOffset = useRef(new Animated.Value(sheetHeight)).current;
  const scrollY = useRef(0);
  const scrollPosition = useRef(new Animated.Value(0)).current;
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const itemHeight = (mobile ? 64 : desktop ? 40 : 48) * fontScale;
  const top = Math.max(16, Math.min(anchor?.y ?? 0, height - Math.min(options.length * itemHeight, height * 0.65) - 16));
  const right = Math.max(16, width - (anchor?.x ?? 0) - (anchor?.width ?? 0));
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  const thumbHeight = maxScroll > 0 ? Math.min(viewportHeight, Math.max(24, viewportHeight * viewportHeight / contentHeight)) : 0;
  const thumbTravel = Math.max(0, viewportHeight - thumbHeight);
  const thumbOffset = scrollPosition.interpolate({
    inputRange: [0, Math.max(1, maxScroll)],
    outputRange: [0, thumbTravel],
    extrapolate: 'clamp',
  });

  const sheetGesture = useMemo(() => {
    const animateTo = (toValue, callback) => Animated.timing(sheetOffset, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => { if (finished) callback?.(); });
    const wantsDrag = (_, gesture) => mobile && scrollY.current <= 0 &&
      gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
    return PanResponder.create({
      onMoveShouldSetPanResponder: wantsDrag,
      onMoveShouldSetPanResponderCapture: wantsDrag,
      onPanResponderGrant: () => sheetOffset.stopAnimation(),
      onPanResponderMove: (_, gesture) => sheetOffset.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > sheetHeight * 0.3 || gesture.vy > 0.8) {
          animateTo(sheetHeight, onClose);
        } else {
          animateTo(0);
        }
      },
      onPanResponderTerminate: () => animateTo(0),
    });
  }, [mobile, onClose, sheetHeight, sheetOffset]);

  useEffect(() => {
    if (!mobile || !visible) return;
    scrollY.current = 0;
    scrollPosition.setValue(0);
    sheetOffset.setValue(sheetHeight);
    const animation = Animated.timing(sheetOffset, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [mobile, visible, sheetHeight, sheetOffset, scrollPosition]);

  return (
    <Modal visible={visible} transparent animationType={mobile ? 'none' : 'fade'} onRequestClose={onClose} accessibilityViewIsModal>
      <View style={[styles.overlay, mobile && styles.mobileOverlay]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close options" accessibilityRole="button" />
        <Animated.View
          {...(mobile ? sheetGesture.panHandlers : {})}
          style={mobile ? [styles.sheet, { height: sheetHeight, transform: [{ translateY: sheetOffset }] }] : [styles.dropdown, { top, right, maxHeight: height * 0.65 }]}
          accessibilityViewIsModal
        >
          {mobile && <View style={styles.handleArea}><View style={styles.handle} /></View>}
          <ScrollView
            bounces={false}
            overScrollMode="never"
            style={mobile ? styles.sheetList : styles.dropdownList}
            contentContainerStyle={mobile && { paddingBottom: insets.bottom }}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            onContentSizeChange={(_, content) => setContentHeight(content)}
            onScroll={(event) => {
              scrollY.current = event.nativeEvent.contentOffset.y;
              scrollPosition.setValue(scrollY.current);
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => {
              const disabled = disabledOptions.includes(option);
              return (
                <PickerOption
                  key={option}
                  option={option}
                  disabled={disabled}
                  selected={selected === option}
                  mobile={mobile}
                  desktop={desktop}
                  itemHeight={itemHeight}
                  onSelect={() => { onSelect(option); onClose(); }}
                />
              );
            })}
          </ScrollView>
          {thumbHeight > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.scrollThumb, { height: thumbHeight, transform: [{ translateY: thumbOffset }] }]}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  mobileOverlay: { justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', paddingHorizontal: 0 },
  handleArea: { height: 32, alignItems: 'center', paddingTop: 8 },
  handle: { backgroundColor: colors.surfaceSubtle, width: 36, height: 4, borderRadius: 2 },
  sheetList: { flex: 1 },
  scrollThumb: { position: 'absolute', top: 0, right: 2, width: 4, borderRadius: 4, backgroundColor: colors.surfaceSubtle },
  dropdown: { position: 'absolute', backgroundColor: colors.background, width: 240, borderRadius: 12, overflow: 'hidden', shadowColor: colors.textPrimary, shadowOpacity: 0.16, shadowRadius: 34, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  dropdownList: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  mobileOption: { paddingHorizontal: 32, borderRadius: 0 },
  mobileOptionText: { ...typography.h3, color: colors.textPrimary },
  tabletOptionText: { ...typography.body, color: colors.textPrimary },
  desktopOptionText: { ...typography.bodySmall, color: colors.textPrimary },
  optionPressed: { backgroundColor: colors.surface },
  optionHovered: { backgroundColor: colors.surface },
  dropdownOptionPressed: { backgroundColor: colors.surfaceSubtle },
  disabledText: { color: colors.textSecondary },
});

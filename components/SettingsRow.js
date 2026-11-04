import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import AccessibleText from './AccessibleText';
import { useDelayedPressed } from './useDelayedPressed';
import { useFontScale } from '../hooks/useFontScale';
import { colors, palette, typography } from '../theme';

export function SettingsChevron({ down = false, color = colors.primary }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <Path
        d={down ? 'M4.5 6.25 8 9.75l3.5-3.5' : 'm6.25 4.5 3.5 3.5-3.5 3.5'}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SettingsToggle({ value = false, disabled = false }) {
  return <View style={[styles.toggle, value && styles.toggleOn, disabled && styles.toggleDisabled, value && disabled && styles.toggleOnDisabled]}>
    <View style={[styles.toggleThumb, value && styles.toggleThumbOn, disabled && styles.toggleThumbDisabled]} />
  </View>;
}

export default function SettingsRow({ label, value, onPress, down = false, trailing, danger = false, disabled = false }) {
  const fontScale = useFontScale();
  const { showPressed, pressProps } = useDelayedPressed({ disabled });
  const content = (
    <>
      <AccessibleText
        style={[styles.label, Platform.OS === 'web' && styles.webLabel, danger && styles.danger, disabled && styles.disabledText]}
        numberOfLines={1}
      >
        {label}
      </AccessibleText>
      {trailing ?? (value != null || onPress ? (
        <View style={styles.valueWrap} accessible={false} importantForAccessibility="no-hide-descendants">
          {value != null && (
            <AccessibleText
              style={[styles.value, Platform.OS === 'web' && styles.webValue, disabled && styles.disabledText]}
              numberOfLines={1}
            >
              {value}
            </AccessibleText>
          )}
          <SettingsChevron down={down} color={disabled ? colors.textSecondary : colors.primary} />
        </View>
      ) : null)}
    </>
  );
  const style = [styles.row, { minHeight: 64 * fontScale }, showPressed && styles.pressed, disabled && styles.disabled];
  return onPress ? (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      {...pressProps}
      accessibilityRole="button"
      accessibilityLabel={value == null ? label : `${label}, ${value}`}
      accessibilityState={{ disabled }}
      style={style}
    >
      {content}
    </Pressable>
  ) : <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 8, width: '100%' },
  label: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  webLabel: { lineHeight: 20 },
  danger: { color: palette.red200 },
  valueWrap: { alignItems: 'center', flexDirection: 'row', gap: 4, flexShrink: 0, marginLeft: 12 },
  value: { ...typography.caption, color: colors.primary },
  webValue: { lineHeight: 18 },
  pressed: { backgroundColor: colors.surface },
  disabled: { backgroundColor: palette.gray300 },
  disabledText: { color: colors.textSecondary },
  toggle: { width: 52, height: 32, borderRadius: 16, backgroundColor: colors.surface, padding: 4, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.primary },
  toggleDisabled: { backgroundColor: palette.gray200 },
  toggleOnDisabled: { backgroundColor: palette.gray200 },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleThumbDisabled: { backgroundColor: colors.textSecondary },
});

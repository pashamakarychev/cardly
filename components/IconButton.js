import { Pressable, StyleSheet, View } from 'react-native';

import { useDelayedPressed } from './useDelayedPressed';
import { colors } from '../theme';

export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'secondary',
  size = 'large',
  shadow = true,
  style,
}) {
  const { showPressed, pressProps } = useDelayedPressed();

  return (
    <Pressable
      onPress={onPress}
      {...pressProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        size === 'medium' && styles.medium,
        variant === 'ghost' ? styles.ghost : shadow && styles.shadow,
        style,
        showPressed && styles.pressed,
      ]}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        {icon}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 26,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  medium: { height: 36, width: 36 },
  ghost: { backgroundColor: 'transparent' },
  shadow: {
    elevation: 2,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
});

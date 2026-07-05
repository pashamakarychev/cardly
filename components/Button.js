import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '../theme';

export default function Button({ title, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: '100%',
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  title: {
    ...typography.button,
    color: colors.textInverse,
  },
});

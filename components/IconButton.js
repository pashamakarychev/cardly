import { Pressable, StyleSheet } from 'react-native';

import { useDelayedPressed } from './useDelayedPressed';

export default function IconButton({ icon, onPress }) {
  const { showPressed, pressProps } = useDelayedPressed();

  return (
    <Pressable
      onPress={onPress}
      {...pressProps}
      style={[styles.button, showPressed && styles.pressed]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    width: 48,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});

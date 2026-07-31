import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Button from './Button';
import { colors, typography } from '../theme';

export default function Dialog({
  visible,
  title,
  description,
  confirmLabel = 'Ok',
  onConfirm,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      <Pressable style={styles.backdrop} onPress={onConfirm}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.message}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          <Button
            title={confirmLabel}
            onPress={onConfirm}
            style={styles.button}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 32,
    gap: 8,
    maxWidth: 320,
    padding: 16,
    width: '100%',
  },
  message: {
    gap: 16,
    padding: 16,
    width: '100%',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    width: '100%',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    width: '100%',
  },
  button: {
    height: 52,
  },
});

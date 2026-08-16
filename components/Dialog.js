import { Modal, Pressable, StyleSheet, View } from 'react-native';

import AccessibleText from './AccessibleText';
import Button from './Button';
import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

export default function Dialog({
  visible,
  title,
  description,
  confirmLabel = 'Ok',
  onConfirm,
}) {
  const fontScale = useFontScale();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.message}>
            <AccessibleText style={styles.title} accessibilityRole="header">
              {title}
            </AccessibleText>
            <AccessibleText style={styles.description}>
              {description}
            </AccessibleText>
          </View>
          <Button
            title={confirmLabel}
            onPress={onConfirm}
            style={[styles.button, { height: 52 * fontScale }]}
          />
        </View>
      </View>
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
    zIndex: 1,
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
  button: {},
});

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import AccessibleText from './AccessibleText';
import Button from './Button';
import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

export default function AnalyticsConsentDialog({ visible, onAccept, onDecline, onPrivacyPress }) {
  const fontScale = useFontScale();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline} accessibilityViewIsModal>
    <View style={styles.backdrop}>
      <View style={styles.card} accessibilityViewIsModal>
        <View style={styles.message}>
          <AccessibleText style={styles.title} accessibilityRole="header">We use analytics to improve the app</AccessibleText>
          <AccessibleText style={styles.description}>You can turn it off anytime in settings</AccessibleText>
          <Pressable onPress={onPrivacyPress} accessibilityRole="link" accessibilityLabel="Privacy policy">
            <AccessibleText style={[styles.description, styles.privacyLink]}>Privacy policy</AccessibleText>
          </Pressable>
        </View>
        <View style={styles.buttons}>
          <Button title="Accept" onPress={onAccept} size="medium" style={{ height: 52 * fontScale }} />
          <Button title="Decline" onPress={onDecline} variant="tertiary" size="medium" style={{ height: 52 * fontScale }} />
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: colors.background, borderRadius: 32, gap: 8, maxWidth: 320, padding: 16, width: '100%' },
  buttons: { gap: 12, width: '100%' },
  message: { gap: 16, padding: 16 },
  title: { ...typography.h3, color: colors.textPrimary },
  description: { ...typography.caption, color: colors.textSecondary },
  privacyLink: { textDecorationLine: 'underline' },
});

import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

// Geometry from Figma: in a 370x220 stack, the back card peeks out at the
// top while the front card fills the remaining area below.
export default function CardStack({ word, nextWord }) {
  return (
    <View style={styles.stack}>
      <View style={styles.backCard}>
        {nextWord != null && <Text style={styles.backWord}>{nextWord}</Text>}
      </View>
      <View style={styles.frontCard}>
        <Text style={styles.word}>{word}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    height: 220,
    width: '100%',
  },
  backCard: {
    alignItems: 'center',
    backgroundColor: colors.textCard,
    borderRadius: 32,
    bottom: 33,
    justifyContent: 'center',
    left: 17,
    overflow: 'hidden',
    position: 'absolute',
    right: 20,
    top: 0,
  },
  frontCard: {
    alignItems: 'center',
    backgroundColor: colors.textCardSecondary,
    borderRadius: 32,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    overflow: 'hidden',
    padding: 16,
    position: 'absolute',
    right: 0,
    top: 12,
  },
  word: {
    ...typography.cardWord,
    color: colors.textInverse,
  },
  backWord: {
    ...typography.cardWord,
    color: colors.textInverse,
    fontSize: 32,
  },
});

import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import { XIcon } from '../components/icons/XIcon';
import { colors } from '../theme';

export default function NewWordScreen({
  word = 'Hola',
  nextWord,
  progress = 0.3,
  onClose,
  onLearn,
  onAlreadyKnow,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 19 }]}>
      <View style={styles.header}>
        <IconButton icon={<XIcon />} onPress={onClose} />
        <ProgressBar progress={progress} />
      </View>
      <View style={styles.flashcardContainer}>
        <CardStack word={word} nextWord={nextWord} />
      </View>
      <View style={styles.content}>
        <Button title="Learn" onPress={onLearn} />
        <Button title="Already know" variant="secondary" onPress={onAlreadyKnow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    gap: 24,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 48,
  },
  flashcardContainer: {
    height: 285,
    justifyContent: 'flex-end',
  },
  content: {
    gap: 12,
  },
});

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import { XIcon } from '../components/icons/XIcon';
import { colors } from '../theme';

// Match ExerciseScreen: brief pause so the tap registers before the cards move.
const TRANSITION_DELAY_MS = 300;

export default function NewWordScreen({
  word = 'Hola',
  nextWord,
  progress = 0.3,
  onClose,
  onLearn,
  onAlreadyKnow,
  onTransitionEnd,
}) {
  const insets = useSafeAreaInsets();
  const [resolved, setResolved] = useState(false);
  const [transitionTrigger, setTransitionTrigger] = useState(0);
  const triggerTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (triggerTimeoutRef.current !== null) {
        clearTimeout(triggerTimeoutRef.current);
      }
    },
    [],
  );

  const startTransition = (action) => {
    if (resolved) {
      return;
    }

    setResolved(true);
    // Report the choice right away so the next step can be prepared while
    // the card transition plays out.
    action?.();

    triggerTimeoutRef.current = setTimeout(() => {
      triggerTimeoutRef.current = null;
      setTransitionTrigger((count) => count + 1);
    }, TRANSITION_DELAY_MS);
  };

  // Reset in the same batch as the parent advancing the round, so the new
  // screen renders with clean action buttons.
  const handleTransitionEnd = () => {
    setResolved(false);
    onTransitionEnd?.();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 19 }]}>
      <View style={styles.header}>
        <IconButton icon={<XIcon />} onPress={onClose} />
        <ProgressBar progress={progress} />
      </View>
      <View style={styles.flashcardContainer}>
        <CardStack
          word={word}
          nextWord={nextWord}
          transitionTrigger={transitionTrigger}
          onTransitionEnd={handleTransitionEnd}
        />
      </View>
      <View style={styles.content}>
        <Button title="Learn" onPress={() => startTransition(onLearn)} />
        <Button
          title="Already know"
          variant="secondary"
          onPress={() => startTransition(onAlreadyKnow)}
        />
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

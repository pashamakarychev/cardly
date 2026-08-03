import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import { XIcon } from '../components/icons/XIcon';
import { colors } from '../theme';

// Pause after the correct answer so the green state registers before the cards move
const TRANSITION_DELAY_MS = 300;

export default function ExerciseScreen({
  word = 'Hola',
  nextWord,
  options = ['Hello', 'Book', 'City', 'Food'],
  correctAnswer = 'Hello',
  progress = 0.3,
  onClose,
  onAnswer,
  onTransitionEnd,
}) {
  const insets = useSafeAreaInsets();
  const [wrongOptions, setWrongOptions] = useState([]);
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

  const handleAnswer = (option) => {
    if (resolved || wrongOptions.includes(option)) {
      return;
    }

    if (option !== correctAnswer) {
      setWrongOptions((current) => [...current, option]);
      return;
    }

    setResolved(true);
    // Report the answer right away so the next step can be prepared while
    // the feedback pause and card transition play out.
    onAnswer?.(wrongOptions.length === 0);

    triggerTimeoutRef.current = setTimeout(() => {
      triggerTimeoutRef.current = null;
      setTransitionTrigger((count) => count + 1);
    }, TRANSITION_DELAY_MS);
  };

  // Reset in the same batch as the parent advancing the round, so the new
  // exercise renders with clean answer buttons.
  const handleTransitionEnd = () => {
    setWrongOptions([]);
    setResolved(false);
    onTransitionEnd?.();
  };

  const statusFor = (option) => {
    if (wrongOptions.includes(option)) {
      return 'incorrect';
    }
    if (resolved && option === correctAnswer) {
      return 'correct';
    }
    return undefined;
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
        {options.map((option, index) => (
          <Button
            key={`${index}-${option}`}
            title={option}
            variant="secondary"
            status={statusFor(option)}
            onPress={() => handleAnswer(option)}
          />
        ))}
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

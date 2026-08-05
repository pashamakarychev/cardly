import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import { XIcon } from '../components/icons/XIcon';
import { colors } from '../theme';
import { capitalizeWord, TEST_CARD_WORD } from '../utils/text';

// Pause after a tap so the button feedback registers before the cards move
const TRANSITION_DELAY_MS = 300;

export const SESSION_MODES = {
  EXERCISE: 'exercise',
  NEW_WORD: 'newWord',
};

// One screen for both session rounds: an exercise (word + answer options)
// and a new word (Learn / Already know). The card stack persists across
// rounds so the swap animation carries from one round to the next.
export default function SessionScreen({
  mode = SESSION_MODES.EXERCISE,
  word = 'Hola',
  nextWord,
  options = ['Hello', 'Book', 'City', 'Food'],
  correctAnswer = 'Hello',
  progress = 0.3,
  onClose,
  onAnswer,
  onLearn,
  onAlreadyKnow,
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

  // Reset in the same batch as the parent advancing the round, so the next
  // round renders with clean buttons.
  const handleTransitionEnd = () => {
    setWrongOptions([]);
    setResolved(false);
    onTransitionEnd?.();
  };

  // Button state updates immediately; the action is reported right away so
  // the next step can be prepared while the feedback pause (and optional
  // card transition) play out. When the action resolves to false (last card),
  // the animation is skipped.
  const resolveRound = (action) => {
    setResolved(true);

    (async () => {
      const shouldAnimate = await action?.();
      triggerTimeoutRef.current = setTimeout(() => {
        triggerTimeoutRef.current = null;
        if (shouldAnimate === false) {
          handleTransitionEnd();
          return;
        }
        setTransitionTrigger((count) => count + 1);
      }, TRANSITION_DELAY_MS);
    })();
  };

  const handleAnswer = (option) => {
    if (resolved || wrongOptions.includes(option)) {
      return;
    }

    if (option !== correctAnswer) {
      setWrongOptions((current) => [...current, option]);
      return;
    }

    const firstAttemptCorrect = wrongOptions.length === 0;
    resolveRound(() => onAnswer?.(firstAttemptCorrect));
  };

  const handleChoice = (action) => {
    if (resolved) {
      return;
    }
    resolveRound(action);
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
        {mode === SESSION_MODES.EXERCISE ? (
          options.map((option, index) => (
            <Button
              key={`${index}-${option}`}
              title={capitalizeWord(TEST_CARD_WORD ?? option)}
              variant="secondary"
              status={statusFor(option)}
              onPress={() => handleAnswer(option)}
            />
          ))
        ) : (
          <>
            <Button title="Learn" onPress={() => handleChoice(onLearn)} />
            <Button
              title="Already know"
              variant="secondary"
              onPress={() => handleChoice(onAlreadyKnow)}
            />
          </>
        )}
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

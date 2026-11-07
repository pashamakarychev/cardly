import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import TopGradient from '../components/TopGradient';
import { XIcon } from '../components/icons/XIcon';
import { useScreenReaderEnabled } from '../hooks/useScreenReaderEnabled';
import { SESSION_BUTTON_GAP, SESSION_CARD_GAP, useStudyScreenLayout } from '../hooks/useStudyScreenLayout';
import { colors, layout } from '../theme';
import { announceForAccessibility } from '../utils/accessibility';
import { capitalizeWord, TEST_CARD_WORD } from '../utils/text';

// Extra time for TalkBack / VoiceOver to finish speaking answer feedback.
const SCREEN_READER_FEEDBACK_DELAY_MS = 2000;

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
  const {
    isTablet, top: topInset, bottom: bottomInset, fontScale,
    paddingHorizontal, headerHeight, buttonsHeight, cardTop,
  } = useStudyScreenLayout();
  const screenReaderEnabled = useScreenReaderEnabled();
  const [wrongOptions, setWrongOptions] = useState([]);
  const [resolved, setResolved] = useState(false);
  const cardStackRef = useRef(null);
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

  // Prefetch decides whether another card follows. The last word skips the
  // swap and advances straight to session complete.
  const resolveRound = (action) => {
    const pending = Promise.resolve(action?.());
    setResolved(true);

    const startOrFinish = (shouldAnimate) => {
      if (shouldAnimate === false) {
        handleTransitionEnd();
        return;
      }
      cardStackRef.current?.playTransition();
    };

    if (!screenReaderEnabled) {
      pending.then(startOrFinish);
      return;
    }

    triggerTimeoutRef.current = setTimeout(() => {
      triggerTimeoutRef.current = null;
      pending.then(startOrFinish);
    }, SCREEN_READER_FEEDBACK_DELAY_MS);
  };

  const handleAnswer = (option) => {
    if (resolved || wrongOptions.includes(option)) {
      return;
    }

    const optionLabel = capitalizeWord(TEST_CARD_WORD ?? option);

    if (option !== correctAnswer) {
      setWrongOptions((current) => [...current, option]);
      if (screenReaderEnabled) {
        announceForAccessibility(`${optionLabel}, incorrect`);
      }
      return;
    }

    if (screenReaderEnabled) {
      announceForAccessibility(`${optionLabel}, correct`);
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

  const buttons = (
    <View
      style={[
        styles.buttons,
        { height: buttonsHeight, gap: SESSION_BUTTON_GAP * fontScale },
      ]}
    >
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
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: cardTop,
            paddingBottom: bottomInset,
            paddingHorizontal,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <CardStack
              ref={cardStackRef}
              word={word}
              nextWord={nextWord}
              onTransitionEnd={handleTransitionEnd}
            />
            {buttons}
          </View>
        </View>
      </ScrollView>

      <TopGradient fillHeight={topInset} />
      <View
        pointerEvents="box-none"
        style={[
          styles.header,
          { top: topInset, height: headerHeight, paddingHorizontal },
        ]}
      >
        <View
          style={[styles.headerContent, isTablet && styles.headerContentWide]}
        >
          <View style={isTablet ? styles.closeWide : undefined}>
            <IconButton
              icon={<XIcon />}
              variant="ghost"
              shadow={false}
              onPress={onClose}
              accessibilityLabel="Close session"
            />
          </View>
          <ProgressBar
            progress={progress}
            style={isTablet ? styles.progressWide : styles.progress}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  // Figma Exercise root: items-center.
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  container: {
    maxWidth: layout.compactContentWidth,
    width: '100%',
  },
  content: {
    gap: SESSION_CARD_GAP,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  headerContentWide: { justifyContent: 'center', alignItems: 'flex-start' },
  closeWide: { position: 'absolute', top: 0, left: 0 },
  progress: { flex: 1 },
  progressWide: { width: layout.sessionProgressMaxWidth, maxWidth: '100%' },
  buttons: {
    // Height + gap set inline from fontScale so New Word (2 buttons) keeps
    // Exercise’s 4-button frame and the card doesn’t jump when modes change.
    width: '100%',
  },
});

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, View } from 'react-native';

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
const ANSWER_FEEDBACK_DELAY_MS = 300;
const BUTTONS_FADE_OUT_DURATION = 120;
const BUTTONS_ENTER_OFFSET = 24;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

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
  nextButtons,
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
  const buttonsOpacity = useRef(new Animated.Value(1)).current;
  const [incomingButtonsPose, setIncomingButtonsPose] = useState(null);
  const buttonsAnimationRef = useRef(null);

  useEffect(
    () => () => {
      buttonsAnimationRef.current?.stop();
      if (triggerTimeoutRef.current !== null) {
        clearTimeout(triggerTimeoutRef.current);
      }
    },
    [],
  );

  // Reset in the same batch as the parent advancing the round, so the next
  // round renders with clean buttons.
  const handleTransitionEnd = () => {
    buttonsAnimationRef.current?.stop();
    buttonsOpacity.setValue(1);
    setIncomingButtonsPose(null);
    setWrongOptions([]);
    setResolved(false);
    onTransitionEnd?.();
  };

  // Prefetch decides whether another card follows. The last word skips the
  // swap and advances straight to session complete.
  const resolveRound = (action, feedbackDelayMs = 0) => {
    const pending = Promise.resolve(action?.());
    setResolved(true);

    const startOrFinish = (shouldAnimate) => {
      if (shouldAnimate === false) {
        handleTransitionEnd();
        return;
      }
      buttonsAnimationRef.current?.stop();
      buttonsAnimationRef.current = Animated.timing(buttonsOpacity, {
        toValue: 0,
        duration: BUTTONS_FADE_OUT_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      });
      buttonsAnimationRef.current.start();
      cardStackRef.current?.playTransition(setIncomingButtonsPose);
    };

    if (!screenReaderEnabled && feedbackDelayMs === 0) {
      pending.then(startOrFinish);
      return;
    }

    triggerTimeoutRef.current = setTimeout(() => {
      triggerTimeoutRef.current = null;
      pending.then(startOrFinish);
    }, screenReaderEnabled ? SCREEN_READER_FEEDBACK_DELAY_MS : feedbackDelayMs);
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
    resolveRound(() => onAnswer?.(firstAttemptCorrect), ANSWER_FEEDBACK_DELAY_MS);
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

  // Use the incoming card's pose so both transitions finish on the same frame.
  const incomingButtons = incomingButtonsPose == null ? null : nextButtons;
  const visibleMode = incomingButtons?.mode ?? mode;
  const visibleOptions = incomingButtons?.options ?? options;
  const buttons = (
    <Animated.View
      pointerEvents={resolved ? 'none' : 'auto'}
      style={[
        styles.buttons,
        {
          height: buttonsHeight,
          gap: SESSION_BUTTON_GAP * fontScale,
          opacity: incomingButtons
            ? incomingButtonsPose.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
            : buttonsOpacity,
          transform: [{ translateY: incomingButtons
            ? incomingButtonsPose.interpolate({ inputRange: [0, 1], outputRange: [0, BUTTONS_ENTER_OFFSET] })
            : 0 }],
        },
      ]}
    >
      {visibleMode === SESSION_MODES.EXERCISE ? (
        visibleOptions.map((option, index) => (
          <Button
            key={`${index}-${option}`}
            title={capitalizeWord(TEST_CARD_WORD ?? option)}
            variant="secondary"
            status={incomingButtons ? undefined : statusFor(option)}
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
    </Animated.View>
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

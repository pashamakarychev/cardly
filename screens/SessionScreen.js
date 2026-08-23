import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import TopGradient from '../components/TopGradient';
import { XIcon } from '../components/icons/XIcon';
import { useFontScale } from '../hooks/useFontScale';
import { useIsTablet } from '../hooks/useIsTablet';
import { useScreenReaderEnabled } from '../hooks/useScreenReaderEnabled';
import { colors, layout } from '../theme';
import { announceForAccessibility } from '../utils/accessibility';
import { capitalizeWord, TEST_CARD_WORD } from '../utils/text';

// Figma tablet Content frame height — keeps New Word / Exercise aligned.
const TABLET_CONTENT_MIN_HEIGHT = 656;
const HEADER_HEIGHT = 48;
// Figma Exercise Buttons frame: 4 × 60px buttons + 3 × 12px gaps.
const BUTTON_HEIGHT = 60;
const BUTTON_GAP = 12;
const BUTTONS_HEIGHT = BUTTON_HEIGHT * 4 + BUTTON_GAP * 3;

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
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const fontScale = useFontScale();
  const screenReaderEnabled = useScreenReaderEnabled();
  const { height: windowHeight } = useWindowDimensions();
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

  // Header sits below the status bar; scroll padding clears it, but the
  // ScrollView is full-bleed so content can pass under the overlays.
  const topInset = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;
  const bottomInset = isTablet
    ? Math.max(insets.bottom, layout.tabletScreenPadding)
    : Math.max(insets.bottom, layout.screenPaddingBottom);
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;

  const headerHeight = HEADER_HEIGHT * fontScale;
  const buttonsHeight = BUTTONS_HEIGHT * fontScale;

  // Cap min-height on short viewports (e.g. landscape) so content can still fit.
  const tabletContentMinHeight = Math.min(
    TABLET_CONTENT_MIN_HEIGHT,
    Math.max(
      0,
      windowHeight -
        topInset -
        bottomInset -
        headerHeight -
        layout.tabletSessionPaddingTop,
    ),
  );

  const buttons = (
    <View style={[styles.buttons, { height: buttonsHeight, gap: BUTTON_GAP * fontScale }]}>
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
          <Button
            title="Learn"
            onPress={() => handleChoice(onLearn)}
          />
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
            paddingTop: isTablet
              ? topInset + headerHeight + layout.tabletSessionPaddingTop
              : topInset + headerHeight,
            paddingBottom: bottomInset,
            paddingHorizontal,
            justifyContent: isTablet ? 'center' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Figma Container: max 600, full width; phone grows so Spacer can flex. */}
        <View
          style={[styles.container, !isTablet && styles.containerPhone]}
        >
          {!isTablet && <View style={styles.spacer} />}
          <View
            style={[
              styles.content,
              isTablet && { minHeight: tabletContentMinHeight },
            ]}
          >
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

      <TopGradient fillHeight={insets.top} />
      {/* Figma Header: full padded width on tablet and phone. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.header,
          { top: topInset, height: headerHeight, paddingHorizontal },
        ]}
      >
        <IconButton
          icon={<XIcon />}
          onPress={onClose}
          accessibilityLabel="Close session"
        />
        <ProgressBar progress={progress} />
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
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  containerPhone: {
    flexGrow: 1,
  },
  content: {
    gap: 24,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  spacer: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 64,
    minHeight: 24,
  },
  buttons: {
    // Height + gap set inline from fontScale so New Word (2 buttons) keeps
    // Exercise’s 4-button frame and the card doesn’t jump when modes change.
    width: '100%',
  },
});

import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import TopGradient from '../components/TopGradient';
import { XIcon } from '../components/icons/XIcon';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout } from '../theme';
import { capitalizeWord, TEST_CARD_WORD } from '../utils/text';

// Figma tablet Content frame height — keeps New Word / Exercise aligned.
const TABLET_CONTENT_MIN_HEIGHT = 656;
const HEADER_HEIGHT = 48;

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
  const isTablet = useIsTablet();
  const { height: windowHeight } = useWindowDimensions();
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

  // Cap min-height on short viewports (e.g. landscape) so content can still fit.
  const tabletContentMinHeight = Math.min(
    TABLET_CONTENT_MIN_HEIGHT,
    Math.max(
      0,
      windowHeight -
        topInset -
        bottomInset -
        HEADER_HEIGHT -
        layout.tabletSessionPaddingTop,
    ),
  );

  const buttons = (
    <View style={styles.buttons}>
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
            paddingTop: isTablet
              ? topInset + HEADER_HEIGHT + layout.tabletSessionPaddingTop
              : topInset + HEADER_HEIGHT,
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
              word={word}
              nextWord={nextWord}
              transitionTrigger={transitionTrigger}
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
        style={[styles.header, { top: topInset, paddingHorizontal }]}
      >
        <IconButton icon={<XIcon />} onPress={onClose} />
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
    height: HEADER_HEIGHT,
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
    gap: 12,
    width: '100%',
  },
});

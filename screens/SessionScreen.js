import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
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

  const screenPadding = isTablet
    ? {
        paddingTop: Math.max(insets.top, layout.tabletScreenPadding),
        paddingBottom: Math.max(insets.bottom, layout.tabletScreenPadding),
        paddingHorizontal: layout.tabletScreenPadding,
      }
    : {
        paddingTop: insets.top + layout.contentTopPadding,
        paddingBottom: Math.max(insets.bottom, layout.screenPaddingBottom),
        paddingHorizontal: layout.screenPaddingX,
      };

  // Cap min-height on short viewports (e.g. landscape) so content can still fit.
  const tabletContentMinHeight = Math.min(
    TABLET_CONTENT_MIN_HEIGHT,
    Math.max(
      0,
      windowHeight -
        screenPadding.paddingTop -
        screenPadding.paddingBottom -
        HEADER_HEIGHT -
        layout.tabletSessionPaddingTop -
        layout.tabletContentPaddingBottom,
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

  const cardStack = (
    <CardStack
      word={word}
      nextWord={nextWord}
      transitionTrigger={transitionTrigger}
      onTransitionEnd={handleTransitionEnd}
    />
  );

  const header = (
    <View style={styles.header}>
      <IconButton icon={<XIcon />} onPress={onClose} />
      <ProgressBar progress={progress} />
    </View>
  );

  return (
    <View style={[styles.screen, screenPadding]}>
      {isTablet ? (
        <>
          {/* Tablet: header spans the full padded width; card/buttons center below. */}
          {header}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.tabletScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.tabletContent,
                { minHeight: tabletContentMinHeight },
              ]}
            >
              {cardStack}
              {buttons}
            </View>
          </ScrollView>
        </>
      ) : (
        <View style={styles.phoneContainer}>
          {header}
          {/* Scroll when card + answers exceed the viewport (e.g. landscape). */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.phoneScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Absorbs extra height up to 64px so card + buttons stay grouped. */}
            <View style={styles.spacer} />
            <View style={styles.content}>
              {cardStack}
              {buttons}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
  },
  phoneContainer: {
    flex: 1,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  phoneScrollContent: {
    flexGrow: 1,
  },
  tabletScrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: layout.tabletContentPaddingBottom,
    paddingTop: layout.tabletSessionPaddingTop,
  },
  // minHeight is set inline from TABLET_CONTENT_MIN_HEIGHT (capped by viewport).
  tabletContent: {
    gap: 24,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    height: HEADER_HEIGHT,
    width: '100%',
  },
  spacer: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 64,
    minHeight: 24,
  },
  content: {
    gap: 24,
    width: '100%',
  },
  buttons: {
    gap: 12,
    width: '100%',
  },
});

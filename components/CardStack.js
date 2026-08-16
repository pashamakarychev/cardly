import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';
import { setAccessibilityFocusOn } from '../utils/accessibility';
import { capitalizeWord, TEST_CARD_WORD } from '../utils/text';

// Geometry in Figma design space (370 x 220)
const DESIGN_W = 370;
const DESIGN_H = 220;
const STACK_ASPECT_RATIO = DESIGN_W / DESIGN_H;

const FRONT = { top: 12, w: 370, h: 208 };
const BACK = { top: 0, left: 17, w: 333, h: 187.2 };

// Both cards render with the FRONT geometry; the "back" appearance is produced
// entirely by a transform (scale + center offset), so a card's text is always
// laid out once and stays visually locked to its card.
const BACK_SCALE = BACK.w / FRONT.w; // 0.9
const CENTER_DX = BACK.left + BACK.w / 2 - FRONT.w / 2; // -1.5
const CENTER_DY = BACK.top + BACK.h / 2 - (FRONT.top + FRONT.h / 2); // -22.4

const LIFT_DURATION = 200;
const SWAP_DURATION = 280;

// Survives remounts (e.g. new-word → exercise) so the first paint already has
// a width and the cards are never missing for a frame. onLayout keeps this
// current across rotation / breakpoint layout changes.
let lastStackWidth = 0;

export default function CardStack({ word, nextWord, transitionTrigger = 0, onTransitionEnd }) {
  const [stackWidth, setStackWidth] = useState(() =>
    lastStackWidth > 0 ? lastStackWidth : 1,
  );
  // Slot whose card is logically the front card (controls word assignment)
  const [frontSlot, setFrontSlot] = useState(0);
  // Slot rendered on top (flips as soon as the lift exposes the next card)
  const [topSlot, setTopSlot] = useState(0);

  // pose: 0 = front position/size/color, 1 = back position/size/color.
  // These values are never reset; each card's pose persists between rounds,
  // so the end of the animation is already the resting state.
  const posesRef = useRef([new Animated.Value(0), new Animated.Value(1)]);
  // Extra upward offset, used only by the card leaving the front slot
  const liftsRef = useRef([new Animated.Value(0), new Animated.Value(0)]);
  const frontSlotRef = useRef(0);
  // Stable a11y target so focus isn't lost when frontSlot swaps native views.
  const wordFocusRef = useRef(null);
  const skipInitialWordFocusRef = useRef(true);

  const displayWord = capitalizeWord(TEST_CARD_WORD ?? word);

  useEffect(() => {
    if (transitionTrigger === 0) {
      return;
    }

    const from = frontSlotRef.current;
    const to = 1 - from;
    const poses = posesRef.current;
    const lifts = liftsRef.current;

    // Phase 1: lift the front card up by one card height to reveal the next card
    Animated.timing(lifts[from], {
      toValue: 1,
      duration: LIFT_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      // The next card is exposed: put it on top, then swap poses in parallel.
      setTopSlot(to);

      Animated.parallel([
        Animated.timing(lifts[from], {
          toValue: 0,
          duration: SWAP_DURATION,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(poses[from], {
          toValue: 1,
          duration: SWAP_DURATION,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(poses[to], {
          toValue: 0,
          duration: SWAP_DURATION,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(({ finished: swapFinished }) => {
        if (!swapFinished) {
          return;
        }

        // Swap the logical roles. The parent advances the round in the same
        // batch, so the new front card keeps showing the exact same string.
        frontSlotRef.current = to;
        setFrontSlot(to);
        onTransitionEnd?.();
      });
    });
  }, [transitionTrigger]);

  // After each completed word (not the first mount), return TalkBack / VoiceOver
  // to the card so focus doesn't jump to Close session.
  useEffect(() => {
    if (skipInitialWordFocusRef.current) {
      skipInitialWordFocusRef.current = false;
      return;
    }
    setAccessibilityFocusOn(wordFocusRef);
  }, [word]);

  // Convert design units to on-screen pixels based on the measured width
  const px = stackWidth / DESIGN_W;
  const liftPx = FRONT.h * px;
  const dxPx = CENTER_DX * px;
  const dyPx = CENTER_DY * px;

  const renderCard = (slot) => {
    const pose = posesRef.current[slot];
    const lift = liftsRef.current[slot];
    const isFront = slot === frontSlot;
    const cardWord = capitalizeWord(
      TEST_CARD_WORD ?? (isFront ? word : nextWord),
    );

    const translateX = pose.interpolate({
      inputRange: [0, 1],
      outputRange: [0, dxPx],
    });
    const translateY = Animated.add(
      pose.interpolate({ inputRange: [0, 1], outputRange: [0, dyPx] }),
      lift.interpolate({ inputRange: [0, 1], outputRange: [0, -liftPx] }),
    );
    const scale = pose.interpolate({
      inputRange: [0, 1],
      outputRange: [1, BACK_SCALE],
    });
    const backgroundColor = pose.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.textCardSecondary, colors.textCard],
    });

    return (
      <Animated.View
        key={slot}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.card,
          {
            backgroundColor,
            zIndex: slot === topSlot ? 2 : 1,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <Text
          style={styles.word}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          importantForAccessibility="no"
        >
          {cardWord}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View
      style={styles.stack}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        lastStackWidth = width;
        setStackWidth(width);
      }}
    >
      {renderCard(0)}
      {renderCard(1)}
      {/* Stable focus target — survives card slot swaps after each round. */}
      <View
        ref={wordFocusRef}
        pointerEvents="none"
        style={styles.wordFocusTarget}
        accessible
        accessibilityRole="text"
        accessibilityLabel={displayWord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    aspectRatio: STACK_ASPECT_RATIO,
  },
  card: {
    position: 'absolute',
    top: `${(FRONT.top / DESIGN_H) * 100}%`,
    left: 0,
    width: '100%',
    height: `${(FRONT.h / DESIGN_H) * 100}%`,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  wordFocusTarget: {
    position: 'absolute',
    top: `${(FRONT.top / DESIGN_H) * 100}%`,
    left: 0,
    width: '100%',
    height: `${(FRONT.h / DESIGN_H) * 100}%`,
  },
  word: {
    ...typography.cardWord,
    color: colors.textInverse,
    textAlign: 'center',
    width: '100%',
  },
});

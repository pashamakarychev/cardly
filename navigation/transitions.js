import { TransitionSpecs } from '@react-navigation/stack';
import { Animated } from 'react-native';

// Full-width horizontal slide. `edge` is the side the incoming screen enters
// from; the outgoing screen leaves through the opposite side, so the two move
// together as a single sheet. Cards below the top one reuse the top card's
// interpolator, so both sides of a transition always agree on the direction.
const forSlideFrom = (edge) => {
  const offset = edge === 'left' ? -1 : 1;

  return function forSlide({ current, next, inverted, layouts: { screen } }) {
    const progress = Animated.add(
      current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
      next
        ? next.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          })
        : 0,
    );

    return {
      cardStyle: {
        transform: [
          {
            translateX: Animated.multiply(
              progress.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [
                  offset * screen.width, // entering, still offscreen
                  0, // focused
                  -offset * screen.width, // leaving through the other side
                ],
                extrapolate: 'clamp',
              }),
              inverted,
            ),
          },
        ],
      },
    };
  };
};

export const forSlideFromRight = forSlideFrom('right');
export const forSlideFromLeft = forSlideFrom('left');

// The same spec both ways, so the two directions feel identical; the platform
// defaults use different timings for opening and closing.
export const slideTransitionSpec = {
  open: TransitionSpecs.TransitionIOSSpec,
  close: TransitionSpecs.TransitionIOSSpec,
};

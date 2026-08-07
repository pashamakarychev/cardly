import { useEffect, useRef, useState } from 'react';

// Only show the pressed style after the finger has been held this long,
// so quick taps go straight to the result without a flash of pressed color.
export const PRESSED_DELAY_MS = 100;

export function useDelayedPressed({ disabled = false, onChange } = {}) {
  const [showPressed, setShowPressed] = useState(false);
  const pressedTimeoutRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(
    () => () => {
      if (pressedTimeoutRef.current !== null) {
        clearTimeout(pressedTimeoutRef.current);
      }
    },
    [],
  );

  const updatePressed = (value) => {
    setShowPressed(value);
    // Fired in the same event/timeout as the state update so callers can
    // batch related updates into the same render (avoids a one-frame gap).
    onChangeRef.current?.(value);
  };

  const clearPressedDelay = () => {
    if (pressedTimeoutRef.current !== null) {
      clearTimeout(pressedTimeoutRef.current);
      pressedTimeoutRef.current = null;
    }
    updatePressed(false);
  };

  return {
    showPressed: !disabled && showPressed,
    // Spread onto a Pressable. onPressOut alone is not enough to cancel the
    // delay: Pressability holds it back until the press has lasted its minimum
    // duration (130ms), which is longer than PRESSED_DELAY_MS, so even a quick
    // tap would flash. Raw touch events are not delayed, so they are what
    // actually cancels it; onPressOut still covers presses that get cancelled.
    pressProps: {
      onPressIn: () => {
        if (disabled) {
          return;
        }
        pressedTimeoutRef.current = setTimeout(() => {
          pressedTimeoutRef.current = null;
          updatePressed(true);
        }, PRESSED_DELAY_MS);
      },
      onPressOut: clearPressedDelay,
      onTouchEnd: clearPressedDelay,
      onTouchCancel: clearPressedDelay,
    },
  };
}

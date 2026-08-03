import { useEffect, useRef, useState } from 'react';

// Only show the pressed style after the finger has been held this long,
// so quick taps go straight to the result without a flash of pressed color.
export const PRESSED_DELAY_MS = 100;

export function useDelayedPressed({ disabled = false } = {}) {
  const [showPressed, setShowPressed] = useState(false);
  const pressedTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (pressedTimeoutRef.current !== null) {
        clearTimeout(pressedTimeoutRef.current);
      }
    },
    [],
  );

  const clearPressedDelay = () => {
    if (pressedTimeoutRef.current !== null) {
      clearTimeout(pressedTimeoutRef.current);
      pressedTimeoutRef.current = null;
    }
    setShowPressed(false);
  };

  return {
    showPressed: !disabled && showPressed,
    onPressIn: () => {
      if (disabled) {
        return;
      }
      pressedTimeoutRef.current = setTimeout(() => {
        pressedTimeoutRef.current = null;
        setShowPressed(true);
      }, PRESSED_DELAY_MS);
    },
    onPressOut: clearPressedDelay,
  };
}

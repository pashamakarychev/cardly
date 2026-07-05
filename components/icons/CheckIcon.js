import Svg, { Path } from 'react-native-svg';

export function CheckIcon({ size = 48, color = '#000000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M40 12L18 34L8 24"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

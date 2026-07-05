import Svg, { Path } from 'react-native-svg';

export function HomeIcon({ size = 24, color = '#000000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12H15V22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeFillIcon({ size = 24, color = '#000000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.3857 1.21134C11.7469 0.930473 12.2531 0.930473 12.6143 1.21134L21.6143 8.21134C21.8575 8.4008 22 8.69203 22 9.0004V20.0004C21.9999 20.7959 21.6836 21.559 21.1211 22.1215C20.5585 22.684 19.7956 23.0004 19 23.0004H5C4.20444 23.0004 3.4415 22.684 2.87891 22.1215C2.31639 21.559 2.00011 20.7959 2 20.0004V9.0004C2 8.69203 2.14248 8.4008 2.38574 8.21134L11.3857 1.21134ZM10 13.0004V21.0004H14V13.0004H10Z"
        fill={color}
      />
    </Svg>
  );
}

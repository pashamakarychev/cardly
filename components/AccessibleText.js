import { Text, View } from 'react-native';

/**
 * Screen-reader text that does not leak Android style spans (font size, color).
 * TalkBack reads accessibilityLabel on the wrapper; the styled Text is hidden.
 */
export default function AccessibleText({
  children,
  style,
  accessibilityLabel,
  accessibilityRole = 'text',
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  ...rest
}) {
  const label =
    accessibilityLabel ??
    (typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : undefined);

  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      // Layout bits (width, alignSelf) apply on the wrapper; font styles are ignored on View.
      style={style}
      {...rest}
    >
      <Text
        style={style}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        minimumFontScale={minimumFontScale}
        importantForAccessibility="no"
      >
        {children}
      </Text>
    </View>
  );
}

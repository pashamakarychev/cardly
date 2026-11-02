import { StyleSheet, View } from 'react-native';

import AccessibleText from './AccessibleText';
import Chip from './Chip';
import { colors, typography } from '../theme';

export default function ChipSection({
  label,
  options,
  selected,
  onSelect,
  disabledOptions = [],
  gap = 16,
}) {
  return (
    <View style={[styles.section, { gap }]} accessibilityRole="radiogroup">
      <AccessibleText style={styles.label} accessibilityRole="header">
        {label}
      </AccessibleText>
      <View style={styles.options}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={option === selected}
            disabled={disabledOptions.includes(option)}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  label: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  options: {
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
});

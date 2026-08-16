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
}) {
  return (
    <View style={styles.section} accessibilityRole="radiogroup">
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
    gap: 16,
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

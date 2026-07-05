import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';
import Chip from './Chip';

export default function ChipSection({ label, options, selected, onSelect }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={option === selected}
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

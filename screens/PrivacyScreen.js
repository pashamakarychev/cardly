import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccessibleText from '../components/AccessibleText';
import IconButton from '../components/IconButton';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { colors, typography } from '../theme';

const sections = [
  {
    heading: 'Who we are',
    body: 'Cardly is a language-learning app. The Cardly operator controls the personal data described here. For privacy questions or requests, email pashamakarychev212@gmail.com.',
  },
  {
    heading: 'Information we use',
    body: 'When you create an account, we use your email address, an account identifier, and authentication information. Passwords are handled by our authentication provider; Cardly does not store your password in its study database. We also use your selected languages, learning level, daily word limit, active words, answers, review schedule, session progress, and related timestamps to deliver the learning service.',
  },
  {
    heading: 'Local storage and synchronization',
    body: 'Cardly stores your settings and learning data on your device so the app can work offline. On the web, it uses browser storage, including IndexedDB. On mobile, it uses local app storage. When you sign in, Cardly synchronizes your settings, active words, learning progress, and session data with Supabase so they can be available across your devices. The bundled dictionary and translations are shared app content.',
  },
  {
    heading: 'Analytics',
    body: 'Native Cardly builds use Microsoft Clarity to understand how people interact with the app. Clarity may collect interaction events, device and app information, and session replays. This can include screens you visit and actions you take. Clarity is not initialized by Cardly on the web. The Analytics control currently shown in Settings does not change data collection.',
  },
  {
    heading: 'Why we process data',
    body: 'We use account and study data to provide the service, authenticate you, save and synchronize your progress, and respond to password reset requests. Where applicable, the legal basis is performance of our service agreement. We use operational information to maintain security and reliability. We use Clarity to improve the app; the applicable legal basis and any consent requirement depend on your location.',
  },
  {
    heading: 'Service providers and transfers',
    body: 'Supabase provides account authentication, cloud storage, and synchronization. Microsoft provides Clarity analytics in native builds. Cloudflare serves the web app and may process request metadata such as IP addresses and browser information. These providers may process information in countries outside your own. Their privacy and transfer arrangements apply to their services.',
  },
  {
    heading: 'How long we keep information',
    body: 'Account and synchronized learning data remain while your account is in use, unless you request deletion or a longer period is required for legal or security reasons. Local app data can remain on a device after you sign out. Service-provider logs and backups may remain for their applicable retention periods. Microsoft states that Clarity playback data is normally retained for 30 days and click and heatmap data for up to 9 months.',
  },
  {
    heading: 'Your choices and rights',
    body: 'You can change learning preferences in Settings and sign out at any time. Depending on your location, you may request access, correction, export, or deletion of your personal data, object to or restrict some processing, withdraw consent where consent is used, and complain to a data protection authority. Email pashamakarychev212@gmail.com to make a request. Signing out does not delete your account or data.',
  },
  {
    heading: 'Children and changes',
    body: 'Cardly is a general language-learning app and is not designed specifically for children. We may update this policy when the app or our data practices change. The updated date below shows when this version was prepared.',
  },
];

export default function PrivacyScreen({ onBack }) {
  const insets = useSafeAreaInsets();

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.content, {
      paddingTop: Math.max(insets.top, 24) + 24,
      paddingBottom: Math.max(insets.bottom, 32) + 32,
    }]}>
      <View style={styles.header}>
        <IconButton icon={<ChevronLeftIcon />} onPress={onBack} accessibilityLabel="Back" />
        <AccessibleText style={styles.title} accessibilityRole="header">Privacy policy</AccessibleText>
      </View>
      <AccessibleText style={styles.date}>Last updated 5 November 2026</AccessibleText>
      <AccessibleText style={styles.body}>This policy explains how Cardly handles information when you use the mobile app or web app.</AccessibleText>
      <Pressable accessibilityRole="link" accessibilityLabel="Email Cardly about privacy" onPress={() => Linking.openURL('mailto:pashamakarychev212@gmail.com')}>
        <AccessibleText style={styles.link}>pashamakarychev212@gmail.com</AccessibleText>
      </Pressable>
      {sections.map(({ heading, body }) => <View key={heading} style={styles.section}>
        <AccessibleText style={styles.heading} accessibilityRole="header">{heading}</AccessibleText>
        <AccessibleText style={styles.body}>{body}</AccessibleText>
      </View>)}
      <AccessibleText style={styles.body}>For more information about our providers, see their privacy notices.</AccessibleText>
      {[
        ['Microsoft privacy statement', 'https://www.microsoft.com/privacy/privacystatement'],
        ['Supabase privacy policy', 'https://supabase.com/privacy'],
        ['Cloudflare privacy policy', 'https://www.cloudflare.com/privacypolicy/'],
      ].map(([label, url]) => (
        <Pressable key={url} accessibilityRole="link" accessibilityLabel={label} onPress={() => Linking.openURL(url)}>
          <AccessibleText style={styles.link}>{label}</AccessibleText>
        </Pressable>
      ))}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { alignSelf: 'center', maxWidth: 720, width: '100%', paddingHorizontal: 24, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { ...typography.h2, color: colors.textPrimary, flexShrink: 1 },
  date: { ...typography.caption, color: colors.textSecondary },
  section: { gap: 8 },
  heading: { ...typography.h3, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
  link: { ...typography.body, color: colors.primary, textDecorationLine: 'underline' },
});

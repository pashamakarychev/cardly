import { useScreenEdgePadding } from '../hooks/useScreenEdgePadding';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSQLiteContext } from '../db/SQLiteProvider';
import AccessibleText from '../components/AccessibleText';
import BottomGradient from '../components/BottomGradient';
import { NAV_HEIGHT } from '../components/BottomNavigation';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import SettingsPicker from '../components/SettingsPicker';
import SettingsRow, { SettingsToggle } from '../components/SettingsRow';
import TopGradient from '../components/TopGradient';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { LEARN_LANGUAGES, LEVELS, SPEAK_LANGUAGES, WORDS_PER_DAY } from '../constants/preferences';
import { updateSettings } from '../db/repository';
import { useFontScale } from '../hooks/useFontScale';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

const HEADER_HEIGHT = 48;

function ChoiceRow({ label, value, onOpen, down }) {
  const ref = useRef(null);
  return <View ref={ref} collapsable={false}>
    <SettingsRow label={label} value={value} down={down} onPress={() =>
      ref.current?.measureInWindow((x, y, width, height) => onOpen({ x, y: y + height, width }))} />
  </View>;
}

export default function SettingsScreen({ preferences, onPreferencesChange, onAnalyticsChange, onBack, userEmail, onChangePassword, onLogOut, onPrivacyPress }) {
  const db = useSQLiteContext();
  const { isDesktop, top: topInset, bottom: navBottom } = useScreenEdgePadding();
  const isTablet = useIsTablet();
  const fontScale = useFontScale();
  const { height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(733);
  const headerHeight = HEADER_HEIGHT * fontScale;
  const navHeight = NAV_HEIGHT * fontScale;
  const paddingHorizontal = isDesktop ? layout.desktopScreenPaddingX : isTablet ? layout.tabletScreenPaddingX : layout.screenPaddingX;
  const bottomClearance = navBottom + navHeight + layout.contentToOverlayGap;
  const baseBottom = navBottom;
  const centeredBottom = (height + topInset - baseBottom + contentHeight) / 2;
  const centered = isDesktop
    ? height >= contentHeight + topInset + baseBottom
    : isTablet && centeredBottom <= height - navBottom - navHeight;
  const [speaks, setSpeaks] = useState(preferences?.speaks ?? 'English');
  const [learning, setLearning] = useState(preferences?.learning ?? 'Spanish');
  const [level, setLevel] = useState(preferences?.level ?? 'Beginner');
  const [wordsPerDay, setWordsPerDay] = useState(preferences?.wordsPerDay ?? '10');
  const [analytics, setAnalytics] = useState(preferences?.analytics ?? 'unknown');
  const analyticsSaving = useRef(false);
  const [picker, setPicker] = useState(null);
  const [languageDialog, setLanguageDialog] = useState(null);
  const [showLogOutDialog, setShowLogOutDialog] = useState(false);

  useEffect(() => {
    if (!preferences) return;
    setSpeaks(preferences.speaks);
    setLearning(preferences.learning);
    setLevel(preferences.level);
    setWordsPerDay(preferences.wordsPerDay);
    setAnalytics(preferences.analytics ?? 'unknown');
  }, [preferences]);
  useEffect(() => setPicker(null), [isTablet, isDesktop]);

  const notify = (patch) => onPreferencesChange?.({ speaks, learning, level, wordsPerDay, analytics, ...patch });
  const toggleAnalytics = async () => {
    if (analyticsSaving.current) return;
    analyticsSaving.current = true;
    const next = analytics === 'accepted' ? 'rejected' : 'accepted';
    setAnalytics(next);
    notify({ analytics: next });
    onAnalyticsChange?.(next);
    try {
      await updateSettings(db, { analytics: next });
    } catch (error) {
      setAnalytics(analytics);
      notify({ analytics });
      onAnalyticsChange?.(analytics);
      console.error(error);
    } finally {
      analyticsSaving.current = false;
    }
  };
  const choices = {
    speaks: { label: 'I speak', options: SPEAK_LANGUAGES, selected: speaks, disabledOptions: [learning], onSelect: async (value) => {
      if (value === learning || value === speaks) return;
      setSpeaks(value); notify({ speaks: value }); await updateSettings(db, { nativeLanguage: value });
    } },
    learning: { label: 'I want to learn', options: LEARN_LANGUAGES, selected: learning, disabledOptions: [speaks], onSelect: async (value) => {
      if (value === speaks || value === learning) return;
      const previousLanguage = learning;
      setLearning(value); notify({ learning: value }); await updateSettings(db, { learningLanguage: value });
      setLanguageDialog({ previousLanguage, nextLanguage: value });
    } },
    level: { label: 'My level', options: LEVELS, selected: level, onSelect: async (value) => {
      if (value === level) return;
      setLevel(value); notify({ level: value }); await updateSettings(db, { level: value });
    } },
    wordsPerDay: { label: 'New words per day', options: WORDS_PER_DAY, selected: wordsPerDay, onSelect: async (value) => {
      if (value === wordsPerDay) return;
      setWordsPerDay(value); notify({ wordsPerDay: value }); await updateSettings(db, { newWordsPerDay: value });
    } },
  };
  const choice = picker && choices[picker.key];
  const open = (key, anchor) => setPicker({ key, anchor });

  return <View style={[styles.screen, Platform.OS === 'web' && styles.webScreen]}>
    <ScrollView style={[styles.scroll, Platform.OS === 'web' && styles.webScroll]} contentContainerStyle={[
      styles.scrollContent, isTablet && styles.scrollContentTablet,
      { paddingTop: isTablet ? topInset : topInset + headerHeight + 24, paddingHorizontal,
        paddingBottom: centered ? baseBottom : bottomClearance },
    ]} showsVerticalScrollIndicator={false}>
      <View style={styles.container} onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}>
        {isTablet && <AccessibleText style={styles.tabletTitle} accessibilityRole="header">Settings</AccessibleText>}
        <View style={styles.group}>
          <View style={styles.accountRow}>
            <AccessibleText style={styles.accountTitle}>Account</AccessibleText>
            <AccessibleText style={styles.accountEmail} numberOfLines={1}>{userEmail ?? ''}</AccessibleText>
          </View>
          <SettingsRow label="Change password" onPress={onChangePassword} />
        </View>
        <View style={styles.group}>
          <ChoiceRow label="I speak" value={speaks} down={isTablet} onOpen={(anchor) => open('speaks', anchor)} />
          <ChoiceRow label="I want to learn" value={learning} down={isTablet} onOpen={(anchor) => open('learning', anchor)} />
          <ChoiceRow label="My level" value={level} down={isTablet} onOpen={(anchor) => open('level', anchor)} />
        </View>
        <View style={styles.group}>
          <ChoiceRow label="New words per day" value={wordsPerDay} down={isTablet} onOpen={(anchor) => open('wordsPerDay', anchor)} />
        </View>
        <View style={styles.group}>
          <SettingsRow label="Analytics" trailing={<SettingsToggle value={analytics === 'accepted'} />}
            onPress={toggleAnalytics} accessibilityRole="switch"
            accessibilityState={{ checked: analytics === 'accepted' }} />
          <SettingsRow label="Privacy Policy" onPress={onPrivacyPress} />
        </View>
        <View style={styles.group}><SettingsRow label="Log out" danger onPress={() => setShowLogOutDialog(true)} /></View>
      </View>
    </ScrollView>
    {!isTablet && <TopGradient fillHeight={topInset} />}
    <View pointerEvents="box-none" style={[styles.header, { top: topInset, height: headerHeight, paddingHorizontal }]}>
      <IconButton icon={<ChevronLeftIcon />} onPress={onBack} accessibilityLabel="Back" />
      {!isTablet && <AccessibleText style={styles.title} accessibilityRole="header">Settings</AccessibleText>}
      {!isTablet && <View style={{ width: headerHeight }} />}
    </View>
    <BottomGradient bottom={navBottom} height={navHeight} />
    <SettingsPicker visible={!!choice} options={choice?.options ?? []} selected={choice?.selected}
      disabledOptions={choice?.disabledOptions} onSelect={choice?.onSelect} onClose={() => setPicker(null)}
      mobile={!isTablet} anchor={picker?.anchor} />
    <Dialog visible={languageDialog != null} title={`You're now learning ${languageDialog?.nextLanguage ?? ''}`}
      description={`Your ${languageDialog?.previousLanguage ?? ''} progress is saved. You can switch back anytime.`}
      onConfirm={() => setLanguageDialog(null)} />
    <Dialog visible={showLogOutDialog} title="Log out?"
      description="Are you sure you want to log out?" confirmLabel="Log out"
      onCancel={() => setShowLogOutDialog(false)}
      onConfirm={() => { setShowLogOutDialog(false); onLogOut?.(); }} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  webScreen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  scroll: { flex: 1 },
  webScroll: { overscrollBehaviorY: 'none' },
  scrollContent: { alignItems: 'center', flexGrow: 1 },
  scrollContentTablet: { justifyContent: 'center' },
  container: { gap: 24, maxWidth: layout.maxContentWidth, width: '100%' },
  group: { backgroundColor: colors.background, borderRadius: 32, overflow: 'hidden', width: '100%' },
  accountRow: { justifyContent: 'center', minHeight: 72, paddingHorizontal: 24, paddingVertical: 16, gap: 4 },
  accountTitle: { ...typography.h3, color: colors.textPrimary },
  accountEmail: { ...typography.caption, color: colors.textSecondary },
  tabletTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 0, position: 'absolute', right: 0, zIndex: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
});

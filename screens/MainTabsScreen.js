import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { TAB_KEYS } from '../components/BottomNavigation';
import HomeScreen from './HomeScreen';
import SettingsScreen from './SettingsScreen';

// Horizontal paging host for bottom-nav tabs. The screen tracks the finger
// during a swipe (like Instagram/Telegram); tab bar taps call setPage.
const MainTabsScreen = forwardRef(function MainTabsScreen(
  {
    onPageIndexChange,
    homeProps,
    settingsProps,
  },
  ref,
) {
  const scrollRef = useRef(null);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);
  // Ignore programmatic scrolls so they don't echo back as page changes.
  const programmaticRef = useRef(false);

  useImperativeHandle(ref, () => ({
    setPage(index, animated = true) {
      const pageWidth = widthRef.current;
      if (pageWidth <= 0 || index < 0 || index >= TAB_KEYS.length) {
        return;
      }
      programmaticRef.current = animated;
      scrollRef.current?.scrollTo({
        x: index * pageWidth,
        y: 0,
        animated,
      });
      if (!animated) {
        programmaticRef.current = false;
      }
    },
  }));

  const syncPageFromOffset = (x) => {
    const pageWidth = widthRef.current;
    if (pageWidth <= 0) {
      return;
    }
    const index = Math.max(
      0,
      Math.min(TAB_KEYS.length - 1, Math.round(x / pageWidth)),
    );
    onPageIndexChange?.(index);
  };

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth === widthRef.current) {
          return;
        }
        widthRef.current = nextWidth;
        setWidth(nextWidth);
      }}
    >
      {width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          nestedScrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            programmaticRef.current = false;
          }}
          onScroll={(event) => {
            if (programmaticRef.current) {
              return;
            }
            // Update the tab highlight as soon as the finger crosses mid-page.
            syncPageFromOffset(event.nativeEvent.contentOffset.x);
          }}
          onMomentumScrollEnd={(event) => {
            programmaticRef.current = false;
            syncPageFromOffset(event.nativeEvent.contentOffset.x);
          }}
          scrollEventThrottle={16}
          style={styles.pager}
        >
          <View style={{ width }}>
            <HomeScreen {...homeProps} />
          </View>
          <View style={{ width }}>
            <SettingsScreen {...settingsProps} />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
});

export default MainTabsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
});

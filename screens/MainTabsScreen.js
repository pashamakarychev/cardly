import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { TAB_KEYS } from '../components/BottomNavigation';
import HomeScreen from './HomeScreen';
import SettingsScreen from './SettingsScreen';

function TabPage({ active, width, children }) {
  // Keep swipeable pages mounted, but never expose inactive ones to
  // TalkBack / VoiceOver (including mid-gesture when both are on screen).
  return (
    <View
      style={{ width }}
      aria-hidden={!active}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'yes' : 'no-hide-descendants'}
      pointerEvents={active ? 'auto' : 'none'}
    >
      {children}
    </View>
  );
}

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
  const pageIndexRef = useRef(0);
  const [width, setWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  // null = not resolved yet; avoid mounting both pages before we know.
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(null);
  // Ignore programmatic scrolls so they don't echo back as page changes.
  const programmaticRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) {
        setScreenReaderEnabled(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setPage(index, animated = true) {
      const pageWidth = widthRef.current;
      if (index < 0 || index >= TAB_KEYS.length) {
        return;
      }
      pageIndexRef.current = index;
      setPageIndex(index);

      // Screen readers only mount the active page — no horizontal offset to sync.
      if (screenReaderEnabled || pageWidth <= 0) {
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
  }), [screenReaderEnabled]);

  const syncPageFromOffset = (x) => {
    const pageWidth = widthRef.current;
    if (pageWidth <= 0) {
      return;
    }
    const index = Math.max(
      0,
      Math.min(TAB_KEYS.length - 1, Math.round(x / pageWidth)),
    );
    pageIndexRef.current = index;
    setPageIndex(index);
    onPageIndexChange?.(index);
  };

  if (screenReaderEnabled == null) {
    return <View style={styles.container} />;
  }

  // With TalkBack / VoiceOver on, only the active tab exists in the tree so
  // focus cannot walk into the other tab’s content after the last Home control.
  if (screenReaderEnabled) {
    return (
      <View style={styles.container}>
        {pageIndex === 0 ? (
          <HomeScreen {...homeProps} />
        ) : (
          <SettingsScreen {...settingsProps} />
        )}
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth === widthRef.current) {
          return;
        }
        const hadWidth = widthRef.current > 0;
        widthRef.current = nextWidth;
        setWidth(nextWidth);
        // Rotation / split-view can change page width; keep the active tab
        // snapped so Home/Settings aren't left mid-page with a stale offset.
        if (hadWidth) {
          programmaticRef.current = false;
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
              x: pageIndexRef.current * nextWidth,
              y: 0,
              animated: false,
            });
          });
        }
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
          <TabPage active={pageIndex === 0} width={width}>
            <HomeScreen {...homeProps} />
          </TabPage>
          <TabPage active={pageIndex === 1} width={width}>
            <SettingsScreen {...settingsProps} />
          </TabPage>
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

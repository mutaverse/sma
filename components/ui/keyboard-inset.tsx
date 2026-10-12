import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { spacing } from '@/constants/layout';

const KeyboardScrollContext = createContext<(() => void) | null>(null);

let activeScrollToken: object | null = null;

type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

export function useKeyboardOverlap() {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      setOverlap(overlapFromEvent(event));
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setOverlap(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return overlap;
}

export function useKeyboardScrollOnFocus() {
  const scroll = useContext(KeyboardScrollContext);
  return useCallback(() => {
    setTimeout(() => scroll?.(), 80);
  }, [scroll]);
}

type KeyboardAwareScrollViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
  showsVerticalScrollIndicator?: boolean;
  bounces?: boolean;
};

export function KeyboardAwareScrollView({
  children,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode,
  showsVerticalScrollIndicator,
  bounces,
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const overlap = useKeyboardOverlap();
  const { onFocus, engaged } = useScrollToFocused(scrollRef, scrollY, overlap);

  return (
    <KeyboardScrollContext.Provider value={onFocus}>
      <ScrollView
        ref={scrollRef}
        style={style}
        contentContainerStyle={[
          contentContainerStyle,
          extraBottomPadding(contentContainerStyle, engaged ? overlap : 0),
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        bounces={bounces}
        onScroll={rememberOffset(scrollY)}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </KeyboardScrollContext.Provider>
  );
}

export function KeyboardScrollProvider({
  scrollRef,
  scrollY,
  overlap,
  children,
}: {
  scrollRef: RefObject<ScrollView | null>;
  scrollY: RefObject<number>;
  overlap: number;
  children: ReactNode;
}) {
  const { onFocus } = useScrollToFocused(scrollRef, scrollY, overlap);
  return <KeyboardScrollContext.Provider value={onFocus}>{children}</KeyboardScrollContext.Provider>;
}

function useScrollToFocused(
  scrollRef: RefObject<ScrollView | null>,
  scrollY: RefObject<number>,
  overlap: number,
) {
  const overlapRef = useRef(overlap);
  const token = useRef({});
  const [engaged, setEngaged] = useState(false);
  overlapRef.current = overlap;

  const scrollToFocused = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput() as Measurable | null;
    const scroll = scrollRef.current;
    const keyboardOverlap = overlapRef.current;
    if (!input?.measureInWindow || !scroll || keyboardOverlap <= 0) {
      return;
    }

    input.measureInWindow((_x, y, _width, height) => {
      const visibleBottom = Dimensions.get('window').height - keyboardOverlap - spacing.lg;
      const inputBottom = y + height;
      if (inputBottom <= visibleBottom) {
        return;
      }
      scroll.scrollTo({
        y: scrollY.current + inputBottom - visibleBottom,
        animated: true,
      });
    });
  }, [scrollRef, scrollY]);

  const activate = useCallback(() => {
    activeScrollToken = token.current;
    setEngaged(true);
    setTimeout(scrollToFocused, 80);
  }, [scrollToFocused]);

  useEffect(() => {
    if (overlap <= 0) {
      if (activeScrollToken === token.current) {
        activeScrollToken = null;
      }
      setEngaged(false);
      return;
    }
    if (activeScrollToken !== token.current) {
      return;
    }
    const timer = setTimeout(scrollToFocused, 60);
    return () => clearTimeout(timer);
  }, [overlap, scrollToFocused]);

  return { onFocus: activate, engaged };
}

function overlapFromEvent(event: KeyboardEvent) {
  const { height, screenY } = event.endCoordinates;
  if (screenY > 0) {
    const screenHeight = Dimensions.get('screen').height;
    const cover = screenHeight - screenY;
    if (cover > 0 && cover < screenHeight) {
      return cover;
    }
  }
  return height > 0 ? height : 0;
}

function extraBottomPadding(style: StyleProp<ViewStyle> | undefined, extra: number) {
  if (extra <= 0) {
    return null;
  }
  const current = StyleSheet.flatten(style)?.paddingBottom;
  const base = typeof current === 'number' ? current : 0;
  return { paddingBottom: base + extra };
}

function rememberOffset(scrollY: RefObject<number>) {
  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };
}

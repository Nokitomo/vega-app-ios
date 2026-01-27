import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Easing} from 'react-native-reanimated';

const SHIMMER_DURATION_MS = 1500;
let sharedAnimatedValue: Animated.Value | null = null;
let sharedAnimation: Animated.CompositeAnimation | null = null;
let sharedUsers = 0;
let sharedActive = false;

const getSharedAnimatedValue = () => {
  if (!sharedAnimatedValue) {
    sharedAnimatedValue = new Animated.Value(0);
  }
  return sharedAnimatedValue;
};

const startSharedShimmer = () => {
  if (sharedActive) {
    return;
  }
  sharedActive = true;

  const run = () => {
    if (!sharedActive) {
      return;
    }
    const animatedValue = getSharedAnimatedValue();
    animatedValue.setValue(0);
    sharedAnimation = Animated.timing(animatedValue, {
      toValue: 1,
      duration: SHIMMER_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    sharedAnimation.start(({finished}) => {
      if (finished && sharedActive) {
        run();
      }
    });
  };

  run();
};

const stopSharedShimmer = () => {
  sharedActive = false;
  sharedAnimation?.stop();
  sharedAnimation = null;
};

type SkeletonLoaderProps = {
  width: number | string;
  height: number | string;
  style?: any;
  darkMode?: boolean;
  marginVertical?: number;
  children?: React.ReactNode;
  show?: boolean;
};
const SkeletonLoader = ({
  width,
  height,
  style,
  darkMode = true,
  marginVertical = 8,
  children,
  show = true,
}: SkeletonLoaderProps) => {
  const animatedValue = useRef(getSharedAnimatedValue()).current;

  useEffect(() => {
    sharedUsers += 1;
    if (sharedUsers === 1) {
      startSharedShimmer();
    }

    return () => {
      sharedUsers = Math.max(sharedUsers - 1, 0);
      if (sharedUsers === 0) {
        stopSharedShimmer();
      }
    };
  }, []);

  const lightColors = ['#E0E0E0', '#F5F5F5', '#E0E0E0'];
  const darkColors = ['#333333', '#444', '#333333'];
  const colors = darkMode ? darkColors : lightColors;

  const animationWidth = typeof width === 'string' ? 200 : width;
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-animationWidth, animationWidth],
  });

  if (children && !show) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.skeleton, {width, height, marginVertical}, style]}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{translateX}],
        }}>
        <LinearGradient
          colors={colors}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={[{width: '100%', height: '100%'}]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    borderRadius: 5,
    // based on dark mode
    backgroundColor: '#333',
  },
});

export default SkeletonLoader;

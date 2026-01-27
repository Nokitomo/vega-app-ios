import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Easing} from 'react-native-reanimated';

type SkeletonLoaderProps = {
  width: number;
  height: number;
  style?: any;
  darkMode?: boolean;
  marginVertical?: number;
};
const SkeletonLoader = ({
  width,
  height,
  style,
  darkMode = true,
  marginVertical = 8,
}: SkeletonLoaderProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isActiveRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;

    const startShimmer = () => {
      animatedValue.setValue(0);
      animationRef.current = Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animationRef.current.start(({finished}) => {
        if (finished && isActiveRef.current) {
          startShimmer();
        }
      });
    };

    startShimmer();

    return () => {
      isActiveRef.current = false;
      animationRef.current?.stop();
      animationRef.current = null;
    };
  }, [animatedValue]);

  const lightColors = ['#E0E0E0', '#F5F5F5', '#E0E0E0'];
  const darkColors = ['#333333', '#444', '#333333'];
  const colors = darkMode ? darkColors : lightColors;

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

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

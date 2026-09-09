import React from 'react';
import { StyleProp, ViewStyle, View } from 'react-native';
import Svg, { Rect, Path, Polygon, G } from 'react-native-svg';

export interface AyeFinanceLogoProps {
  size?: number;
  variant?: 'official' | 'monogram' | 'light';
  style?: StyleProp<ViewStyle>;
}

export const AyeFinanceLogo: React.FC<AyeFinanceLogoProps> = ({
  size = 48,
  variant = 'official',
  style,
}) => {
  const isLight = variant === 'light';
  const isMonogram = variant === 'monogram';

  const glyphColor = isLight ? '#000000' : '#FFFFFF';
  const amberColor = isLight ? '#E68A00' : '#FE9D01';
  const amberStroke = isLight ? '#FFFFFF' : '#000000';
  const borderColor = isLight ? '#000000' : '#FFFFFF';
  const bgColor = isLight ? '#FFFFFF' : '#000000';

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
        {!isMonogram && (
          <>
            <Rect width="1024" height="1024" rx="224" fill={bgColor} />
            <Rect
              x="56"
              y="56"
              width="912"
              height="912"
              rx="176"
              fill="none"
              stroke={borderColor}
              strokeWidth="22"
            />
          </>
        )}

        <G id="ayefinance-dollar-glyph">
          {/* Vertical Management Spine */}
          <Rect x="472" y="210" width="80" height="604" fill={glyphColor} />

          {/* Top Horizontal Hook of the $ */}
          <Path
            d="M 340 290 L 684 290 L 684 370 L 420 370 L 420 472 L 340 472 Z"
            fill={glyphColor}
          />

          {/* Middle Horizontal Crossbar */}
          <Path
            d="M 340 472 L 684 472 L 684 552 L 340 552 Z"
            fill={glyphColor}
          />

          {/* Bottom Horizontal Hook of the $ */}
          <Path
            d="M 684 734 L 340 734 L 340 654 L 604 654 L 604 552 L 684 552 Z"
            fill={glyphColor}
          />

          {/* Central Cyber-Amber Diamond (Capital / Patrimonio) */}
          <Polygon
            points="512,456 568,512 512,568 456,512"
            fill={amberColor}
            stroke={amberStroke}
            strokeWidth="14"
            strokeLinejoin="miter"
          />
        </G>
      </Svg>
    </View>
  );
};

import React, { useState } from 'react';
import { Image, View, Text } from 'react-native';

export function ImageWithFallback({ uri, style, fallbackIcon, resizeMode = 'cover' }) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F1F5F9' }]}>
        <Text style={{ fontSize: style?.height ? Math.min(style.height * 0.4, 48) : 32 }}>
          {fallbackIcon || '🏢'}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

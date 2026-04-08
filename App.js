import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import AchAquiMain from './src/AchAqui_Main';
import { useAuthSession } from './src/hooks/useAuthSession';
import { backendApi } from './src/lib/backendApi';
import { BACKEND_URL } from './src/lib/runtimeConfig';

export default function App() {
	return <AppShell />;
}

function SplashScreen() {
	const fadeAnim  = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.88)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
			Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
		]).start();
	}, []);

	return (
		<View style={s.splash}>
			<Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
				<Image
					source={require('./assets/icon.png')}
					style={s.logo}
					resizeMode="contain"
				/>
				<Text style={s.brand}>AchAqui</Text>
				<Text style={s.tagline}>Descubra o melhor perto de ti</Text>
			</Animated.View>
			<ActivityIndicator style={s.spinner} size="small" color="#D32323" />
		</View>
	);
}

function AppShell() {
	const authSession = useAuthSession();

	useEffect(() => {
		console.log('[BOOT]', BACKEND_URL);
	}, []);

	useEffect(() => {
		if (!authSession.accessToken) return;
		backendApi.getMe(authSession.accessToken).catch(() => {
			authSession.saveSession(null);
		});
	}, [authSession.accessToken]);

	if (authSession.loading) {
		return <SplashScreen />;
	}

	return <AchAquiMain />;
}

const s = StyleSheet.create({
	splash:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
	logo:    { width: 200, height: 200, marginBottom: 8 },
	brand:   { fontSize: 36, fontWeight: '900', color: '#D32323', letterSpacing: -1, marginTop: 4 },
	tagline: { fontSize: 14, color: '#555', marginTop: 4, fontWeight: '500' },
	spinner: { position: 'absolute', bottom: 60 },
});
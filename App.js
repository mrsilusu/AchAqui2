import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AchAquiMain from './src/AchAqui_Main';
import { useAuthSession } from './src/hooks/useAuthSession';
import { backendApi } from './src/lib/backendApi';
import { BACKEND_URL } from './src/lib/runtimeConfig';

export default function App() {
	return <AppShell />;
}

function AppShell() {
	const authSession = useAuthSession();

	useEffect(() => {
		console.log('[BOOT]', BACKEND_URL);
	}, []);

	// Validar sessão guardada contra o servidor
	useEffect(() => {
		if (!authSession.accessToken) return;
		backendApi.getMe(authSession.accessToken).catch(() => {
			authSession.saveSession(null);
		});
	}, [authSession.accessToken]);

	// Só loading enquanto lê o AsyncStorage (< 300ms)
	if (authSession.loading) {
		return (
			<View style={s.centered}>
				<ActivityIndicator size="large" color="#D32323" />
				<Text style={s.txt}>A carregar...</Text>
			</View>
		);
	}

	// App sempre visível — AuthModal dentro do ProfileTab trata do login
	return <AchAquiMain />;
}

const s = StyleSheet.create({
	centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
	txt: { marginTop: 10, color: '#666', fontSize: 14 },
});
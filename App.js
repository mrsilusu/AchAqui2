import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AchAquiMain from './src/AchAqui_Main';
import { useAuthSession } from './src/hooks/useAuthSession';
import { backendApi } from './src/lib/backendApi';
import { BACKEND_URL } from './src/lib/runtimeConfig';

const FORCE_LOGOUT_ON_START = true;

export default function App() {
	return <AuthGate />;
}

function AuthGate() {
	const authSession = useAuthSession();
	const [email, setEmail] = useState('owner@achaqui.com');
	const [password, setPassword] = useState('AchAquiTest123');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [forcedOnce, setForcedOnce] = useState(false);

	useEffect(() => {
		if (!FORCE_LOGOUT_ON_START || forcedOnce || authSession.loading) return;

		authSession
			.saveSession(null)
			.then(() => authSession.reloadSession())
			.finally(() => setForcedOnce(true));
	}, [authSession, forcedOnce]);

	useEffect(() => {
		if (!authSession.accessToken) return;

		backendApi.getMe(authSession.accessToken).catch((apiError) => {
			console.error('[AuthGate][SESSION_INVALID]', {
				reason: apiError?.type || 'unknown',
				status: apiError?.status || null,
				url: apiError?.url || null,
				message: apiError?.message || 'Sessão inválida.',
			});
			authSession.saveSession(null);
		});
	}, [authSession]);

	const canShowApp = useMemo(
		() => Boolean(authSession.user && authSession.accessToken && !authSession.loading),
		[authSession.accessToken, authSession.loading, authSession.user],
	);

	const handleSignIn = async () => {
		setError('');
		setSubmitting(true);
		try {
			const session = await backendApi.signIn({ email: email.trim(), password });
			await authSession.saveSession(session);
		} catch (apiError) {
			setError(apiError?.message || 'Falha no login.');
		} finally {
			setSubmitting(false);
		}
	};

	if (authSession.loading || (!forcedOnce && FORCE_LOGOUT_ON_START)) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#D32323" />
				<Text style={styles.loadingText}>A preparar autenticação...</Text>
			</View>
		);
	}

	if (!canShowApp) {
		return (
			<View style={styles.authWrap}>
				<Text style={styles.title}>Login AchAqui</Text>
				<Text style={styles.subtitle}>Backend: {BACKEND_URL}</Text>
				<TextInput
					style={styles.input}
					autoCapitalize="none"
					keyboardType="email-address"
					placeholder="Email"
					value={email}
					onChangeText={setEmail}
				/>
				<TextInput
					style={styles.input}
					secureTextEntry
					placeholder="Senha"
					value={password}
					onChangeText={setPassword}
				/>
				{!!error && <Text style={styles.error}>{error}</Text>}
				<TouchableOpacity
					style={[styles.button, submitting && styles.buttonDisabled]}
					onPress={handleSignIn}
					disabled={submitting}
				>
					<Text style={styles.buttonText}>{submitting ? 'A entrar...' : 'Entrar'}</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			<AchAquiMain />
			<TouchableOpacity
				style={styles.logoutBtn}
				onPress={() => authSession.saveSession(null)}
			>
				<Text style={styles.logoutText}>Logout</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 10,
		color: '#444',
	},
	authWrap: {
		flex: 1,
		paddingHorizontal: 24,
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 28,
		fontWeight: '800',
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 12,
		color: '#666',
		marginBottom: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 10,
	},
	button: {
		backgroundColor: '#D32323',
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.65,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '700',
	},
	error: {
		color: '#B00020',
		marginBottom: 8,
	},
	logoutBtn: {
		position: 'absolute',
		top: 56,
		right: 12,
		backgroundColor: '#000000AA',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		zIndex: 999,
	},
	logoutText: {
		color: '#fff',
		fontWeight: '700',
	},
});
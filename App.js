import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AchAquiMain from './src/AchAqui_Main';

export default function App() {
	return (
		<SafeAreaProvider>
			<AchAquiMain />
		</SafeAreaProvider>
	);
}
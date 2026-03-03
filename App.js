import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AcheiAquiMain from './src/AcheiAqui_Main';

export default function App() {
	return (
		<SafeAreaProvider>
			<AcheiAquiMain />
		</SafeAreaProvider>
	);
}
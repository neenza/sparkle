import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { PDFProvider } from './src/context/PDFContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <PDFProvider>
        <AppNavigator />
      </PDFProvider>
    </SafeAreaProvider>
  );
}

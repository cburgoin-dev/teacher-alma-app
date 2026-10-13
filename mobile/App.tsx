import { useSyncExternalStore } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

const devIdentity = typeof __DEV__ !== 'undefined' && __DEV__
  ? (require('./src/dev/diagnosticIdentity') as typeof import('./src/dev/diagnosticIdentity')).diagnosticIdentity : null;
const noSubscribe = () => () => {};
const zero = () => 0;

export default function App() {
  const identityRevision = useSyncExternalStore(devIdentity?.subscribe ?? noSubscribe, devIdentity?.snapshot ?? zero);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator key={identityRevision} />
    </SafeAreaProvider>
  );
}

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import type React from 'react';

export default function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text>Fridgr</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
});

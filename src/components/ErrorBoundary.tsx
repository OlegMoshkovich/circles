import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: Error | null; info: { componentStack?: string } | null };

/**
 * App-wide safety net. Without this, a render-time throw on any single screen
 * unmounts the entire React tree and the app shows a blank white screen with
 * no information. This catches the error, keeps the app alive, surfaces the
 * message (full detail in dev) and lets the user recover with "Try again".
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Surfaces in the Metro logs even in release-style runs.
    console.error("Uncaught render error:", error, info?.componentStack);
    this.setState({ info });
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{error.message || String(error)}</Text>
          {__DEV__ && error.stack ? (
            <Text style={styles.stack}>{error.stack}</Text>
          ) : null}
          {__DEV__ && info?.componentStack ? (
            <Text style={styles.stack}>{info.componentStack}</Text>
          ) : null}
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a", paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
  content: { paddingBottom: 24 },
  title: { color: "#fff", fontSize: 20, fontWeight: "600", marginBottom: 12 },
  message: { color: "#ff8a80", fontSize: 15, marginBottom: 16 },
  stack: { color: "#9e9e9e", fontSize: 11, fontFamily: "Courier", marginBottom: 16 },
  button: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "600" },
});

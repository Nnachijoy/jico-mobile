import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please fill in email and password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace('/(tabs)');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Check your inbox',
            'We sent a confirmation link to ' +
              email +
              '. Click it, then sign in here.'
          );
          setMode('signin');
        }
      }
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Something went wrong.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>JICO FOOTIES</Text>
          <Text style={styles.heading}>
            {mode === 'signin' ? 'Welcome back.' : 'Make yourself at home.'}
          </Text>
          <Text style={styles.sub}>
            Sign in to keep your cart, details, and orders close.
          </Text>

          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                autoComplete="name"
                style={styles.input}
                placeholderTextColor="#a5a79b"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={styles.input}
              placeholderTextColor="#a5a79b"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                style={styles.passwordInput}
                placeholderTextColor="#a5a79b"
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                style={styles.showBtn}
              >
                <Text style={styles.showBtnText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={submit}
            disabled={busy}
            style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ marginTop: 22 }}
          >
            <Text style={styles.toggleText}>
              {mode === 'signin'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f3ee' },
  scroll: { padding: 28, paddingTop: 60, flexGrow: 1 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    color: '#77796f',
    marginBottom: 12,
  },
  heading: {
    fontSize: 34,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 8,
  },
  sub: { fontSize: 13, color: '#77796f', marginBottom: 32, lineHeight: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 11, color: '#60625b', marginBottom: 6 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 10,
    fontSize: 15,
    color: '#181917',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#181917',
  },
  showBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  showBtnText: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#77796f',
    textTransform: 'uppercase',
  },
  primaryBtn: {
    backgroundColor: '#465041',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#fff',
    letterSpacing: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  toggleText: {
    fontSize: 12,
    color: '#181917',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
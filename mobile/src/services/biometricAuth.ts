import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { apiPost, AuthUser, AuthResponse, setAuthTokens } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_TOKEN_KEY = 'lp_biometric_refresh_token';
const TOKENS_KEY = 'lp_auth_tokens';
const USER_KEY = 'lp_auth_user';

// expo-secure-store is not supported on web — use AsyncStorage as fallback
async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  const { default: SecureStore } = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.setItem(key, value); return; }
  const { default: SecureStore } = await import('expo-secure-store');
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: (SecureStore as any).WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.removeItem(key); return; }
  const { default: SecureStore } = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

export async function getBiometricAvailability() {
  try {
    const [hasHardware, enrolled, types, saved] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      secureGet(BIOMETRIC_TOKEN_KEY),
    ]);
    return {
      hasHardware,
      enrolled,
      hasSavedLogin: Boolean(saved),
      supportsFaceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
    };
  } catch {
    return { hasHardware: false, enrolled: false, hasSavedLogin: false, supportsFaceId: false };
  }
}

export async function saveBiometricLogin(refreshToken: string) {
  await secureSet(BIOMETRIC_TOKEN_KEY, refreshToken);
}

export async function signInWithBiometrics(copy: {
  prompt: string; cancel: string; fallback: string;
  noSavedLogin: string; unavailable: string; failed: string;
}): Promise<AuthUser> {
  const availability = await getBiometricAvailability();
  if (!availability.hasHardware || !availability.enrolled) throw new Error(copy.unavailable);
  if (!availability.hasSavedLogin) throw new Error(copy.noSavedLogin);

  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: copy.prompt,
    cancelLabel: copy.cancel,
    fallbackLabel: copy.fallback,
    disableDeviceFallback: false,
  });
  if (!auth.success) throw new Error(copy.failed);

  const storedRefreshToken = await secureGet(BIOMETRIC_TOKEN_KEY);
  if (!storedRefreshToken) throw new Error(copy.noSavedLogin);

  const data = await apiPost<AuthResponse>('/auth/refresh', { refreshToken: storedRefreshToken });
  setAuthTokens(data.accessToken, data.refreshToken);

  try {
    await AsyncStorage.multiSet([
      [TOKENS_KEY, JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken })],
      [USER_KEY, JSON.stringify(data.user)],
    ]);
    await secureSet(BIOMETRIC_TOKEN_KEY, data.refreshToken);
  } catch { /* storage unavailable */ }

  return data.user;
}

export async function clearBiometricLogin() {
  await secureDelete(BIOMETRIC_TOKEN_KEY);
}

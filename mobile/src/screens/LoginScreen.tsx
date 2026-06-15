import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthUser } from '../services/api';
import { login as loginRequest, register as registerRequest } from '../services/auth';
import { GradientButton } from '../components/GradientButton';

type Props = {
  onSignIn: (user: AuthUser) => void;
};

type Mode = 'login' | 'register';

export function LoginScreen({ onSignIn }: Props) {
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const submit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError(t('Ingresa tu email y contraseña.', 'Enter your email and password.'));
      return;
    }

    if (isRegister) {
      if (!firstName.trim() || !lastName.trim()) {
        setError(t('Ingresa tu nombre y apellido.', 'Enter your first and last name.'));
        return;
      }
      if (password.length < 6) {
        setError(t('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters.'));
        return;
      }
      if (password !== confirm) {
        setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
        return;
      }
    }

    setLoading(true);
    try {
      const user = isRegister
        ? await registerRequest({
            email,
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || undefined,
            lang: lang === 'en' ? 'en' : 'es',
          })
        : await loginRequest(email, password);
      onSignIn(user);
    } catch (err: any) {
      setError(
        err?.message ||
          (isRegister
            ? t('No pudimos crear la cuenta.', 'We could not create the account.')
            : t('No pudimos iniciar sesión.', 'We could not sign in.')),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{t('CUENTA', 'ACCOUNT')}</Text>
        <Text style={styles.title}>{isRegister ? t('Crear cuenta', 'Create account') : t('Iniciar sesión', 'Sign in')}</Text>
        <Text style={styles.copy}>
          {isRegister
            ? t('Crea tu cuenta real de LP Ticket para comprar entradas.', 'Create your real LP Ticket account to buy tickets.')
            : t('Accede con la misma cuenta real de la página web.', 'Use the same real account from the website.')}
        </Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {isRegister && (
          <View style={styles.row}>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>{t('Nombre', 'First name')}</Text>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder={t('Nombre', 'First name')} placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
            <View style={[styles.field, styles.rowItem]}>
              <Text style={styles.label}>{t('Apellido', 'Last name')}</Text>
              <TextInput value={lastName} onChangeText={setLastName} placeholder={t('Apellido', 'Last name')} placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>{t('Email', 'Email')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@example.com"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        {isRegister && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('Teléfono (con código de país)', 'Phone (with country code)')}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+1 305 555 1234"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>{t('Contraseña', 'Password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('Contraseña', 'Password')}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>

        {isRegister && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('Confirmar contraseña', 'Confirm password')}</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder={t('Confirmar contraseña', 'Confirm password')}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
        )}

        <GradientButton
          label={loading
            ? isRegister
              ? t('CREANDO...', 'CREATING...')
              : t('ENTRANDO...', 'SIGNING IN...')
            : isRegister
              ? t('CREAR CUENTA', 'CREATE ACCOUNT')
              : t('INICIAR SESIÓN', 'SIGN IN')}
          onPress={submit}
          disabled={loading}
          height={58}
          style={[styles.button, loading ? styles.buttonDisabled : {}]}
          textStyle={styles.buttonText}
        />

        <TouchableOpacity style={styles.secondaryButton} onPress={() => switchMode(isRegister ? 'login' : 'register')}>
          <Text style={styles.secondaryText}>
            {isRegister ? t('YA TENGO CUENTA', 'I ALREADY HAVE AN ACCOUNT') : t('CREAR CUENTA', 'CREATE ACCOUNT')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 10,
    paddingBottom: 40,
    justifyContent: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.018)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 22,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  eyebrow: {
    color: colors.orange,
    fontSize: 12,
    letterSpacing: 0,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 8,
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 18,
  },
  error: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  field: {
    gap: 7,
    marginBottom: 14,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(3,11,20,0.72)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 0,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#030B14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 0,
    fontWeight: '700',
  },
});

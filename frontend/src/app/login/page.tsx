'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useLang } from '@/context/LanguageContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || t('loginError'));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex items-start justify-center px-4 py-10 bg-gray-50 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/">
            <img src="/logo.png" alt="LPTicket" className="h-12 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="font-bold text-2xl text-gray-900 mt-3">{t('loginTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 z-10" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input !pl-11" placeholder="correo@ejemplo.com" required />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700">{t('password')}</label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">{t('forgotPassword')}</Link>
            </div>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 z-10" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input !pl-11 !pr-11" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none z-10">
                {showPassword ? <HiOutlineEyeOff className="w-4.5 h-4.5" /> : <HiOutlineEye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? t('loginLoading') : t('loginBtn')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">{t('registerFree')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

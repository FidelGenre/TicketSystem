'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const RegisterContent = dynamic(() => import('./RegisterContent'), { ssr: false });

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

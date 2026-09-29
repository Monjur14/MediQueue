import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterTenantForm } from '@/components/auth/RegisterTenantForm';

export const metadata: Metadata = {
  title: 'Register your clinic',
  description: 'Set up your clinic or hospital on MediQueue. Choose a plan and go live with digital queue management in minutes.',
  alternates: { canonical: '/register/tenant' },
};

export default function RegisterTenantPage() {
  return (
    <Suspense>
      <RegisterTenantForm />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Sign up for a free MediQueue patient account. Track your place in the hospital queue from anywhere.',
  alternates: { canonical: '/register' },
};

export default function RegisterPage() {
  return <RegisterForm />;
}

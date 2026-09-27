'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AxiosError } from 'axios';

interface FormErrors {
  password?: string;
  confirm?: string;
  general?: string;
}

function SetupPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token') ?? '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [errors, setErrors]       = useState<FormErrors>({});
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!password)          next.password = 'Password is required';
    else if (password.length < 8) next.password = 'At least 8 characters';
    if (password !== confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!token) {
      setErrors({ general: 'Invalid or missing setup link. Please request a new one.' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await api.post('/auth/setup-password', { token, password });
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.message ?? 'Setup failed. Try again.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">Password set successfully!</p>
        <p className="text-sm text-gray-500 mt-1">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.general && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={loading}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading || !token}>
        {loading ? 'Setting password…' : 'Set password'}
      </Button>
    </form>
  );
}

export default function SetupPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>
          Choose a secure password to complete your account setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
          <SetupPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

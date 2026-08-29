'use client';

import React, { useState } from 'react';
import { Sparkles, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      // Redirect dynamically based on role ( /admin for platform admin, /event-dashboard for event admin )
      window.location.href = data.redirect || '/admin';
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Header & Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white text-black shadow-xl mb-4 sm:mb-6">
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Event Suite 360</h2>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 font-medium">Sign in to your account</p>
      </div>

      {/* Login Card */}
      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-2xl rounded-2xl border border-zinc-200">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 sm:p-3.5 rounded-lg bg-zinc-100 border border-zinc-300 flex items-start gap-2.5 sm:gap-3 text-zinc-900 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="event.admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightElement={
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword(!showPassword);
                    }}
                    className="p-1 text-zinc-400 hover:text-black transition-colors rounded focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 text-sm font-semibold shadow-md mt-2"
              isLoading={loading}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

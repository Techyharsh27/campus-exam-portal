import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setError('Invalid reset link');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');

    setIsLoading(true);
    setError('');
    try {
      await authService.resetPassword(token, form.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <span className="text-3xl text-white">✍️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">New Password</h1>
          <p className="text-gray-500 mt-1">Set a strong password for your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm font-medium">
                Password reset successful! Redirecting to login...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="New Password"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState('student'); // 'student' | 'admin'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });

  usePageTitle('Login');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const creds = tab === 'admin'
        ? { username: form.username, password: form.password }
        : { email: form.email, password: form.password };
      const user = await login(creds, tab);
      navigate(user.role === 'ADMIN' ? '/admin' : '/student');
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Network Error: Cannot connect to the server. Please check your internet or if the backend is running.');
      } else if (err.response) {
        setError(err.response.data?.message || `Error ${err.response.status}: Login failed`);
      } else {
        setError(err.message || 'An unexpected error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CAMPUS</h1>
          <p className="text-gray-500 mt-1">Secure Online Examination Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-100">
            {['student', 'admin'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'student' ? '👤 Student' : '🔐 Admin'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {tab === 'admin' ? (
              <Input
                label="Username"
                name="username"
                type="text"
                placeholder="Enter admin username"
                value={form.username}
                onChange={handleChange}
                required
              />
            ) : (
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
            )}
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {tab === 'admin' ? 'Admin Login' : 'Student Login'}
            </Button>

            {tab === 'student' && (
              <div className="flex flex-col gap-3">
                <Link to="/forgot-password" size="sm" className="text-center text-xs text-indigo-600 font-semibold hover:underline">
                  Forgot Password?
                </Link>
                <p className="text-center text-sm text-gray-500 border-t border-gray-50 pt-3">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-indigo-600 font-bold hover:underline">
                    Register
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

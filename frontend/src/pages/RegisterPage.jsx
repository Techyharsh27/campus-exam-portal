import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    section: '',
    rollNumber: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters long');
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await register(data);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <span className="text-2xl text-white">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join the CAMPUS Examination Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Section"
                name="section"
                type="text"
                placeholder="A / B / C"
                value={form.section}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Roll Number"
                name="rollNumber"
                type="text"
                placeholder="CS-001"
                value={form.rollNumber}
                onChange={handleChange}
                required
              />
              <Input
                label="Contact Number"
                name="contactNumber"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={form.contactNumber}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Min 8 chars"
                value={form.password}
                onChange={handleChange}
                required
              />
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                ⚠️ {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Create Account
            </Button>

            <p className="text-center text-sm text-gray-500 pt-2">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

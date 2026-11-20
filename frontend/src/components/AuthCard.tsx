import React, { useState } from 'react';
import axios from 'axios';
import API from '../services/api';
import type { User } from '../types';

interface AuthCardProps {
  onAuthSuccess: (user: User) => void;
}

interface AuthResponse {
  data: {
    token: string;
    user: User;
  };
}

export const AuthCard: React.FC<AuthCardProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'vendor'>('buyer');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password, role };

      const response = await API.post<AuthResponse>(endpoint, payload);
      const { token, user } = response.data.data;

      // Persist the sessions instantly into localStorage
      localStorage.setItem('jumia_token', token);
      localStorage.setItem('jumia_user', JSON.stringify(user));

      onAuthSuccess(user);
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setErrorMsg(message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-heading">{isLogin ? 'Welcome back.' : 'Join the marketplace.'}</h2>
      <p className="auth-subheading">
        {isLogin ? 'Sign in to pick up where you left off.' : 'Create an account to find or sell something special.'}
      </p>

      {errorMsg && (
        <div className="alert alert--error" role="alert">
          {errorMsg}
        </div>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        {!isLogin && (
          <label className="form-field">
            Full name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
        )}

        <label className="form-field">
          Email address
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>

        <label className="form-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
        </label>

        {!isLogin && (
          <label className="form-field">
            Account type
            <select value={role} onChange={(e) => setRole(e.target.value === 'vendor' ? 'vendor' : 'buyer')}>
              <option value="buyer">Buyer / Shopper</option>
              <option value="vendor">Vendor / Seller</option>
            </select>
          </label>
        )}

        <button className="button-dark button-full" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        className="auth-switch"
        type="button"
        onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
      >
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <strong>{isLogin ? 'Create an account' : 'Sign in'}</strong>
      </button>
    </div>
  );
};

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
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#f57c00', marginBottom: '20px' }}>
        {isLogin ? 'Jumia Marketplace Login' : 'Create Vendor/Buyer Account'}
      </h2>

      {errorMsg && (
        <div style={{ padding: '10px', marginBottom: '15px', color: '#721c24', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>

        {!isLogin && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value === 'vendor' ? 'vendor' : 'buyer')} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="buyer">Buyer / Shopper</option>
              <option value="vendor">Vendor / Seller</option>
            </select>
          </div>
        )}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', color: '#fff', backgroundColor: '#f57c00', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register Now'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
        {isLogin ? "New to Jumia?" : "Already have an account?"}{' '}
        <span onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} style={{ color: '#f57c00', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
          {isLogin ? 'Create an account' : 'Log in here'}
        </span>
      </p>
    </div>
  );
};

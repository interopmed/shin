'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import './login.css';

const LoginPage = () => {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });

  // ── DEV: Quick-fill role credentials ──────────────────────────────
  const DEV_ROLES = [
    { label: 'Admin',        email: 'admin@shin.local',             password: 'Password123!' },
    { label: 'Dr. George',   email: 'george.james90@shin.local',    password: 'Password123!' },
    { label: 'Nurse Wanda',  email: 'wanda.lindsey58@shin.local',   password: 'Password123!' },
    { label: 'Lab Tech (Lisa)', email: 'lisa.brooks32@shin.local',  password: 'Password123!' },
    { label: 'Pharma (Teresa)', email: 'teresa.crawford36@shin.local', password: 'Password123!' },
    { label: 'Radio (David)', email: 'david.mitchell84@shin.local', password: 'Password123!' },
    { label: 'Front (Kenneth)', email: 'kenneth.hill17@shin.local', password: 'Password123!' },
    { label: 'Ward Mgr (Melissa)', email: 'melissa.key8@shin.local', password: 'Password123!' },
  ];

  const fillRole = (role: typeof DEV_ROLES[0]) => {
    setFormData(prev => ({ ...prev, email: role.email, password: role.password }));
    setError('');
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && savedRemember) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        remember: true
      }));
    }
  }, []);

  // Redirect already-authenticated users away from login
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password, formData.remember);
      
      if (formData.remember) {
        localStorage.setItem('rememberedEmail', formData.email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      
      // Navigate after login — AuthProvider updates global state
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    try {
      const oauthConfig = {
        google: {
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          scope: 'openid email profile',
        },
        microsoft: {
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
          scope: 'openid email profile',
        }
      };

      const config = oauthConfig[provider];
      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state: Math.random().toString(36).substring(7),
      });

      sessionStorage.setItem('oauth_state', params.get('state') || '');
      window.location.href = `${config.authUrl}?${params.toString()}`;
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      setError(`Failed to initiate ${provider} login`);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-login-container">
      <div className="premium-login-left">
        <h1>SHIN Node</h1>
        <p>Your Semantic Health Interoperability Network gateway. Connecting care seamlessly.</p>
      </div>

      <div className="premium-login-right">
        <div className="premium-glass-card">
          <div className="premium-login-header">
            <h2>Welcome Back</h2>
            <p>Please sign in to your account</p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ borderRadius: '12px', marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          {/* DEV: Quick role login panel */}
          <div className="dev-role-panel">
            <p className="dev-role-label">DEV — click to fill credentials</p>
            <div className="dev-role-chips">
              {DEV_ROLES.map(role => (
                <button
                  key={role.email}
                  type="button"
                  className={`dev-role-chip${formData.email === role.email ? ' active' : ''}`}
                  onClick={() => fillRole(role)}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="premium-input-group">
              <input
                type="email"
                placeholder="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <i className="fas fa-envelope premium-input-icon"></i>
            </div>
            
            <div className="premium-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <i className="fas fa-lock premium-input-icon"></i>
              <i 
                className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} premium-toggle-password`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="remember"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ margin: 0, cursor: 'pointer', color: '#475569', fontSize: '0.95rem' }}>
                Remember Me
              </label>
            </div>
            
            <button type="submit" className="premium-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="premium-footer-links">
            <Link href="/forgot-password">Forgot password?</Link>
            <Link href="/register">Create an account</Link>
          </div>

          <div className="social-login-divider">
            <span>OR CONTINUE WITH</span>
          </div>

          <button type="button" className="social-btn google-btn" onClick={() => handleOAuthLogin('google')}>
            <i className="fab fa-google mr-2" style={{ color: '#EA4335' }}></i> Google
          </button>
          <button type="button" className="social-btn ms-btn" onClick={() => handleOAuthLogin('microsoft')}>
            <i className="fab fa-microsoft mr-2"></i> Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

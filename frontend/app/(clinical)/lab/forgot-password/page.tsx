'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/password-reset/request/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.uid && data.token) {
          router.push(`/reset-password/${data.uid}/${data.token}`);
        } else {
          setError('Unable to start password reset. Please try again.');
        }
      } else {
        setError(data.detail || 'An error occurred. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hold-transition login-page" style={{ minHeight: '100vh' }}>
      <div className="login-box">
        <div className="login-logo">
          <Link href="/">
            <b>Lifecare</b> Diagnostics
          </Link>
        </div>

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">
              Enter your email to reset your password
            </p>

            {error && (
              <div className="alert alert-danger alert-dismissible">
                <button type="button" className="close" onClick={() => setError('')}>
                  <span aria-hidden="true">&times;</span>
                </button>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="input-group mb-3">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="input-group-append">
                  <div className="input-group-text">
                    <span className="fas fa-envelope"></span>
                </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block" 
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Continue'}
                  </button>
                </div>
              </div>
            </form>

            <p className="mt-3 mb-1">
              <Link href="/login">Back to Login</Link>
            </p>
            <p className="mb-0">
              <Link href="/register">Register a new account</Link>
            </p>
            
            {/* Development/Testing Link */}
            {process.env.NODE_ENV === 'development' && (
              <p className="mb-0 mt-2">
                <Link href="/reset-password/test-uid/test-token" className="text-muted">
                  <small>Test Reset Password Page</small>
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

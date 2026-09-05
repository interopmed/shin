'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

const ResetPasswordPage = () => {
  const router = useRouter();
  const params = useParams();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const uid = params?.uid as string;
  const token = params?.token as string;

  useEffect(() => {
    if (!uid || !token) {
      setError('Invalid reset link');
    }
  }, [uid, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/password-reset/confirm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          token,
          new_password: formData.newPassword,
          confirm_password: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 5 seconds
        setTimeout(() => {
          router.push('/login');
        }, 5000);
      } else {
        setError(data.detail || 'Failed to reset password. The link may be invalid or expired.');
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
              {success ? 'Password reset successful!' : 'Enter your new password'}
            </p>

            {error && (
              <div className="alert alert-danger alert-dismissible">
                <button type="button" className="close" onClick={() => setError('')}>
                  <span aria-hidden="true">&times;</span>
                </button>
                {error}
              </div>
            )}

            {success ? (
              <div className="alert alert-success">
                <p className="mb-0">
                  Your password has been reset successfully!
                </p>
                <p className="mb-0 mt-2">
                  <small>Redirecting to login page...</small>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-group mb-3">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="New Password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                  <div className="input-group-append">
                    <div 
                      className="input-group-text" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></span>
                    </div>
                  </div>
                </div>

                <div className="input-group mb-3">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Confirm Password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                  />
                  <div className="input-group-append">
                    <div 
                      className="input-group-text" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <span className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></span>
                    </div>
                  </div>
                </div>

                <small className="text-muted mb-3 d-block">
                  Password must be at least 8 characters long
                </small>

                <div className="row">
                  <div className="col-12">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-block" 
                      disabled={loading}
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <p className="mt-3 mb-1">
              <Link href="/login">Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const OAuthCallbackPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!params) throw new Error('Missing route parameters');
        const provider = params.provider as string;
        if (!searchParams) throw new Error('Missing search parameters');
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const savedState = sessionStorage.getItem('oauth_state');

        // Verify state to prevent CSRF attacks
        if (state !== savedState) {
          throw new Error('Invalid state parameter. Possible CSRF attack.');
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // TODO: Send code to backend to exchange for tokens
        // const response = await fetch('/api/auth/oauth/callback', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ provider, code, redirect_uri: window.location.origin + `/auth/callback/${provider}` })
        // });
        
        // For now, show a message that OAuth needs backend implementation
        setError(`OAuth 2.0 callback received. Backend integration needed for ${provider}.`);
        
        // Clean up
        sessionStorage.removeItem('oauth_state');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);

      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'OAuth authentication failed');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [params, searchParams, router, login]);

  return (
    <div className="hold-transition login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-box">
        <div className="card">
          <div className="card-body">
            {processing ? (
              <>
                <div className="text-center mb-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Processing...</span>
                  </div>
                </div>
                <p className="text-center">Processing OAuth authentication...</p>
              </>
            ) : error ? (
              <>
                <div className="alert alert-warning">
                  <i className="icon fas fa-exclamation-triangle"></i>
                  {error}
                </div>
                <p className="text-center text-muted">Redirecting to login...</p>
              </>
            ) : (
              <>
                <div className="alert alert-success">
                  <i className="icon fas fa-check"></i>
                  Authentication successful!
                </div>
                <p className="text-center text-muted">Redirecting to dashboard...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;

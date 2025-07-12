import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';

export default function EmailVerification() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the hash from URL (contains the verification tokens)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'signup' && accessToken && refreshToken) {
          // Set the session with the tokens from email verification
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Email verified successfully! You can now access your account.');
            
            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
          }
        } else {
          throw new Error('Invalid verification link');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Email verification failed');
      }
    };

    handleEmailVerification();
  }, []);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...';
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-100';
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className={`flex justify-center mb-6`}>
          <div className={`p-4 ${getBackgroundColor()} rounded-full`}>
            {getIcon()}
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {getTitle()}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        {status === 'success' && (
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              Redirecting to your dashboard in 3 seconds...
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return to Sign In
            </Button>
            
            <p className="text-xs text-gray-500">
              If you continue to have issues, please contact support.
            </p>
          </div>
        )}
        
        {status === 'loading' && (
          <p className="text-sm text-gray-500">
            Please wait while we verify your email address...
          </p>
        )}
      </div>
    </div>
  );
}
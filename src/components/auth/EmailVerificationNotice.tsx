import React from 'react';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface EmailVerificationNoticeProps {
  email: string;
  onResendEmail: () => void;
  onBackToSignIn: () => void;
}

export default function EmailVerificationNotice({ 
  email, 
  onResendEmail, 
  onBackToSignIn 
}: EmailVerificationNoticeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h1>
          <p className="text-gray-600">
            We've sent a verification link to
          </p>
          <p className="font-medium text-gray-900 mt-1">{email}</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Check your email inbox</li>
            <li>2. Click the verification link</li>
            <li>3. Return here to sign in</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={onResendEmail}
            className="w-full"
          >
            Resend Verification Email
          </Button>
          
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={onBackToSignIn}
            className="w-full"
          >
            Back to Sign In
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}
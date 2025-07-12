import React from 'react';
import { CheckCircle, Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Goodbye() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-green-100 rounded-full">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Account Successfully Deleted
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your account and all associated data have been permanently removed from our system. 
          Thank you for using our Personal Finance Manager.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            If you change your mind in the future, you're always welcome to create a new account 
            and start fresh with our financial management tools.
          </p>
        </div>
        
        <Button
          icon={Home}
          onClick={() => window.location.href = '/'}
          className="w-full"
        >
          Return to Homepage
        </Button>
        
        <p className="text-xs text-gray-500 mt-4">
          We hope our service was helpful during your time with us.
        </p>
      </div>
    </div>
  );
}
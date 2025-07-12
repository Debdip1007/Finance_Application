import React, { useState } from 'react';
import { Trash2, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

export default function DeleteAccount() {
  const { user, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const CONFIRMATION_TEXT = 'DELETE MY ACCOUNT';

  const handleDeleteAccount = async () => {
    if (confirmationText !== CONFIRMATION_TEXT) {
      setError('Please type the confirmation text exactly as shown');
      return;
    }

    if (showPasswordField && !password.trim()) {
      setError('Please enter your password to confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call the Edge Function to delete the user
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: showPasswordField ? password : undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Account successfully deleted
      // Sign out the user and redirect
      await signOut();
      
      // Redirect to a goodbye page or homepage
      window.location.href = '/goodbye';
      
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetModal = () => {
    setShowDeleteModal(false);
    setShowPasswordField(false);
    setPassword('');
    setShowPassword(false);
    setConfirmationText('');
    setError('');
  };

  return (
    <>
      <Card>
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Account
              </h3>
              <p className="text-gray-600 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-900 mb-2">
                  What will be deleted:
                </h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Your user account and profile</li>
                  <li>• All bank accounts and financial data</li>
                  <li>• Income and expense records</li>
                  <li>• Investment portfolio data</li>
                  <li>• Financial goals and progress</li>
                  <li>• All uploaded files and documents</li>
                  <li>• Currency settings and preferences</li>
                </ul>
              </div>

              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={resetModal}
        title="Delete Account - Final Confirmation"
        size="lg"
      >
        <div className="space-y-6">
          {/* Warning Section */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h4 className="font-semibold text-red-900">
                This action is irreversible!
              </h4>
            </div>
            <p className="text-red-800 text-sm">
              Once you delete your account, all your data will be permanently removed 
              from our servers. We cannot recover your account or data after deletion.
            </p>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Account to be deleted:</p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>

          {/* Confirmation Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">{CONFIRMATION_TEXT}</span> to confirm:
            </label>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              className={`font-mono ${
                confirmationText === CONFIRMATION_TEXT 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-red-300'
              }`}
            />
          </div>

          {/* Optional Password Verification */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requirePassword"
                checked={showPasswordField}
                onChange={(e) => setShowPasswordField(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="requirePassword" className="text-sm text-gray-700">
                Require password verification for additional security
              </label>
            </div>

            {showPasswordField && (
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={isDeleting}
              disabled={
                confirmationText !== CONFIRMATION_TEXT || 
                (showPasswordField && !password.trim())
              }
              icon={Trash2}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  handleError, 
  ValidationError, 
  NetworkError, 
  AuthenticationError,
  AuthorizationError,
  handleAsyncError,
  apiCall
} from '../errorHandler';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

// Mock logger
vi.mock('../logger', () => ({
  logError: vi.fn(),
}));

describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('creates ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', 'email');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('email');
    });

    it('creates NetworkError correctly', () => {
      const error = new NetworkError('Connection failed', 500);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
    });

    it('creates AuthenticationError correctly', () => {
      const error = new AuthenticationError();
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication required');
    });

    it('creates AuthorizationError correctly', () => {
      const error = new AuthorizationError();
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Access denied');
    });
  });

  describe('handleError', () => {
    it('handles ValidationError', () => {
      const toast = require('react-hot-toast').default;
      const error = new ValidationError('Invalid email format');
      
      handleError(error);
      
      expect(toast.error).toHaveBeenCalledWith('Validation Error: Invalid email format');
    });

    it('handles NetworkError', () => {
      const toast = require('react-hot-toast').default;
      const error = new NetworkError('Connection timeout');
      
      handleError(error);
      
      expect(toast.error).toHaveBeenCalledWith('Network error. Please check your connection and try again.');
    });

    it('handles AuthenticationError', () => {
      const toast = require('react-hot-toast').default;
      const error = new AuthenticationError();
      
      handleError(error);
      
      expect(toast.error).toHaveBeenCalledWith('Please sign in to continue.');
    });

    it('handles AuthorizationError', () => {
      const toast = require('react-hot-toast').default;
      const error = new AuthorizationError();
      
      handleError(error);
      
      expect(toast.error).toHaveBeenCalledWith('You do not have permission to perform this action.');
    });

    it('handles generic errors', () => {
      const toast = require('react-hot-toast').default;
      const error = new Error('Something went wrong');
      
      handleError(error);
      
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred. Please try again.');
    });
  });

  describe('handleAsyncError', () => {
    it('returns result when promise succeeds', async () => {
      const successPromise = Promise.resolve('success');
      const result = await handleAsyncError(successPromise);
      
      expect(result).toBe('success');
    });

    it('returns null when promise fails', async () => {
      const failPromise = Promise.reject(new Error('Failed'));
      const result = await handleAsyncError(failPromise);
      
      expect(result).toBeNull();
    });

    it('logs error context', async () => {
      const logError = require('../logger').logError;
      const failPromise = Promise.reject(new Error('Failed'));
      const context = { operation: 'test' };
      
      await handleAsyncError(failPromise, context);
      
      expect(logError).toHaveBeenCalledWith(expect.any(Error), context);
    });
  });

  describe('apiCall', () => {
    it('returns result when API call succeeds', async () => {
      const apiFunction = vi.fn().mockResolvedValue('api result');
      const result = await apiCall(apiFunction);
      
      expect(result).toBe('api result');
      expect(apiFunction).toHaveBeenCalled();
    });

    it('handles 401 errors', async () => {
      const apiFunction = vi.fn().mockRejectedValue({ status: 401 });
      const result = await apiCall(apiFunction);
      
      expect(result).toBeNull();
    });

    it('handles 403 errors', async () => {
      const apiFunction = vi.fn().mockRejectedValue({ status: 403 });
      const result = await apiCall(apiFunction);
      
      expect(result).toBeNull();
    });

    it('handles 400-499 errors', async () => {
      const apiFunction = vi.fn().mockRejectedValue({ status: 400 });
      const result = await apiCall(apiFunction, 'Bad request');
      
      expect(result).toBeNull();
    });

    it('handles 500+ errors', async () => {
      const apiFunction = vi.fn().mockRejectedValue({ status: 500 });
      const result = await apiCall(apiFunction);
      
      expect(result).toBeNull();
    });

    it('handles generic errors', async () => {
      const apiFunction = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await apiCall(apiFunction, 'Custom error message');
      
      expect(result).toBeNull();
    });
  });
});
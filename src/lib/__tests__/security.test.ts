import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeInput,
  isValidEmail,
  validatePasswordStrength,
  rateLimiter,
  escapeHtml,
  validateNumericInput,
  validateDateInput
} from '../security';

describe('Security Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeInput', () => {
    it('removes HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).toBe('scriptalert("xss")/scriptHello');
    });

    it('removes javascript protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeInput(input);
      expect(result).toBe('alert("xss")');
    });

    it('removes event handlers', () => {
      const input = 'onclick=alert("xss")';
      const result = sanitizeInput(input);
      expect(result).toBe('alert("xss")');
    });

    it('trims whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeInput(input);
      expect(result).toBe('hello world');
    });

    it('handles non-string input', () => {
      const result = sanitizeInput(123 as any);
      expect(result).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('validates correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test.example.com')).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('validates strong passwords', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects passwords that are too short', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('requires uppercase letters', () => {
      const result = validatePasswordStrength('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('requires lowercase letters', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('requires numbers', () => {
      const result = validatePasswordStrength('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('requires special characters', () => {
      const result = validatePasswordStrength('NoSpecialChars123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('rateLimiter', () => {
    it('allows requests within limit', () => {
      const key = 'test-key';
      const maxRequests = 5;
      const windowMs = 60000; // 1 minute

      for (let i = 0; i < maxRequests; i++) {
        expect(rateLimiter.isAllowed(key, maxRequests, windowMs)).toBe(true);
      }
    });

    it('blocks requests exceeding limit', () => {
      const key = 'test-key-2';
      const maxRequests = 3;
      const windowMs = 60000;

      // Use up the limit
      for (let i = 0; i < maxRequests; i++) {
        rateLimiter.isAllowed(key, maxRequests, windowMs);
      }

      // Next request should be blocked
      expect(rateLimiter.isAllowed(key, maxRequests, windowMs)).toBe(false);
    });

    it('resets rate limit for key', () => {
      const key = 'test-key-3';
      const maxRequests = 2;
      const windowMs = 60000;

      // Use up the limit
      rateLimiter.isAllowed(key, maxRequests, windowMs);
      rateLimiter.isAllowed(key, maxRequests, windowMs);
      expect(rateLimiter.isAllowed(key, maxRequests, windowMs)).toBe(false);

      // Reset and try again
      rateLimiter.reset(key);
      expect(rateLimiter.isAllowed(key, maxRequests, windowMs)).toBe(true);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('<script>alert("xss")</script>');
    });

    it('escapes quotes', () => {
      const input = 'He said "Hello" & \'Goodbye\'';
      const result = escapeHtml(input);
      expect(result).toBe('He said "Hello" & &#039;Goodbye&#039;');
    });
  });

  describe('validateNumericInput', () => {
    it('validates valid numbers', () => {
      const result = validateNumericInput('123.45');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects non-numeric input', () => {
      const result = validateNumericInput('not-a-number');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be a valid number');
    });

    it('validates minimum value', () => {
      const result = validateNumericInput('5', 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be at least 10');
    });

    it('validates maximum value', () => {
      const result = validateNumericInput('15', undefined, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be at most 10');
    });

    it('validates within range', () => {
      const result = validateNumericInput('7', 5, 10);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('validateDateInput', () => {
    it('validates valid dates', () => {
      const result = validateDateInput('2023-12-25');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects invalid dates', () => {
      const result = validateDateInput('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be a valid date');
    });

    it('rejects impossible dates', () => {
      const result = validateDateInput('2023-13-45');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be a valid date');
    });
  });
});
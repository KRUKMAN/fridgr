import { AuthApiError } from '@supabase/supabase-js';

export type AuthErrorDetails = Readonly<{
  email?: string;
  password?: string;
  general: string;
}>;

export function mapAuthError(error: unknown): AuthErrorDetails {
  if (error instanceof AuthApiError) {
    const code = error.code?.toLowerCase();
    const message = error.message.toLowerCase();

    if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
      return {
        general: 'Email or password is incorrect',
        password: 'Email or password is incorrect',
      };
    }

    if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      return {
        general: 'Confirm your email first — check your inbox',
        email: 'Confirm your email first — check your inbox',
      };
    }

    if (code === 'user_already_exists' || message.includes('user already registered')) {
      return {
        general: 'An account with that email already exists — try signing in',
        email: 'An account with that email already exists — try signing in',
      };
    }

    if (code === 'weak_password' || message.includes('password should be at least')) {
      return {
        general: 'Password must be at least 8 characters',
        password: 'Password must be at least 8 characters',
      };
    }

    if (message.includes('unable to validate email address')) {
      return {
        general: 'Something went wrong. Try again in a moment.',
        email: 'Enter a valid email address and try again.',
      };
    }

    return {
      general: 'Something went wrong. Try again in a moment.',
    };
  }

  if (error instanceof Error) {
    return {
      general: 'Something went wrong. Try again in a moment.',
    };
  }

  return {
    general: 'Something went wrong. Try again in a moment.',
  };
}

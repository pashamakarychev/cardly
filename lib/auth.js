import * as Linking from 'expo-linking';

import { supabase } from './supabase';

function parseAuthParams(url) {
  const hash = url.split('#')[1] ?? '';
  const query = (url.split('?')[1] ?? '').split('#')[0];
  return Object.fromEntries([
    ...new URLSearchParams(query).entries(),
    ...new URLSearchParams(hash).entries(),
  ]);
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) {
    if (
      error.code === 'user_already_exists' ||
      error.code === 'email_exists' ||
      /already registered/i.test(error.message ?? '')
    ) {
      throw new Error('This email is already registered. Please log in instead.');
    }
    throw error;
  }
  if (data.user?.identities?.length === 0) {
    throw new Error('This email is already registered. Please log in instead.');
  }
  if (data.session == null) {
    throw new Error('Could not complete sign-up. Please check your email or try again.');
  }
  return data.session;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export function getPasswordResetRedirectUrl() {
  return Linking.createURL('new-password');
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) {
    throw error;
  }
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw error;
  }
  return data.user;
}

export function isPasswordRecoveryUrl(url) {
  const { type } = parseAuthParams(url);
  if (type != null) return type === 'recovery';
  return /\/new-password\/?$/.test(url.split(/[?#]/)[0]);
}

export async function createSessionFromUrl(url) {
  const params = parseAuthParams(url);
  const description = params.error_description ?? params.error;
  if (description) {
    throw new Error(String(description).replace(/\+/g, ' '));
  }
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw error;
    }
    return data.session;
  }
  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) {
      throw error;
    }
    return data.session;
  }
  return null;
}

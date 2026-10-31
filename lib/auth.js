import * as Linking from 'expo-linking';

import { supabase } from './supabase';

function parseAuthParams(url) {
  const hash = url.split('#')[1] ?? '';
  const query = (url.split('?')[1] ?? '').split('#')[0];
  return Object.fromEntries(new URLSearchParams(hash || query).entries());
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
    throw error;
  }
  if (data.session != null) {
    return data.session;
  }
  return signInWithEmail(email, password);
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
  return parseAuthParams(url).type === 'recovery';
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

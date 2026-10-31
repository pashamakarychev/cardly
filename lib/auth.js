import { supabase } from './supabase';

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

import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore is native-only. Browser sessions retain browser-local storage.
export const authStorage = AsyncStorage;

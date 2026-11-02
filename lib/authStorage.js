import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

// Migrate existing mobile sessions only after the encrypted write succeeds.
export const authStorage = {
  async getItem(key) {
    const stored = await SecureStore.getItemAsync(key, options);
    if (stored != null) {
      await AsyncStorage.removeItem(key);
      return stored;
    }
    const legacy = await AsyncStorage.getItem(key);
    if (legacy != null) {
      await SecureStore.setItemAsync(key, legacy, options);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value, options);
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key, options);
  },
};

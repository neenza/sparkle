import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiKeyService {
  constructor() {
    this.STORAGE_KEY = 'gemini_api_key';
  }

  // Get the stored API key
  async getApiKey() {
    try {
      const apiKey = await AsyncStorage.getItem(this.STORAGE_KEY);
      return apiKey;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  // Save a new API key
  async saveApiKey(apiKey) {
    try {
      if (!apiKey) {
        // If no key provided, remove the current key
        await AsyncStorage.removeItem(this.STORAGE_KEY);
        return true;
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, apiKey);
      return true;
    } catch (error) {
      console.error('Error saving API key:', error);
      return false;
    }
  }

  // Remove the saved API key
  async removeApiKey() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error removing API key:', error);
      return false;
    }
  }
}

export default new ApiKeyService();
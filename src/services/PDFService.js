import * as FileSystem from 'expo-file-system';

class PDFService {
  async getBase64Content(fileUri) {
    try {
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64Data;
    } catch (error) {
      console.error('Error reading PDF file:', error);
      throw new Error('Failed to read PDF file');
    }
  }

  async checkFileExists(fileUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking file:', error);
      return false;
    }
  }
}

export default new PDFService();
import { GoogleGenerativeAI } from '@google/generative-ai';
import ApiKeyService from './ApiKeyService';

class GeminiService {
  constructor() {
    console.log('Initializing GeminiService...');
    this.genAI = null;
    this.pdfContent = null;
    this.initialized = false;
  }

  // Initialize the Gemini API with the stored key
  async initialize() {
    try {
      const apiKey = await ApiKeyService.getApiKey();
      if (!apiKey) {
        console.warn('No Gemini API key found in storage');
        this.initialized = false;
        return false;
      }
      
      console.log('API Key found, length:', apiKey.length);
      this.API_KEY = apiKey;
      this.genAI = new GoogleGenerativeAI(this.API_KEY);
      this.initialized = true;
      console.log('GeminiService initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing GeminiService:', error);
      this.initialized = false;
      return false;
    }
  }

  // Check if API is initialized
  isInitialized() {
    return this.initialized;
  }

  // Update API key and reinitialize
  async updateApiKey(newApiKey) {
    try {
      if (!newApiKey) {
        console.warn('Attempted to update with empty API key');
        return false;
      }
      
      await ApiKeyService.saveApiKey(newApiKey);
      return await this.initialize();
    } catch (error) {
      console.error('Error updating API key:', error);
      return false;
    }
  }

  setPdfContent(content) {
    console.log('Setting PDF content...');
    console.log('Content length:', content?.length || 0);
    this.pdfContent = content;
    console.log('PDF content loaded into AI service');
    return !!content; // Return true if content is not null/empty
  }

  getPdfContent() {
    console.log('Getting PDF content...');
    console.log('Content available:', !!this.pdfContent);
    return this.pdfContent;
  }

  async queryPdfContent(question, chatHistory = []) {
    console.log('Starting AI query with question:', question);
    
    try {
      if (!this.initialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return 'Please set your Gemini API key in the sidebar settings before using the chat feature.';
        }
      }

      if (!this.pdfContent) {
        console.warn('No PDF content loaded');
        return 'No PDF content loaded. Please upload a PDF first.';
      }

      // Format chat history for the prompt
      let chatHistoryText = '';
      if (chatHistory && chatHistory.length > 0) {
        chatHistoryText = chatHistory
          .filter(msg => !msg.isSystemMessage) // Skip system messages
          .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n\n');
          
        console.log('Including chat history with', chatHistory.length, 'messages');
      }

      // Create prompt with PDF content and chat history
      console.log('Preparing prompt with PDF content and chat history...');
      let prompt = `
        I have the following PDF content:
        ${this.pdfContent}
        
        ${chatHistoryText ? 'Here is our conversation so far:\n' + chatHistoryText + '\n\n' : ''}
        
        Based on this PDF content and our conversation history, please answer the following question:
        ${question}
      `;
      console.log('Prompt prepared, length:', prompt.length);

      console.log('Initializing Gemini model...');
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('Model initialized successfully');

      console.log('Generating content...');
      const result = await model.generateContent(prompt);
      console.log('Content generated successfully');

      console.log('Processing response...');
      const response = result.response;
      const text = response.text();
      console.log('Response processed, length:', text.length);

      return text;
    } catch (error) {
      console.error('Error in queryPdfContent:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.message && error.message.includes('API key')) {
        return 'Invalid API key. Please check your Gemini API key in the sidebar settings.';
      }
      
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  // Update the simulated streaming function to also include chat history
  async streamPdfContent(question, onTokenReceived, chatHistory = []) {
    try {
      if (!this.initialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return 'Please set your Gemini API key in the sidebar settings before using the chat feature.';
        }
      }

      if (!this.pdfContent) {
        console.warn('No PDF content loaded');
        return 'No PDF content loaded. Please upload a PDF first.';
      }

      // Format chat history for the prompt
      let chatHistoryText = '';
      if (chatHistory && chatHistory.length > 0) {
        chatHistoryText = chatHistory
          .filter(msg => !msg.isSystemMessage) // Skip system messages
          .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`)
          .join('\n\n');
          
        console.log('Including chat history with', chatHistory.length, 'messages');
      }

      console.log('Preparing prompt for streaming...');
      const prompt = `
        I have the following PDF content:
        ${this.pdfContent}
        
        ${chatHistoryText ? 'Here is our conversation so far:\n' + chatHistoryText + '\n\n' : ''}
        
        Based on this PDF content and our conversation history, please answer the following question:
        ${question}
      `;

      // ...rest of the simulated streaming implementation...
    } catch (error) {
      console.error('Error in streamPdfContent:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.message && error.message.includes('API key')) {
        return 'Invalid API key. Please check your Gemini API key in the sidebar settings.';
      }
      
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }
}

export default new GeminiService();
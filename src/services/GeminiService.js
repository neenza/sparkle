import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '@env';

class GeminiService {
  constructor() {
    console.log('Initializing GeminiService...');
    if (!GEMINI_API_KEY) {
      console.error('API_KEY environment variable is not set');
      throw new Error('API_KEY environment variable is not set');
    }
    console.log('API Key found, length:', GEMINI_API_KEY.length);
    this.API_KEY = GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.API_KEY);
    this.pdfContent = null;
    console.log('GeminiService initialized successfully');
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

  async queryPdfContent(question) {
    console.log('Starting AI query with question:', question);
    try {
      if (!this.pdfContent) {
        console.warn('No PDF content loaded');
        return 'No PDF content loaded. Please upload a PDF first.';
      }

      console.log('Preparing prompt with PDF content...');
      const prompt = `
        I have the following PDF content:
        ${this.pdfContent}
        
        Based on this PDF content, please answer the following question:
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
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }
}

export default new GeminiService();
import AsyncStorage from '@react-native-async-storage/async-storage';

class ConversationService {
  constructor() {
    this.STORAGE_KEY = 'pdf_chat_conversations';
  }

  // Get all saved conversations
  async getConversations() {
    try {
      const jsonValue = await AsyncStorage.getItem(this.STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  // Save a new conversation or update an existing one
  async saveConversation(conversation) {
    try {
      // Get existing conversations
      const conversations = await this.getConversations();
      
      // Check if this conversation already exists
      const index = conversations.findIndex(conv => conv.id === conversation.id);
      
      if (index !== -1) {
        // Update existing conversation
        conversations[index] = conversation;
      } else {
        // Add new conversation
        conversations.push(conversation);
      }
      
      // Save back to storage
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(conversations));
      return true;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return false;
    }
  }

  // Delete a conversation
  async deleteConversation(conversationId) {
    try {
      const conversations = await this.getConversations();
      const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredConversations));
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  // Get a specific conversation by ID
  async getConversationById(conversationId) {
    try {
      const conversations = await this.getConversations();
      return conversations.find(conv => conv.id === conversationId) || null;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }
  
  // Create a new conversation
  createNewConversation(pdfUri, fileName) {
    return {
      id: Date.now().toString(),
      pdfUri,
      fileName,
      title: `${fileName} - ${new Date().toLocaleString()}`,
      messages: [
        { 
          id: '1', 
          text: 'Hello, I\'m Sparkle AI. Ask me questions about the PDF content.', 
          isUser: false 
        }
      ],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }
}

export default new ConversationService();
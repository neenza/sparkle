import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import GeminiService from '../services/GeminiService';
import ConversationService from '../services/ConversationService';

const PDFContext = createContext();

export const PDFProvider = ({ children }) => {
  const [pdfUri, setPdfUri] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfContent, setPdfContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  
  // Load conversations on initial render
  useEffect(() => {
    loadConversations();
  }, []);
  
  // Load all conversations from storage
  const loadConversations = async () => {
    const storedConversations = await ConversationService.getConversations();
    setConversations(storedConversations);
  };

  // Create a new conversation for the current PDF
  const createNewConversation = async (uri, name, content) => {
    const newConversation = ConversationService.createNewConversation(uri, name);
    await ConversationService.saveConversation(newConversation);
    setCurrentConversation(newConversation);
    await loadConversations(); // Reload the conversations list
    return newConversation;
  };

  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    const conversation = await ConversationService.getConversationById(conversationId);
    if (conversation) {
      setPdfUri(conversation.pdfUri);
      setFileName(conversation.fileName);
      setCurrentConversation(conversation);
      
      // Need to load the PDF content again since it's not stored in the conversation
      // This is typically handled when viewing the PDF
      return conversation;
    }
    return null;
  };

  // Find conversations for a specific PDF 
  const findConversationsForPdf = (uri, name) => {
    if (!name) return [];
    
    console.log("Looking for conversations with display name:", name);
    
    return conversations.filter(conv => {
      const match = conv.fileName === name;
      if (match) {
        console.log("Found matching conversation:", conv.id, "for file:", name);
      }
      return match;
    });
  };

  // Update the current conversation with new messages
  const updateCurrentConversation = async (messages) => {
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        messages,
        lastUpdated: new Date().toISOString()
      };
      
      await ConversationService.saveConversation(updatedConversation);
      setCurrentConversation(updatedConversation);
      await loadConversations(); // Reload the list to show updated times
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId) => {
    await ConversationService.deleteConversation(conversationId);
    
    // If the deleted conversation was the current one, find another conversation for the same PDF
    if (currentConversation && currentConversation.id === conversationId) {
      // Find other conversations for the same PDF
      const otherConversations = conversations.filter(
        conv => conv.id !== conversationId && conv.fileName === fileName
      ).sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
      
      if (otherConversations.length > 0) {
        // Set the most recent conversation as current
        setCurrentConversation(otherConversations[0]);
        console.log("Switched to another conversation:", otherConversations[0].id);
      } else {
        // If no other conversations for this PDF, just clear current conversation
        // but don't clear the PDF view
        setCurrentConversation(null);
      }
    }
    
    await loadConversations(); // Reload the list
  };

  const loadPDF = async (uri, name, content) => {
    setPdfUri(uri);
    setFileName(name);
    setPdfContent(content);
    
    // Set the content in the Gemini service for AI processing
    const success = GeminiService.setPdfContent(content);
    
    // Show alert if content was successfully loaded into AI service and content is not empty
    if (success && content && content.length > 0) {
      Alert.alert(
        "PDF Loaded",
        "PDF content has been successfully loaded into the AI service.",
        [{ text: "OK" }]
      );
      
      // Check for existing conversations for this PDF
      const existingConversations = findConversationsForPdf(uri, name);
      
      if (existingConversations.length > 0) {
        // If there are existing conversations, load the most recently updated one
        const mostRecentConversation = existingConversations.sort((a, b) => 
          new Date(b.lastUpdated) - new Date(a.lastUpdated)
        )[0];
        
        setCurrentConversation(mostRecentConversation);
        console.log("Restored previous conversation:", mostRecentConversation.id);
      } else {
        // Create a new conversation if none exists for this PDF
        createNewConversation(uri, name, content);
      }
    }
  };

  const clearPDF = () => {
    // Only clear the UI state but preserve the conversation reference
    // We're saving the current conversation before clearing
    const savedConversation = currentConversation;
    
    setPdfUri(null);
    setFileName('');
    setPdfContent(null);
    GeminiService.setPdfContent(null);
    
    // We're not clearing the current conversation now
    // setCurrentConversation(null);
  };

  return (
    <PDFContext.Provider
      value={{
        pdfUri,
        fileName,
        pdfContent,
        isLoading,
        setIsLoading,
        loadPDF,
        clearPDF,
        conversations,
        currentConversation,
        setCurrentConversation,
        loadConversations,
        loadConversation,
        createNewConversation,
        updateCurrentConversation,
        deleteConversation,
        findConversationsForPdf
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => useContext(PDFContext);

export default PDFContext;
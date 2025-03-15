import React, { createContext, useState, useContext } from 'react';
import { Alert } from 'react-native';
import GeminiService from '../services/GeminiService';

const PDFContext = createContext();

export const PDFProvider = ({ children }) => {
  const [pdfUri, setPdfUri] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pdfContent, setPdfContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    }
  };

  const clearPDF = () => {
    setPdfUri(null);
    setFileName('');
    setPdfContent(null);
    GeminiService.setPdfContent(null);
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
        clearPDF
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => useContext(PDFContext);

export default PDFContext;
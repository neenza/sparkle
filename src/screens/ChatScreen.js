import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Clipboard,
  ToastAndroid,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import GeminiService from '../services/GeminiService';
import { usePDF } from '../context/PDFContext';

const ChatScreen = () => {
  const { width } = useWindowDimensions();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { 
    pdfContent, 
    pdfUri, 
    fileName, 
    currentConversation, 
    updateCurrentConversation,
    createNewConversation
  } = usePDF();
  const [tapTimestamps, setTapTimestamps] = useState({});
  const DOUBLE_TAP_DELAY = 3000;

  // Initialize chat history from current conversation
  useEffect(() => {
    if (currentConversation && currentConversation.messages) {
      setChatHistory(currentConversation.messages);
    } else if (pdfUri && fileName) {
      // If we have a PDF but no conversation, create one
      const initializeConversation = async () => {
        const newConversation = await createNewConversation(pdfUri, fileName);
        if (newConversation && newConversation.messages) {
          setChatHistory(newConversation.messages);
        }
      };
      
      initializeConversation();
    } else {
      // Reset to default if no conversation or PDF
      setChatHistory([
        { id: '1', text: 'Hello, I\'m Sparkle AI. Ask me questions about the PDF content.', isUser: false }
      ]);
    }
  }, [currentConversation, pdfUri]);

  const sendMessage = async () => {
    if (message.trim() === '') return;
    
    // Add user message to chat history
    const userMessage = { id: Date.now().toString(), text: message, isUser: true };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    
    // Update conversation in storage
    if (currentConversation) {
      updateCurrentConversation(updatedHistory);
    }
    
    const userQuery = message;
    setMessage(''); // Clear input field
    setIsLoading(true);
    
    try {
      // Send the message to Gemini API with chat history and get a response
      // We exclude the last message (user's current question) as it's already part of the question
      const historyForContext = chatHistory.filter(msg => !msg.isStreaming);
      const response = await GeminiService.queryPdfContent(userQuery, historyForContext);
      
      // Add AI response to chat history
      const aiResponse = { 
        id: (Date.now() + 1).toString(), 
        text: response, 
        isUser: false 
      };
      const finalHistory = [...updatedHistory, aiResponse];
      setChatHistory(finalHistory);
      
      // Update conversation in storage
      if (currentConversation) {
        updateCurrentConversation(finalHistory);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorResponse = { 
        id: (Date.now() + 1).toString(), 
        text: "Sorry, I encountered an error processing your request. Please try again.", 
        isUser: false 
      };
      const finalHistory = [...updatedHistory, errorResponse];
      setChatHistory(finalHistory);
      
      // Update conversation in storage
      if (currentConversation) {
        updateCurrentConversation(finalHistory);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text) => {
    console.log('Copying text to clipboard:', text.substring(0, 50) + '...');
    Clipboard.setString(text);
    
    // Show toast on Android
    if (Platform.OS === 'android') {
      console.log('Showing Android toast');
      ToastAndroid.show('Response copied to clipboard', ToastAndroid.SHORT);
    } else {
      // Show alert on iOS
      console.log('Showing iOS alert');
      Alert.alert('Copied', 'Response copied to clipboard');
    }
  };

  // Handle tap on AI message - detect double tap
  const handleMessageTap = (item) => {
    const now = Date.now();
    const lastTap = tapTimestamps[item.id];
    
    console.log('Tap detected for message:', item.id);
    console.log('Last tap time:', lastTap);
    console.log('Current time:', now);
    console.log('Time difference:', lastTap ? now - lastTap : 'No previous tap');

    if (lastTap && (now - lastTap < DOUBLE_TAP_DELAY)) {
      console.log('Double tap detected! Copying text...');
      copyToClipboard(item.text);
    }

    console.log('Updating tap timestamp for message:', item.id);
    setTapTimestamps(prev => ({
      ...prev,
      [item.id]: now
    }));
  };

  const renderChatMessage = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleMessageTap(item)}
      disabled={item.isUser}
    >
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <View style={styles.messageContent}>
          {item.isUser ? (
            <Text style={[styles.messageText, styles.userMessageText]}>
              {item.text}
            </Text>
          ) : (
            <Markdown 
              style={{
                body: styles.markdownBody,
                text: styles.markdownText,
                link: {
                  color: '#007bff',
                },
                strong: {
                  color: '#333333',
                  fontWeight: 'bold',
                },
                em: {
                  fontStyle: 'italic',
                },
                bullet_list: {
                  marginTop: 5,
                  marginBottom: 5,
                },
                ordered_list: {
                  marginTop: 5,
                  marginBottom: 5,
                },
                code_inline: {
                  backgroundColor: '#f0f0f0',
                  padding: 3,
                  borderRadius: 3,
                  fontFamily: Platform.select({
                    ios: 'Courier',
                    android: 'monospace',
                  }),
                },
                code_block: {
                  backgroundColor: '#f0f0f0',
                  padding: 10,
                  borderRadius: 5,
                  fontFamily: Platform.select({
                    ios: 'Courier',
                    android: 'monospace',
                  }),
                  marginVertical: 5,
                },
                fence: {
                  backgroundColor: '#f0f0f0',
                  padding: 10,
                  borderRadius: 5,
                  fontFamily: Platform.select({
                    ios: 'Courier',
                    android: 'monospace',
                  }),
                  marginVertical: 5,
                },
                blockquote: {
                  backgroundColor: '#f9f9f9',
                  borderLeftColor: '#ddd',
                  borderLeftWidth: 4,
                  paddingLeft: 10,
                  marginVertical: 5,
                }
              }}
              selectable={true}
            >
              {item.text}
            </Markdown>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>
          {currentConversation?.title || 'Chat with Sparkle AI'}
        </Text>
        
        {!pdfContent ? (
          <View style={styles.noPdfContainer}>
            <Text style={styles.noPdfText}>
              Please select a PDF file from the PDF Viewer tab first.
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              data={chatHistory}
              renderItem={renderChatMessage}
              keyExtractor={item => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatContent}
            />
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Ask about the PDF..."
                placeholderTextColor="#999"
                multiline
              />
              {isLoading ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    message.trim() === '' && styles.disabledButton
                  ]} 
                  onPress={sendMessage}
                  disabled={message.trim() === ''}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 0,
    margin: 0,
  },
  container: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
    position: 'relative',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  noPdfContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPdfText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 10,
    paddingBottom: 100, // Add padding to prevent content from being hidden
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  messageContent: {
    flexDirection: 'row',
    flexShrink: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
  },
  aiBubble: {
    backgroundColor: '#e5e5ea',
  },
  messageText: {
    fontSize: 16,
    flexShrink: 1,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10, // Increased padding for iOS
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  loadingButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  markdownBody: {
    color: '#333333',
    fontSize: 16,
    flexShrink: 1,
  },
  markdownText: {
    color: '#333333',
  },
});

export default ChatScreen;
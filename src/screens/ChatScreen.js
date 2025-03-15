import React, { useState } from 'react';
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
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import GeminiService from '../services/GeminiService';
import { usePDF } from '../context/PDFContext';

const ChatScreen = () => {
  const { width } = useWindowDimensions();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: '1', text: 'Hello, I\'m Sparkle AI. Ask me questions about the PDF content.', isUser: false }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { pdfContent } = usePDF();

  const sendMessage = async () => {
    if (message.trim() === '') return;
    
    // Add user message to chat history
    const userMessage = { id: Date.now().toString(), text: message, isUser: true };
    setChatHistory(prevHistory => [...prevHistory, userMessage]);
    
    const userQuery = message;
    setMessage(''); // Clear input field
    setIsLoading(true);
    
    try {
      // Send the message to Gemini API and get a response
      const response = await GeminiService.queryPdfContent(userQuery);
      
      // Add AI response to chat history
      const aiResponse = { 
        id: (Date.now() + 1).toString(), 
        text: response, 
        isUser: false 
      };
      setChatHistory(prevHistory => [...prevHistory, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorResponse = { 
        id: (Date.now() + 1).toString(), 
        text: "Sorry, I encountered an error processing your request. Please try again.", 
        isUser: false 
      };
      setChatHistory(prevHistory => [...prevHistory, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChatMessage = ({ item }) => (
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
              body: {
                color: '#333333',
                fontSize: 16,
                flexShrink: 1,
              },
              text: {
                color: '#333333',
              },
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
          >
            {item.text}
          </Markdown>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Chat with Sparkle AI</Text>
        
        {!pdfContent ? (
          <View style={styles.noPdfContainer}>
            <Text style={styles.noPdfText}>
              Please select a PDF file from the PDF Viewer tab first.
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={chatHistory}
              renderItem={renderChatMessage}
              keyExtractor={item => item.id}
              style={styles.chatList}
              contentContainerStyle={styles.chatContent}
            />
            
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.inputContainer}
            >
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
            </KeyboardAvoidingView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
    paddingBottom: 10,
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
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
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
});

export default ChatScreen;
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Animated,
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { usePDF } from '../context/PDFContext';
import { useNavigation } from '@react-navigation/native';
import ApiKeyService from '../services/ApiKeyService';
import GeminiService from '../services/GeminiService';

const ChatSidebar = ({ isOpen, onClose }) => {
  const { 
    conversations, 
    currentConversation, 
    loadConversation,
    createNewConversation, 
    pdfUri, 
    fileName,
    deleteConversation,
    loadConversations,
    findConversationsForPdf
  } = usePDF();
  const navigation = useNavigation();
  const [apiKey, setApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isKeySet, setIsKeySet] = useState(false);
  
  // Reload conversations whenever the sidebar is opened
  useEffect(() => {
    if (isOpen) {
      console.log("Sidebar opened, reloading conversations");
      loadConversations();
      loadApiKeyStatus();
    }
  }, [isOpen]);
  
  // Load API key status (but not the actual key for security)
  const loadApiKeyStatus = async () => {
    const key = await ApiKeyService.getApiKey();
    setIsKeySet(!!key);
    if (key) {
      // Mask the key for display
      setApiKey('•'.repeat(Math.min(key.length, 20)));
    } else {
      setApiKey('');
    }
    setIsKeyVisible(false);
  };
  
  // Save the API key
  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter a valid API key");
      return;
    }
    
    // Skip saving if it's the masked version
    if (apiKey.match(/^•+$/)) {
      return;
    }
    
    const success = await ApiKeyService.saveApiKey(apiKey.trim());
    if (success) {
      // Initialize Gemini service with the new key
      const initialized = await GeminiService.updateApiKey(apiKey.trim());
      if (initialized) {
        Alert.alert("Success", "API key saved successfully");
        setIsKeySet(true);
        // Mask the key for display
        setApiKey('•'.repeat(Math.min(apiKey.length, 20)));
        setIsKeyVisible(false);
      } else {
        Alert.alert("Error", "Invalid API key. Please check and try again.");
      }
    } else {
      Alert.alert("Error", "Failed to save API key");
    }
  };
  
  // Remove the API key
  const removeApiKey = async () => {
    Alert.alert(
      "Remove API Key",
      "Are you sure you want to remove your API key?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            const success = await ApiKeyService.removeApiKey();
            if (success) {
              setApiKey('');
              setIsKeySet(false);
              Alert.alert("Success", "API key removed successfully");
            } else {
              Alert.alert("Error", "Failed to remove API key");
            }
          }
        }
      ]
    );
  };
  
  // Toggle API key visibility
  const toggleKeyVisibility = async () => {
    if (!isKeyVisible && isKeySet) {
      // If we're making it visible and the key is set, get the actual key
      const key = await ApiKeyService.getApiKey();
      setApiKey(key || '');
    } else if (isKeyVisible && isKeySet) {
      // If we're hiding it and the key is set, mask it
      const key = await ApiKeyService.getApiKey();
      setApiKey('•'.repeat(Math.min(key?.length || 0, 20)));
    }
    setIsKeyVisible(!isKeyVisible);
  };
  
  const sidebarWidth = 250;
  const screenWidth = Dimensions.get('window').width;
  
  // Position the sidebar based on isOpen state
  const translateX = isOpen ? 0 : -sidebarWidth;
  
  // Format the date for display
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get conversations for the current PDF
  const currentPdfConversations = pdfUri ? findConversationsForPdf(pdfUri, fileName) : [];
  console.log(`Found ${currentPdfConversations.length} conversations for current PDF: ${fileName}`);
  
  // Handle creating a new conversation
  const handleNewConversation = async () => {
    if (pdfUri && fileName) {
      await createNewConversation(pdfUri, fileName);
      onClose();
      // Navigate to the chat screen
      navigation.navigate('Chat');
    }
  };
  
  // Handle opening a conversation
  const handleOpenConversation = async (conversationId) => {
    await loadConversation(conversationId);
    onClose();
    // Navigate to the chat screen
    navigation.navigate('Chat');
  };
  
  // Render each conversation item
  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        currentConversation?.id === item.id && styles.activeConversation
      ]}
      onPress={() => handleOpenConversation(item.id)}
    >
      <View style={styles.conversationContent}>
        <Text 
          style={styles.conversationTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        <Text style={styles.conversationDate}>
          {formatDate(item.lastUpdated)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteConversation(item.id)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      {isOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={onClose} 
          activeOpacity={1}
        />
      )}
      <Animated.View 
        style={[
          styles.sidebar,
          { width: sidebarWidth, transform: [{ translateX }] }
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sidebarContent}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chat History</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Content Section - This will flex to fill available space */}
          <View style={styles.contentContainer}>
            {pdfUri ? (
              <>
                <TouchableOpacity
                  style={styles.newConversationButton}
                  onPress={handleNewConversation}
                >
                  <Text style={styles.newConversationText}>+ New Conversation</Text>
                </TouchableOpacity>
                
                {currentPdfConversations.length > 0 ? (
                  <FlatList
                    data={currentPdfConversations.sort((a, b) => 
                      new Date(b.lastUpdated) - new Date(a.lastUpdated)
                    )}
                    keyExtractor={item => item.id}
                    renderItem={renderConversationItem}
                    style={styles.conversationsList}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No conversations for this PDF yet.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Please select a PDF first to view or create conversations.
                </Text>
              </View>
            )}
          </View>
          
          {/* API Key Section - Always at the bottom */}
          <View style={styles.apiKeyContainer}>
            <Text style={styles.apiKeyTitle}>Gemini API Key</Text>
            <View style={styles.apiKeyInputContainer}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your Gemini API key"
                placeholderTextColor="#999"
                secureTextEntry={!isKeyVisible}
              />
              <TouchableOpacity 
                style={styles.visibilityToggle}
                onPress={toggleKeyVisibility}
              >
                <Text style={styles.visibilityToggleText}>
                  {isKeyVisible ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.apiKeyButtonContainer}>
              <TouchableOpacity 
                style={[styles.apiKeyButton, styles.saveButton]}
                onPress={saveApiKey}
              >
                <Text style={styles.apiKeyButtonText}>Save</Text>
              </TouchableOpacity>
              {isKeySet && (
                <TouchableOpacity 
                  style={[styles.apiKeyButton, styles.removeButton]}
                  onPress={removeApiKey}
                >
                  <Text style={styles.apiKeyButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.apiKeyInfo}>
              {isKeySet 
                ? "Your API key is saved and will be used for all conversations." 
                : "Please enter your Gemini API key to use the chat feature."}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
    height: '100%' // Explicitly set height to 100%
  },
  sidebarContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#333'
  },
  newConversationButton: {
    padding: 15,
    backgroundColor: '#007bff',
    alignItems: 'center',
    margin: 10,
    borderRadius: 5
  },
  newConversationText: {
    color: 'white',
    fontWeight: 'bold'
  },
  conversationsList: {
    flex: 1
  },
  conversationItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  conversationContent: {
    flex: 1,
    marginRight: 10
  },
  activeConversation: {
    backgroundColor: '#e6f0ff'
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '500'
  },
  conversationDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 3
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#ff3b30'
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666'
  },
  apiKeyContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8'
  },
  apiKeyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff'
  },
  apiKeyInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    color: '#333'
  },
  visibilityToggle: {
    padding: 10
  },
  visibilityToggleText: {
    fontSize: 16
  },
  apiKeyButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  apiKeyButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5
  },
  saveButton: {
    backgroundColor: '#4caf50'
  },
  removeButton: {
    backgroundColor: '#f44336'
  },
  apiKeyButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  apiKeyInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'center'
  },
  contentContainer: {
    flex: 1, // This will make it expand to fill available space
  }
});

export default ChatSidebar;
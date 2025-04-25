import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import PDFService from '../services/PDFService';
import { usePDF } from '../context/PDFContext';
import ChatSidebar from '../components/ChatSidebar';

const PDFViewerScreen = () => {
  const [loading, setLoading] = useState(false);
  const [base64Content, setBase64Content] = useState(null);
  const { pdfUri, fileName, loadPDF, clearPDF, loadConversations } = usePDF();
  const webViewRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ensure we reload conversations when the component mounts
  useEffect(() => {
    loadConversations();
  }, []);

  const extractTextFromPdf = async () => {
    const extractScript = `
      const pdfContainer = document.querySelector('embed');
      if (pdfContainer) {
        const textContent = Array.from(document.querySelectorAll('.textLayer div'))
          .map(div => div.textContent)
          .join('\\n');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'text', content: textContent }));
      }
    `;
    webViewRef.current?.injectJavaScript(extractScript);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      
      if (result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        console.log('Selected file:', selectedFile);
        setLoading(true);
        
        try {
          // Load conversations before processing PDF to ensure we have all history
          await loadConversations();
          
          // Get base64 content for PDF viewing
          const base64Data = await PDFService.getBase64Content(selectedFile.uri);
          setBase64Content(base64Data);
          
          // We'll extract text after the PDF loads in the WebView
          loadPDF(selectedFile.uri, selectedFile.name, '');
        } catch (error) {
          console.error('Error processing PDF:', error);
          Alert.alert(
            'Error',
            'Failed to process the PDF file. Please try another file.',
            [{ text: 'OK' }]
          );
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        'Error',
        'Failed to select the PDF file. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClear = () => {
    setBase64Content(null);
    clearPDF();
    // Keep conversation history intact by not doing anything else
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'text' && data.content) {
        // Update the PDF content in the context
        loadPDF(pdfUri, fileName, data.content);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeftSection}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => setIsSidebarOpen(true)}
          >
            <Text style={styles.menuButtonText}>≡</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PDF Viewer</Text>
        </View>
        <View style={styles.buttonContainer}>
          {!pdfUri && (
            <TouchableOpacity 
              style={styles.pickButton} 
              onPress={pickDocument}
            >
              <Text style={styles.pickButtonText}>Select PDF</Text>
            </TouchableOpacity>
          )}
          {pdfUri && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClear}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {!base64Content ? (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Select a PDF file to view</Text>
        </View>
      ) : (
        <>
          <Text style={styles.fileName}>{fileName}</Text>
          <View style={styles.webviewContainer}>
            <WebView
              ref={webViewRef}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">
                      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js"></script>
                      <script src="https://cdn.jsdelivr.net/npm/panzoom@9.4.0/dist/panzoom.min.js"></script>
                      <style>
                        body, html {
                          margin: 0;
                          padding: 0;
                          width: 100%;
                          height: 100%;
                          overflow: hidden;
                          background-color: #f5f5f5;
                          touch-action: pan-y pinch-zoom;
                          -webkit-overflow-scrolling: touch;
                        }
                        #container {
                          width: 100%;
                          height: 100%;
                          overflow: hidden;
                          position: relative;
                        }
                        #viewer {
                          width: 100%;
                          height: 100%;
                          padding: 0;
                          position: absolute;
                          top: 0;
                          left: 0;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          overflow-y: auto;
                          overflow-x: hidden;
                          -webkit-overflow-scrolling: touch;
                          overscroll-behavior: contain;
                          touch-action: pan-y pinch-zoom;
                          transform-origin: 0 0;
                        }
                        .page {
                          position: relative;
                          width: 100% !important;
                          margin: 10px 0;
                          background-color: white;
                          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                          touch-action: pan-y pinch-zoom;
                        }
                        canvas {
                          width: 100% !important;
                          height: auto !important;
                          display: block;
                          touch-action: pan-y pinch-zoom;
                        }
                        .textLayer {
                          position: absolute;
                          top: 0;
                          left: 0;
                          right: 0;
                          bottom: 0;
                          overflow: hidden;
                          opacity: 0;
                          line-height: 1.0;
                          pointer-events: none;
                        }
                        .textLayer > div {
                          color: transparent;
                          position: absolute;
                          cursor: text;
                          transform-origin: 0% 0%;
                        }
                      </style>
                    </head>
                    <body>
                      <div id="container">
                        <div id="viewer"></div>
                      </div>
                      <script>
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
                        
                        const loadPDF = async () => {
                          try {
                            const pdfData = atob('${base64Content}');
                            const loadingTask = pdfjsLib.getDocument({data: pdfData});
                            const pdf = await loadingTask.promise;
                            const viewer = document.getElementById('viewer');
                            let extractedText = '';
                            
                            // Get the actual container width
                            const containerWidth = document.getElementById('container').clientWidth;
                            
                            // Render each page
                            for(let i = 1; i <= pdf.numPages; i++) {
                              const page = await pdf.getPage(i);
                              const originalViewport = page.getViewport({ scale: 1.0 });
                              
                              // Calculate scale to fit width
                              const scale = (containerWidth) / originalViewport.width;
                              const viewport = page.getViewport({ scale });
                              
                              // Create page container
                              const pageDiv = document.createElement('div');
                              pageDiv.className = 'page';
                              viewer.appendChild(pageDiv);
                              
                              // Add canvas with high DPI support
                              const canvas = document.createElement('canvas');
                              const context = canvas.getContext('2d');
                              const pixelRatio = window.devicePixelRatio || 1;
                              
                              canvas.width = viewport.width * pixelRatio;
                              canvas.height = viewport.height * pixelRatio;
                              canvas.style.width = viewport.width + 'px';
                              canvas.style.height = viewport.height + 'px';
                              context.scale(pixelRatio, pixelRatio);
                              
                              pageDiv.appendChild(canvas);
                              
                              // Render PDF page
                              await page.render({
                                canvasContext: context,
                                viewport: viewport,
                                enableWebGL: true,
                                renderInteractiveForms: true
                              }).promise;
                              
                              // Extract text
                              const textContent = await page.getTextContent();
                              const pageText = textContent.items.map(item => item.str).join(' ');
                              extractedText += \`[Page \${i}]\\n\${pageText}\\n\\n\`;
                              
                              // Create text layer
                              const textLayerDiv = document.createElement('div');
                              textLayerDiv.className = 'textLayer';
                              pageDiv.appendChild(textLayerDiv);
                              
                              pdfjsLib.renderTextLayer({
                                textContent: textContent,
                                container: textLayerDiv,
                                viewport: viewport,
                                textDivs: []
                              });
                            }
                            
                            // Initialize panzoom with strict vertical scrolling
                            const element = document.getElementById('viewer');
                            let isPinching = false;
                            let startTouches = [];
                            
                            const pz = panzoom(element, {
                              maxZoom: 5,
                              minZoom: 1,
                              bounds: true,
                              boundsPadding: 0.1,
                              smoothScroll: false,
                              zoomDoubleClickSpeed: 1,
                              beforeWheel: function(e) {
                                // Only allow zooming with Ctrl key
                                if (!e.ctrlKey) {
                                  e.preventDefault();
                                  return false;
                                }
                                return true;
                              },
                              beforeMouseDown: function(e) {
                                // Prevent panning unless zoomed in
                                const scale = pz.getTransform().scale;
                                if (scale <= 1) {
                                  e.preventDefault();
                                  return false;
                                }
                                return true;
                              },
                              onTouch: function(e) {
                                if (e.touches.length === 2) {
                                  // Handle pinch zoom
                                  isPinching = true;
                                  return true;
                                }
                                
                                if (e.touches.length === 1 && !isPinching) {
                                  const scale = pz.getTransform().scale;
                                  if (scale <= 1) {
                                    // Allow default vertical scrolling when not zoomed
                                    return false;
                                  }
                                }
                                
                                return true;
                              }
                            });
                            
                            // Reset pinching state
                            document.addEventListener('touchend', function() {
                              isPinching = false;
                              const scale = pz.getTransform().scale;
                              if (scale <= 1) {
                                pz.moveTo(0, 0);
                              }
                            });
                            
                            // Double tap to zoom
                            let lastTap = 0;
                            document.addEventListener('touchend', function(e) {
                              const currentTime = new Date().getTime();
                              const tapLength = currentTime - lastTap;
                              if (tapLength < 300 && tapLength > 0) {
                                e.preventDefault();
                                const scale = pz.getTransform().scale;
                                if (scale > 1) {
                                  // Reset zoom
                                  pz.moveTo(0, 0);
                                  pz.zoomAbs(0, 0, 1);
                                  element.style.overflow = 'auto';
                                } else {
                                  // Zoom in to tap position
                                  const rect = e.target.getBoundingClientRect();
                                  const x = e.changedTouches[0].clientX - rect.left;
                                  const y = e.changedTouches[0].clientY - rect.top;
                                  pz.zoomAbs(x, y, 2);
                                }
                              }
                              lastTap = currentTime;
                            });

                            // Send extracted text back to React Native
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: 'text',
                              content: extractedText
                            }));
                          } catch (error) {
                            console.error('Error loading PDF:', error);
                          }
                        };
                        
                        loadPDF().catch(console.error);
                      </script>
                    </body>
                  </html>
                `,
                baseUrl: '',
              }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onMessage={handleWebViewMessage}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error:', nativeEvent);
                setLoading(false);
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              mixedContentMode="always"
              allowFileAccess={true}
              allowUniversalAccessFromFileURLs={true}
              scalesPageToFit={false}
              bounces={false}
            />
          </View>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Loading PDF...</Text>
            </View>
          )}
        </>
      )}
      
      {/* Chat History Sidebar */}
      <ChatSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  menuButton: {
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  pickButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  fileName: {
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#e6e6e6',
  },
  webviewContainer: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default PDFViewerScreen;
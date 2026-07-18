
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageRole, MessageType, ChatSession } from './types';
import { fetchModels, sendChatCompletion, generateChatTitle } from './services/api';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { MessageBubble } from './components/MessageBubble';
import { Send, Loader2, AlertCircle, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, Settings2, MessageSquare, Paperclip, X, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY_SESSIONS = 'pollinations_sessions_v1';
const STORAGE_KEY_THEME = 'pollinations_theme';
const STORAGE_KEY_MODELS = 'pollinations_default_model';
const STORAGE_KEY_API_KEY = 'pollinations_publishable_key';

const App: React.FC = () => {
  // --- State ---

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      return (localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark') || 'dark';
  });

  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
      return ''; 
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Layout State
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  // Models State
  const [textModels, setTextModels] = useState<string[]>(['openai']);
  const [defaultModel, setDefaultModel] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_MODELS) || 'openai';
  });
  const [apiKey, setApiKey] = useState(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
    return storedKey.startsWith('pk_') ? storedKey : '';
  });
  
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Helpers (Memoized) ---
  
  const getCurrentSession = useCallback(() => {
    return sessions.find(s => s.id === currentSessionId);
  }, [sessions, currentSessionId]);

  const getSystemInstruction = useCallback(() => {
    return sessions.find(s => s.id === currentSessionId)?.systemInstruction || '';
  }, [sessions, currentSessionId]);

  // Derived state
  const currentMessages = getCurrentSession()?.messages || [];
  const currentModel = getCurrentSession()?.model || defaultModel;
  const isStreamingEnabled = getCurrentSession()?.enableStreaming ?? true;

  // --- Effects ---

  // 1. Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // 2. Initialize Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const { textModels: fetchedModels } = await fetchModels(apiKey);
        
        let finalModels = fetchedModels.length ? fetchedModels : ['openai'];
        
        // Ensure the default model is in the list
        if (defaultModel && !finalModels.includes(defaultModel)) {
            finalModels = [defaultModel, ...finalModels];
        }

        setTextModels(finalModels);
        if (finalModels.length > 0 && !defaultModel) {
            setDefaultModel(finalModels[0]);
        }
      } catch (err) {
        console.error("Model fetch error", err);
        setError("Failed to load models. Using defaults.");
      }
    };
    loadModels();
  }, [apiKey]);

  // 3. Init Sessions / Default Session
  useEffect(() => {
     if (sessions.length === 0) {
         const newId = uuidv4();
         const newSession: ChatSession = { 
             id: newId, 
             title: 'New Chat', 
             messages: [], 
             createdAt: Date.now(),
             model: defaultModel,
             enableStreaming: true
         };
         setSessions([newSession]);
         setCurrentSessionId(newId);
     } else if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
         // Only set if currentSessionId is invalid or empty
         if (sessions.length > 0) {
             setCurrentSessionId(sessions[0].id);
         }
     }
  }, [sessions.length, currentSessionId, defaultModel]); // Simplified dependencies

  // 4. Persist Sessions
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);
  
  // 5. Persist Default Model
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_MODELS, defaultModel);
  }, [defaultModel]);

  useEffect(() => {
      if (apiKey.startsWith('pk_')) localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      else localStorage.removeItem(STORAGE_KEY_API_KEY);
  }, [apiKey]);

  // 6. Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionId, currentMessages.length, selectedImages.length]);

  // 7. Handle Resize for mobile responsiveness
  useEffect(() => {
      let lastWidth = window.innerWidth;
      const handleResize = () => {
          const currentWidth = window.innerWidth;
          // Only close if we are strictly crossing the boundary from desktop to mobile
          if (lastWidth >= 768 && currentWidth < 768) {
              setIsLeftSidebarOpen(false);
              setIsRightPanelOpen(false);
          }
          lastWidth = currentWidth;
      };
      
      window.addEventListener('resize', handleResize);
      
      // Initial check
      if (window.innerWidth < 768) {
          setIsLeftSidebarOpen(false);
          setIsRightPanelOpen(false);
      }
      return () => window.removeEventListener('resize', handleResize);
  }, []);


  // --- State Updaters (Memoized) ---

  const updateCurrentSession = useCallback((updater: (session: ChatSession) => ChatSession) => {
      setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
              return updater(s);
          }
          return s;
      }));
  }, [currentSessionId]);

  // --- Handlers (Memoized) ---

  const handleNewChat = useCallback(() => {
      const newSession: ChatSession = {
          id: uuidv4(),
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          systemInstruction: '',
          model: defaultModel, // Start with default
          enableStreaming: true
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      if (window.innerWidth < 768) {
          setIsLeftSidebarOpen(false);
          setIsRightPanelOpen(false);
      }
  }, [defaultModel]);

  const handleDeleteChat = useCallback((id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleRenameChat = useCallback((id: string, newTitle: string) => {
      setSessions(prev => prev.map(s => 
        s.id === id ? { ...s, title: newTitle } : s
      ));
  }, []);

  const handleToggleTheme = useCallback(() => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const handleSystemInstructionChange = useCallback((value: string) => {
    updateCurrentSession(s => ({ ...s, systemInstruction: value }));
  }, [updateCurrentSession]);
  
  const handleModelChange = useCallback((model: string) => {
      updateCurrentSession(s => ({ ...s, model: model }));
      setDefaultModel(model); 
  }, [updateCurrentSession]);
  
  const handleStreamingToggle = useCallback(() => {
      updateCurrentSession(s => ({ ...s, enableStreaming: !(s.enableStreaming ?? true) }));
  }, [updateCurrentSession]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const imagePromises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
      });
      
      try {
        const base64Images = await Promise.all(imagePromises);
        setSelectedImages(prev => [...prev, ...base64Images]);
      } catch (err) {
        console.error("Error reading files", err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imagePromises: Promise<string>[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
             imagePromises.push(new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            }));
        }
      }
    }

    if (imagePromises.length > 0) {
      e.preventDefault();
      try {
        const base64Images = await Promise.all(imagePromises);
        setSelectedImages(prev => [...prev, ...base64Images]);
      } catch (err) {
        console.error("Error pasting images", err);
      }
    }
  }, []);

  const removeSelectedImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Core Chat Logic

  const handleTextGeneration = useCallback(async (currentHistory: Message[], model: string, enableStreaming: boolean) => {
    const botMessageId = uuidv4();
    const botMessage: Message = {
        id: botMessageId,
        role: MessageRole.Assistant,
        content: '',
        type: MessageType.Text,
        isStreaming: true, 
        model: model
    };

    // 1. Add bot message placeholder
    setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
            return { ...s, messages: [...currentHistory, botMessage] };
        }
        return s;
    }));

    // 2. Prepare prompt
    const sysInstruction = getSystemInstruction();
    let apiMessages = [...currentHistory];
    
    if (sysInstruction.trim()) {
        apiMessages = [
            { id: 'system', role: MessageRole.System, content: sysInstruction, type: MessageType.Text },
            ...apiMessages
        ];
    }

    try {
        await sendChatCompletion(
            apiMessages, 
            model, 
            apiKey,
            (chunk) => {
                setSessions(prev => prev.map(s => {
                    if (s.id === currentSessionId) {
                        return {
                            ...s,
                            messages: s.messages.map(msg => {
                                if (msg.id === botMessageId) {
                                    return { ...msg, content: msg.content + chunk };
                                }
                                return msg;
                            })
                        };
                    }
                    return s;
                }));
            },
            enableStreaming
        );
        
        // Finalize
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: s.messages.map(msg => 
                        msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
                    )
                };
            }
            return s;
        }));

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to generate response');
        setSessions(prev => prev.map(s => {
             if (s.id === currentSessionId) {
                 // Remove empty bot message on failure
                 const msg = s.messages.find(m => m.id === botMessageId);
                 if (msg && !msg.content) {
                     return { ...s, messages: s.messages.filter(m => m.id !== botMessageId) };
                 }
                 return {
                     ...s,
                     messages: s.messages.map(m => m.id === botMessageId ? { ...m, isStreaming: false } : m)
                 };
             }
             return s;
        }));
    } finally {
        setIsLoading(false);
    }
  }, [apiKey, currentSessionId, getSystemInstruction]);

  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;
    if (!apiKey.startsWith('pk_')) {
      setError('Add a browser-safe Pollinations pk_ key in Configuration.');
      setIsRightPanelOpen(true);
      return;
    }
    
    const session = getCurrentSession();
    if (!session) return; 
    
    const currentMsgs = session.messages;
    const isFirstMessage = currentMsgs.length === 0;
    const activeModel = session.model || defaultModel;
    
    const userMessage: Message = {
      id: uuidv4(),
      role: MessageRole.User,
      content: input.trim(),
      type: MessageType.Text,
      images: selectedImages.length > 0 ? [...selectedImages] : undefined
    };

    // Optimistic update for user message
    const updatedMessages = [...currentMsgs, userMessage];
    updateCurrentSession(s => ({ ...s, messages: updatedMessages }));
    
    const textContent = userMessage.content;
    setInput('');
    setSelectedImages([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);
    setError(null);
    
    if (isFirstMessage && textContent) {
        generateChatTitle(textContent, activeModel, apiKey).then(title => {
            if (title) handleRenameChat(session.id, title);
        });
    }

    await handleTextGeneration(updatedMessages, activeModel, session.enableStreaming ?? true);
  }, [apiKey, input, selectedImages, isLoading, getCurrentSession, defaultModel, updateCurrentSession, handleTextGeneration, handleRenameChat]);

  const handleEditMessage = useCallback(async (id: string, newContent: string) => {
    if (isLoading) return;
    
    const session = getCurrentSession();
    if (!session) return;

    const msgIndex = session.messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;

    // Slice history to remove everything after the edited message
    const newHistory = session.messages.slice(0, msgIndex + 1);
    newHistory[msgIndex] = { ...newHistory[msgIndex], content: newContent };

    updateCurrentSession(s => ({ ...s, messages: newHistory }));
    
    if (newHistory[msgIndex].role === MessageRole.User) {
      setIsLoading(true);
      setError(null);
      await handleTextGeneration(newHistory, session.model || defaultModel, session.enableStreaming ?? true);
    }
  }, [isLoading, getCurrentSession, updateCurrentSession, handleTextGeneration, defaultModel]);

  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;
    const session = getCurrentSession();
    if (!session) return;
    
    const messages = session.messages;
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role === MessageRole.Assistant) {
        const historyWithoutLast = messages.slice(0, -1);
        updateCurrentSession(s => ({ ...s, messages: historyWithoutLast }));
        setIsLoading(true);
        setError(null);
        await handleTextGeneration(historyWithoutLast, session.model || defaultModel, session.enableStreaming ?? true);
    }
  }, [isLoading, getCurrentSession, updateCurrentSession, handleTextGeneration, defaultModel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMobile = window.innerWidth < 768;
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // UI Toggles (Memoized)
  const handleToggleLeftSidebar = useCallback(() => setIsLeftSidebarOpen(prev => !prev), []);
  const handleToggleRightPanel = useCallback(() => setIsRightPanelOpen(prev => !prev), []);
  const handleCloseLeftSidebar = useCallback(() => setIsLeftSidebarOpen(false), []);
  const handleCloseRightPanel = useCallback(() => setIsRightPanelOpen(false), []);
  const handleOpenRightPanel = useCallback(() => setIsRightPanelOpen(true), []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-latte-base dark:bg-mocha-base text-latte-text dark:text-mocha-text font-sans transition-colors duration-300">
      
      {/* Mobile Backdrop for Left Sidebar */}
      {isLeftSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[25] md:hidden transition-opacity duration-300"
          onClick={handleCloseLeftSidebar}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectChat={setCurrentSessionId}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isOpen={isLeftSidebarOpen}
        onCloseMobile={handleCloseLeftSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-latte-surface0 dark:border-mocha-surface0 bg-latte-base/95 dark:bg-mocha-base/95 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-2">
              <button 
                onClick={handleToggleLeftSidebar} 
                className="p-2 hover:bg-latte-surface0 dark:hover:bg-mocha-surface0 rounded-lg transition-colors"
                title="Toggle Sidebar"
              >
                {isLeftSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
              </button>
              <span className="font-semibold md:hidden">Synapse</span>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                onClick={handleToggleRightPanel} 
                className={`p-2 rounded-lg transition-colors ${isRightPanelOpen ? 'bg-latte-surface0 dark:bg-mocha-surface0' : 'hover:bg-latte-surface0 dark:hover:bg-mocha-surface0'}`}
                title="Toggle Settings"
              >
                {isRightPanelOpen ? <Settings2 size={20} className="text-latte-blue dark:text-mocha-mauve" /> : <Settings2 size={20} />}
              </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative overscroll-none">
          <div className="max-w-6xl mx-auto">
            {currentMessages.length === 0 && (
               <div className="flex flex-col items-center justify-center min-h-[50vh] text-center opacity-50">
                  <div className="bg-latte-surface1 dark:bg-mocha-surface0 p-4 rounded-full mb-4 transition-colors">
                    <MessageSquare size={48} className="text-latte-lavender dark:text-mocha-mauve" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to Synapse</h2>
                  <p className="text-sm max-w-md mb-4">
                    Select a model from the settings panel and start chatting. 
                  </p>
               </div>
            )}
            
            {currentMessages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isDark={theme === 'dark'} 
                onEdit={handleEditMessage}
              />
            ))}
            
            {error && (
              <div className="flex items-center gap-2 p-4 mb-4 text-sm text-latte-red dark:text-mocha-red bg-latte-red/10 dark:bg-mocha-red/10 border border-latte-red/20 dark:border-mocha-red/20 rounded-lg">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-latte-surface0 dark:border-mocha-surface0 bg-latte-base dark:bg-mocha-base transition-colors z-10">
          <div className="max-w-6xl mx-auto relative">
            
            {/* Regenerate Button */}
            {!isLoading && currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === MessageRole.Assistant && (
              <div className="flex justify-center mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-mocha-surface0 border border-latte-surface1 dark:border-mocha-surface1 shadow-sm hover:bg-latte-surface0 dark:hover:bg-mocha-surface1 transition-all text-xs font-medium text-latte-text dark:text-mocha-text group"
                >
                  <RotateCcw size={13} className="group-hover:-rotate-180 transition-transform duration-500" />
                  <span>Regenerate response</span>
                </button>
              </div>
            )}

            <div className="relative rounded-xl border shadow-sm border-latte-surface1 dark:border-mocha-surface0 bg-white dark:bg-mocha-surface0 transition-all duration-300 overflow-hidden">
              
              {/* Image Preview */}
              {selectedImages.length > 0 && (
                <div className="flex gap-2 p-3 overflow-x-auto border-b border-latte-surface0 dark:border-white/5 bg-latte-base/5 dark:bg-black/10">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative group flex-shrink-0">
                      <img 
                        src={img} 
                        alt="Preview" 
                        className="h-16 w-16 object-cover rounded-md border border-latte-surface1 dark:border-white/10"
                      />
                      <button
                        onClick={() => removeSelectedImage(idx)}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 p-2">
                {/* Attachment Button */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg transition-colors flex-shrink-0
                    text-latte-subtext1 hover:text-latte-text hover:bg-latte-surface0
                    dark:text-mocha-overlay0 dark:hover:text-mocha-text dark:hover:bg-mocha-surface1"
                  title="Attach Image"
                  disabled={isLoading}
                >
                  <Paperclip size={20} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={selectedImages.length > 0 ? "Add a caption..." : "Type a message..."}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none py-2.5 max-h-32 min-h-[44px] text-latte-text dark:text-mocha-text placeholder-latte-surface1 dark:placeholder-mocha-overlay0 overflow-y-auto"
                  rows={1}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                  className={`p-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
                    (input.trim() || selectedImages.length > 0) && !isLoading
                      ? 'bg-latte-blue text-white shadow-md hover:bg-latte-blue/90 dark:bg-mocha-blue dark:hover:bg-mocha-blue/90' 
                      : 'bg-latte-surface0 text-latte-subtext1 dark:bg-mocha-surface0 dark:text-mocha-overlay0 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
            
            <div className="text-center mt-2">
              <p className="text-[10px] text-latte-subtext1 dark:text-mocha-overlay0">
                AI can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop for Right Panel */}
      {isRightPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[25] md:hidden transition-opacity duration-300"
          onClick={handleCloseRightPanel}
          aria-hidden="true"
        />
      )}

      {/* Right Panel */}
      <RightPanel 
        isOpen={isRightPanelOpen}
        onCloseMobile={handleCloseRightPanel}
        textModels={textModels}
        selectedTextModel={currentModel}
        onSelectTextModel={handleModelChange}
        enableStreaming={isStreamingEnabled}
        onToggleStreaming={handleStreamingToggle}
        systemInstruction={getSystemInstruction()}
        onSystemInstructionChange={handleSystemInstructionChange}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

    </div>
  );
};

export default App;

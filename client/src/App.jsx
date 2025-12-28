import { useState, useRef, useEffect } from 'react';
import { APP_CONFIG } from './config';
import { sendMessage } from './api/client';
import StructuredDataDisplay from './components/StructuredDataDisplay';
import ClarificationDialog from './components/ClarificationDialog';
import { useQueryHistory } from './hooks/useQueryHistory';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSamples, setShowSamples] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [clarificationData, setClarificationData] = useState(null);
  const [showClarification, setShowClarification] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { history, addQuery, clearHistory, getSuggestions, getRecentQueries } = useQueryHistory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (APP_CONFIG.welcomeMessage.show) {
      setMessages([{
        type: 'assistant',
        content: `**${APP_CONFIG.welcomeMessage.title}**\n\n${APP_CONFIG.welcomeMessage.content}`,
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowSamples(false);

    // Add to query history
    addQuery(messageText);

    try {
      const response = await sendMessage(messageText);

      // Check if clarification is needed
      if (response.needsClarification) {
        setClarificationData(response.clarification);
        setShowClarification(true);
        setPendingQuery(messageText);
        setIsLoading(false);
        return;
      }

      const assistantMessage = {
        type: 'assistant',
        content: response.response || response.narrative,
        data: response.data,
        insights: response.insights,
        narrative: response.narrative,
        metadata: response.metadata,
        processingTime: response.metadata?.processingTimeMs
          ? (response.metadata.processingTimeMs / 1000).toFixed(2)
          : response.processingTime,
        timestamp: new Date(response.timestamp || Date.now())
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: `Error: ${error.message}. Please make sure the server is running.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSelect = async (option) => {
    setShowClarification(false);

    // Create clarification response message
    const clarificationMessage = {
      type: 'assistant',
      content: `You selected: **${option.label}**\n\nProcessing your request...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, clarificationMessage]);

    // Handle different actions
    if (option.action === 'rephrase') {
      // User wants to rephrase - just close dialog and let them type new query
      setClarificationData(null);
      setPendingQuery('');
      return;
    }

    // Resubmit the query with clarification context
    // Append the selected option to the query so the filter generator can process it
    let modifiedQuery = pendingQuery;

    // Handle specific actions if they exist
    if (option.action === 'include_all_platforms') {
      modifiedQuery = `${pendingQuery} (include all mentioned platforms)`;
    } else if (option.action === 'show_available_only') {
      modifiedQuery = `${pendingQuery} (show only available data)`;
    } else {
      // For general clarifications, append the selected option to the query
      modifiedQuery = `${pendingQuery} [Selected: ${option.label}]`;
    }

    setIsLoading(true);
    try {
      const response = await sendMessage(modifiedQuery);

      const assistantMessage = {
        type: 'assistant',
        content: response.response || response.narrative,
        data: response.data,
        insights: response.insights,
        narrative: response.narrative,
        metadata: response.metadata,
        processingTime: response.metadata?.processingTimeMs
          ? (response.metadata.processingTimeMs / 1000).toFixed(2)
          : response.processingTime,
        timestamp: new Date(response.timestamp || Date.now())
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: `Error: ${error.message}. Please make sure the server is running.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setClarificationData(null);
      setPendingQuery('');
    }
  };

  const handleClarificationCancel = () => {
    setShowClarification(false);
    setClarificationData(null);
    setPendingQuery('');

    // Add a message indicating the user wants to rephrase
    const cancelMessage = {
      type: 'assistant',
      content: 'No problem! Feel free to rephrase your question.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Clarification Dialog */}
      <ClarificationDialog
        clarification={clarificationData}
        onSelect={handleClarificationSelect}
        onCancel={handleClarificationCancel}
        isOpen={showClarification}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                {APP_CONFIG.appName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">{APP_CONFIG.appTagline}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
                </span>
                Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-primary-600 text-white'
                          : message.type === 'error'
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : 'bg-gray-50 text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.type === 'user' ? (
                        <div className="prose prose-sm max-w-none">
                          <MessageContent content={message.content} />
                        </div>
                      ) : message.type === 'error' ? (
                        <div className="prose prose-sm max-w-none">
                          <MessageContent content={message.content} />
                        </div>
                      ) : (
                        <StructuredDataDisplay
                          data={message.data}
                          insights={message.insights}
                          narrative={message.narrative || message.content}
                          metadata={message.metadata}
                        />
                      )}
                      {message.processingTime && APP_CONFIG.ui.showProcessingTime && (
                        <div className="text-xs text-gray-500 mt-2">
                          ⏱️ {message.processingTime}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {APP_CONFIG.ui.loadingMessages[Math.floor(Math.random() * APP_CONFIG.ui.loadingMessages.length)]}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="relative">
                  {/* Query History Suggestions */}
                  {showSuggestions && inputValue.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {getSuggestions(inputValue, 5).length > 0 ? (
                        <div className="py-2">
                          <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Recent Queries
                          </div>
                          {getSuggestions(inputValue, 5).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setInputValue(item.query);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors flex items-center gap-2"
                            >
                              <span className="text-gray-400">🕐</span>
                              <span className="text-sm text-gray-700 flex-1">{item.query}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Recent Queries Button */}
                  {getRecentQueries(5).length > 0 && !showHistory && (
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="absolute bottom-full left-0 mb-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <span>📝</span>
                      <span>Show recent queries</span>
                    </button>
                  )}

                  {/* Recent Queries Dropdown */}
                  {showHistory && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                      <div className="py-2">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                          <span>Query History</span>
                          <button
                            onClick={() => setShowHistory(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                        {getRecentQueries(10).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setInputValue(item.query);
                              setShowHistory(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">🕐</span>
                              <div className="flex-1">
                                <div className="text-sm text-gray-700">{item.query}</div>
                                <div className="text-xs text-gray-400">
                                  {new Date(item.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                        {getRecentQueries(10).length > 0 && (
                          <div className="border-t border-gray-200 mt-2 pt-2 px-3 pb-2">
                            <button
                              onClick={() => {
                                if (window.confirm('Clear all query history?')) {
                                  clearHistory();
                                  setShowHistory(false);
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Clear history
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        // Show suggestions when user types
                        setShowSuggestions(e.target.value.length > 0);
                      }}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        if (inputValue.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on suggestions
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      placeholder={APP_CONFIG.ui.placeholderText}
                      maxLength={APP_CONFIG.ui.maxMessageLength}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() || isLoading}
                      className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {APP_CONFIG.ui.submitButtonText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {showSamples && APP_CONFIG.ui.showSampleQueries && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Queries</h3>
                <div className="space-y-4">
                  {APP_CONFIG.sampleQueries.map((category, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{category.icon}</span>
                        <h4 className="text-sm font-medium text-gray-700">{category.category}</h4>
                      </div>
                      <div className="space-y-1">
                        {category.queries.map((query, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSendMessage(query)}
                            className="w-full text-left text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded px-2 py-1.5 transition-colors"
                            disabled={isLoading}
                          >
                            {query}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Message Content Component with formatting
function MessageContent({ content }) {
  // Simple markdown-like formatting
  const formatText = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Headers
        if (line.startsWith('###')) {
          return `<h3 class="text-base font-semibold mt-3 mb-1">${line.replace('###', '').trim()}</h3>`;
        }
        if (line.startsWith('##')) {
          return `<h2 class="text-lg font-semibold mt-4 mb-2">${line.replace('##', '').trim()}</h2>`;
        }
        // Lists
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return `<li class="ml-4">${line.replace(/^[•\-]\s*/, '')}</li>`;
        }
        return `<p class="my-1">${line}</p>`;
      })
      .join('');
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
      className="text-sm leading-relaxed"
    />
  );
}

export default App;

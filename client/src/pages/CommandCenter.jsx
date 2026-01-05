import { useState, useRef, useEffect } from 'react';
import { APP_CONFIG } from '../config';
import { sendMessage } from '../api/client';
import StructuredDataDisplay from '../components/StructuredDataDisplay';
import ClarificationDialog from '../components/ClarificationDialog';
import { useQueryHistory } from '../hooks/useQueryHistory';

function MessageContent({ content }) {
  const formatText = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('###')) {
          return `<h3 class="text-base font-semibold mt-3 mb-1">${line.replace('###', '').trim()}</h3>`;
        }
        if (line.startsWith('##')) {
          return `<h2 class="text-lg font-semibold mt-4 mb-2">${line.replace('##', '').trim()}</h2>`;
        }
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

function CommandCenter() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSamples, setShowSamples] = useState(true);
  const [clarificationData, setClarificationData] = useState(null);
  const [showClarification, setShowClarification] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { addQuery } = useQueryHistory();

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

    addQuery(messageText);

    try {
      const response = await sendMessage(messageText);

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
    let selectedText;
    if (typeof option === 'string') {
      selectedText = option;
    } else if (typeof option === 'object' && option !== null) {
      selectedText = option.label || option.option || option.query || String(option);
    } else {
      selectedText = String(option);
    }

    const clarificationMessage = {
      type: 'assistant',
      content: `You selected: **${selectedText}**\n\nProcessing your request...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, clarificationMessage]);

    if (selectedText.toLowerCase().includes('rephrase') ||
      selectedText.toLowerCase().includes('let me rephrase')) {
      setClarificationData(null);
      setPendingQuery('');
      const cancelMessage = {
        type: 'assistant',
        content: 'No problem! Feel free to ask your question in a different way.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cancelMessage]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendMessage(selectedText);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ClarificationDialog
        clarification={clarificationData}
        onSelect={handleClarificationSelect}
        onCancel={handleClarificationCancel}
        isOpen={showClarification}
      />

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
                    className={`max-w-3xl rounded-lg px-4 py-3 ${message.type === 'user'
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
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
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
  );
}

export default CommandCenter;

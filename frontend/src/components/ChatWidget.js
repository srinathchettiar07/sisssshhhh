import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useMutation } from 'react-query';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const chatMutation = useMutation(aiAPI.chat, {
    onSuccess: (response) => {
      const aiResponse = response.data.data;
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'ai',
          message: aiResponse.response,
          sources: aiResponse.sources,
          suggestions: aiResponse.suggestions
        }
      ]);
    },
    onError: (error) => {
      toast.error('Failed to get AI response');
      console.error('Chat error:', error);
    }
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: message.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Send to AI
    chatMutation.mutate({
      message: message.trim(),
      context: '',
      userProfile: null
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-dark-800 border border-dark-700 rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-white">AI Career Coach</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-dark-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-dark-400 text-sm">
                <Bot className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                <p>Hi! I'm your AI career coach.</p>
                <p>How can I help you today?</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.type === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-white'
                  }`}
                >
                  {msg.message}
                  
                  {/* AI Suggestions */}
                  {msg.type === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs text-primary-300 hover:text-primary-200 underline"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatMutation.isLoading && (
              <div className="flex justify-start">
                <div className="bg-dark-700 text-white px-3 py-2 rounded-lg text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-dark-700 border border-dark-600 text-white placeholder-dark-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={chatMutation.isLoading}
              />
              <button
                type="submit"
                disabled={!message.trim() || chatMutation.isLoading}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors duration-200"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};


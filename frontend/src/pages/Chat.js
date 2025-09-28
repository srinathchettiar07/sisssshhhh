import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  MessageCircle,
  Sparkles,
  BookOpen,
  Briefcase,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! I'm your AI Career Coach. I can help you with:\n\n• Career guidance and advice\n• Resume optimization\n• Interview preparation\n• Job search strategies\n• Skill development recommendations\n\nWhat would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    {
      icon: BookOpen,
      title: 'Resume Review',
      description: 'Get feedback on your resume',
      prompt: 'Can you review my resume and suggest improvements?'
    },
    {
      icon: Briefcase,
      title: 'Job Search Help',
      description: 'Find relevant job opportunities',
      prompt: 'Help me find jobs that match my skills and interests'
    },
    {
      icon: Lightbulb,
      title: 'Career Advice',
      description: 'Get personalized career guidance',
      prompt: 'What career path would you recommend for me?'
    }
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: generateAIResponse(inputMessage),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('resume') || message.includes('cv')) {
      return `I'd be happy to help you with your resume! Here are some key tips:\n\n• Use action verbs to describe your achievements\n• Quantify your accomplishments with numbers\n• Tailor your resume to each job application\n• Keep it concise (1-2 pages)\n• Use a clean, professional format\n\nWould you like me to review a specific section of your resume?`;
    }
    
    if (message.includes('interview') || message.includes('interview preparation')) {
      return `Great question! Here's how to prepare for interviews:\n\n• Research the company and role thoroughly\n• Practice common interview questions\n• Prepare examples using the STAR method\n• Prepare thoughtful questions to ask\n• Practice your elevator pitch\n• Dress professionally and arrive early\n\nWhat type of interview are you preparing for?`;
    }
    
    if (message.includes('job search') || message.includes('find jobs')) {
      return `Here are effective job search strategies:\n\n• Use multiple job boards and company websites\n• Network on LinkedIn and attend industry events\n• Tailor your applications to each position\n• Follow up on applications appropriately\n• Consider internships or freelance work\n• Build your online presence and portfolio\n\nWhat's your target industry or role?`;
    }
    
    if (message.includes('skills') || message.includes('skill development')) {
      return `Skill development is crucial for career growth! Consider:\n\n• Identify in-demand skills in your field\n• Take online courses or certifications\n• Practice through projects and side work\n• Join professional communities\n• Find mentors in your field\n• Stay updated with industry trends\n\nWhat skills are you looking to develop?`;
    }
    
    if (message.includes('career') || message.includes('career path')) {
      return `Career guidance is one of my specialties! To help you better:\n\n• What's your current field or area of interest?\n• What are your long-term career goals?\n• What skills do you enjoy using most?\n• Are you looking to advance in your current field or switch careers?\n\nWith this information, I can provide more targeted advice!`;
    }
    
    return `That's an interesting question! I'm here to help with your career development. Could you provide a bit more context so I can give you the most relevant advice?\n\nI can assist with:\n• Resume and cover letter optimization\n• Interview preparation\n• Job search strategies\n• Career planning\n• Skill development\n\nWhat specific area would you like to focus on?`;
  };

  const handleQuickAction = (prompt) => {
    setInputMessage(prompt);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center">
          <MessageCircle className="w-6 h-6 mr-3 text-primary-600" />
          AI Career Coach
        </h1>
        <p className="text-dark-400 mt-2">Get personalized career guidance and advice</p>
      </div>

      {/* Chat Container */}
      <div className="card p-0 overflow-hidden">
        <div className="h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-[80%] ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user'
                        ? 'bg-primary-600'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div
                    className={`rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span className="text-dark-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="border-t border-dark-600 p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-primary-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="flex items-center p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors duration-200 text-left"
                    >
                      <Icon className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                      <div>
                        <div className="text-white font-medium text-sm">{action.title}</div>
                        <div className="text-dark-400 text-xs">{action.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-dark-600 p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your career, resume, or job search..."
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

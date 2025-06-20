import React, { useState, useRef, useEffect } from 'react';
import '../styles/global.css';

const API_KEY = import.meta.env.PUBLIC_MISTRAL_API_KEY;

const ChatBot = ({ onCodeInsert }) => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!userInput.trim()) return;

    const newMessages = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    const systemPrompt = "You are a helpful AI assistant. Your user is a programmer. Engage in a friendly, conversational manner. However, if the user asks you to write code, you MUST ONLY provide the code itself, enclosed in a single markdown code block. Do not include any explanations, instructions, or other text outside of the code block in that case.";

    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-tiny",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const botResponse = data?.choices?.[0]?.message?.content || 
      'Sorry, I could not generate a response.';

      setMessages([...newMessages, { role: 'assistant', content: botResponse }]);
    } catch (error) {
      console.error('Mistral API Error:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If no messages, show welcome message
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: 'Hello! How can I help with your coding questions?' }]);
    }
    scrollToBottom();
  }, [messages]);

  const renderMessageContent = (message) => {
    if (message.role !== 'assistant' || !message.content.includes('```')) {
      return (
        <div className={`chat-message chat-message--${message.role}`} style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>
      );
    }

    const parts = [];
    const regex = /```[a-zA-Z]*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(message.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{message.content.slice(lastIndex, match.index)}</span>);
      }
      const code = match[1].replace(/\\n/g, '\n');
      parts.push(
        <div key={`code-${match.index}`} className="code-block-wrapper">
          <pre className="chatbot-code-block">{code}</pre>
          {onCodeInsert && (
            <button className="use-in-editor-btn" onClick={() => onCodeInsert(code)}>
              Use in Editor
            </button>
          )}
        </div>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < message.content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{message.content.slice(lastIndex)}</span>);
    }

    return (
      <div className={`chat-message chat-message--${message.role}`}>
        {parts.map((part, i) => <div key={i}>{part}</div>)}
      </div>
    );
  };

  return (
    <div className="chatbot-container">
      <div className="output-header">
        <h5>AI Chat Bot</h5>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message-wrapper message-wrapper--${message.role}`}
          >
            {renderMessageContent(message)}
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper message-wrapper--assistant">
            <div className="chat-message chat-message--assistant chat-message--loading">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Ask something about programming..."
          disabled={isLoading}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={isLoading || !userInput.trim()} 
          className="chat-send-btn"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBot;
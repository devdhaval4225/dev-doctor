
import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setMessages, addMessage } from '../redux/store';
import { apiService } from '../services/api';
import { Send, Search, Paperclip } from 'lucide-react';

const Messages = () => {
  const { messages } = useSelector((state: RootState) => state.data);
  const dispatch = useDispatch();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate calls in StrictMode
    if (hasLoadedRef.current && messages.length > 0) return;
    
    const loadMessages = async () => {
        // Only fetch if messages are not already loaded
        if (messages.length === 0) {
            try {
                hasLoadedRef.current = true;
                const data = await apiService.messages.getAll();
                dispatch(setMessages(data));
            } catch (e) {
                console.error("Failed to load messages", e);
                hasLoadedRef.current = false; // Reset on error to allow retry
            }
        }
    };
    loadMessages();
  }, [dispatch, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
        const newMessage = await apiService.messages.send({
            patientId: "P-1", // Mock current chat context
            doctorId: "DOC-001",
            text: inputText,
            imageIds: [],
            sender: 'doctor'
        });
        dispatch(addMessage(newMessage));
        setInputText('');
    } catch (e) {
        console.error("Failed to send message", e);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen p-2 sm:p-4 md:p-6 flex gap-2 sm:gap-4 md:gap-6">
      {/* Chat List (Sidebar style) */}
      <div className="w-full sm:w-80 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {['Louis Litt', 'Harvey Specter', 'Donna Paulsen'].map((name, i) => (
            <div key={i} className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 ${i === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
               <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
               <div className="flex-1 min-w-0">
                 <h4 className="font-bold text-gray-800 text-sm truncate">{name}</h4>
                 <p className="text-xs text-gray-500 truncate">Let's schedule for next week.</p>
               </div>
               <span className="text-xs text-gray-400">10:00 AM</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between bg-white">
           <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200" />
              <div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">Louis Litt</h3>
                <p className="text-[10px] sm:text-xs text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span> Online
                </p>
              </div>
           </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.messageId} className={`flex ${msg.sender === 'doctor' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                msg.sender === 'doctor' 
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                  : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
              }`}>
                <p className="text-xs sm:text-sm">{msg.text}</p>
                <p className={`text-[9px] sm:text-[10px] mt-1 text-right ${msg.sender === 'doctor' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center gap-2 sm:gap-4">
          <button type="button" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 text-gray-900 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base"
          />
          <button 
            type="submit"
            className="bg-blue-600 text-white p-2.5 sm:p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex-shrink-0"
            disabled={!inputText.trim()}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Messages;

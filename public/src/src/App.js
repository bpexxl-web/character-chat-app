import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ArrowLeft, Menu, Trash2, Settings, Key, Plus, Lock, Shield, Copy, BarChart3 } from 'lucide-react';

const generatedCodesStore = {};
const ADMIN_API_KEY = 'AIzaSyDwHKZRdKQTwHOn5yT4fYfGbavpXK9UyZg';

const CharacterChatApp = () => {
  const [currentView, setCurrentView] = useState('chatList');
  const [chatRooms, setChatRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    productCode: '',
    systemPrompt: '',
    greeting: '',
    color: 'purple'
  });
  const [generatedCodesList, setGeneratedCodesList] = useState([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [generatedCodeText, setGeneratedCodeText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentRoom?.messages]);

  const saveApiKey = () => {
    if (!tempApiKey.startsWith('AIza')) {
      alert('유효한 Gemini API 키를 입력하세요.');
      return;
    }

    setGeminiApiKey(tempApiKey);
    
    if (tempApiKey === ADMIN_API_KEY) {
      setIsAdmin(true);
      alert('🛡️ 관리자 모드 활성화!');
    } else {
      setIsAdmin(false);
      alert('일반 사용자 로그인 완료');
    }
    
    setShowSettings(false);
  };

  const generateCode = () => {
    if (!newCharacter.name || !newCharacter.productCode || !newCharacter.systemPrompt || !newCharacter.greeting) {
      alert('❌ 모든 필드를 입력해주세요.');
      return;
    }

    const random = Math.random().toString(36).substring(2, 14).toUpperCase();
    const code = `${newCharacter.productCode}-${random}`;

    generatedCodesStore[code] = {
      productCode: newCharacter.productCode,
      characterName: newCharacter.name,
      systemPrompt: newCharacter.systemPrompt,
      greeting: newCharacter.greeting,
      color: newCharacter.color,
      used: false,
      createdAt: new Date().toISOString()
    };

    setGeneratedCodesList([...generatedCodesList, { code, ...generatedCodesStore[code] }]);
    navigator.clipboard.writeText(code);
    
    // 관리자는 자동으로 테스트 채팅방 생성
    const testRoom = {
      roomId: `room_${Date.now()}`,
      activationCode: code,
      characterName: newCharacter.name,
      systemPrompt: newCharacter.systemPrompt,
      color: newCharacter.color,
      createdAt: new Date().toISOString(),
      messages: [
        { 
          role: 'model', 
          content: newCharacter.greeting, 
          timestamp: new Date().toISOString() 
        }
      ]
    };
    
    setChatRooms([...chatRooms, testRoom]);
    
    setGeneratedCodeText(code);
    setShowSuccessToast(true);
    
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);

    setNewCharacter({
      name: '',
      productCode: '',
      systemPrompt: '',
      greeting: '',
      color: 'purple'
    });
  };

  const validateCode = (code) => {
    const codeData = generatedCodesStore[code];
    
    if (!codeData) {
      return { valid: false, error: '유효하지 않은 코드' };
    }
    
    if (codeData.used) {
      return { valid: false, error: '이미 사용된 코드' };
    }
    
    generatedCodesStore[code].used = true;
    
    setGeneratedCodesList(generatedCodesList.map(item => 
      item.code === code ? { ...item, used: true } : item
    ));
    
    return {
      valid: true,
      data: {
        characterName: codeData.characterName,
        systemPrompt: codeData.systemPrompt,
        greeting: codeData.greeting,
        color: codeData.color
      }
    };
  };

  const activateCharacter = () => {
    if (!activationCode.trim()) {
      alert('코드를 입력하세요.');
      return;
    }

    const existing = chatRooms.find(room => room.activationCode === activationCode);
    if (existing) {
      alert('이미 활성화된 코드!');
      return;
    }

    const validation = validateCode(activationCode);
    
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const data = validation.data;
    const newRoom = {
      roomId: `room_${Date.now()}`,
      activationCode: activationCode,
      characterName: data.characterName,
      systemPrompt: data.systemPrompt,
      color: data.color,
      createdAt: new Date().toISOString(),
      messages: [
        { 
          role: 'model', 
          content: data.greeting, 
          timestamp: new Date().toISOString() 
        }
      ]
    };

    setChatRooms([...chatRooms, newRoom]);
    setActivationCode('');
    setShowActivation(false);
    alert(`${data.characterName} 활성화!`);
  };

  const openRoom = (room) => {
    setCurrentRoom(room);
    setCurrentView('chat');
    setShowMenu(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!geminiApiKey) {
      alert('API 키를 설정하세요!');
      setShowSettings(true);
      return;
    }

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // 사용자 메시지 추가
    const newUserMessage = { 
      role: 'user', 
      content: userMsg, 
      timestamp: new Date().toISOString() 
    };

    // chatRooms 먼저 업데이트
    const updatedRooms = chatRooms.map(room => {
      if (room.roomId === currentRoom.roomId) {
        return {
          ...room,
          messages: [...room.messages, newUserMessage]
        };
      }
      return room;
    });
    setChatRooms(updatedRooms);

    // currentRoom 업데이트
    const roomWithUserMsg = {
      ...currentRoom,
      messages: [...currentRoom.messages, newUserMessage]
    };
    setCurrentRoom(roomWithUserMsg);

    try {
      const contents = roomWithUserMsg.messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: currentRoom.systemPrompt }] },
            contents: contents
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API 호출 실패');
      }

      const data = await response.json();
      const aiMsg = data.candidates[0].content.parts[0].text;

      // AI 메시지 추가
      const newAiMessage = { 
        role: 'model', 
        content: aiMsg, 
        timestamp: new Date().toISOString() 
      };

      const finalRooms = chatRooms.map(room => {
        if (room.roomId === currentRoom.roomId) {
          return {
            ...room,
            messages: [...room.messages, newUserMessage, newAiMessage]
          };
        }
        return room;
      });
      setChatRooms(finalRooms);

      const finalRoom = {
        ...currentRoom,
        messages: [...currentRoom.messages, newUserMessage, newAiMessage]
      };
      setCurrentRoom(finalRoom);

    } catch (error) {
      console.error('전송 실패:', error);
      console.error('에러 상세:', error.message);
      
      let errorMsg = '메시지 전송 실패\n\n';
      
      if (error.message.includes('401')) {
        errorMsg += '❌ API 키가 유효하지 않습니다.\n\n해결 방법:\n1. https://aistudio.google.com/app/apikey\n2. 새 API 키 생성\n3. 설정에서 키 재입력';
      } else if (error.message.includes('403')) {
        errorMsg += '❌ API 키 권한이 없습니다.\n\n해결 방법:\n1. API 키 권한 확인\n2. Gemini API 활성화 확인';
      } else if (error.message.includes('429')) {
        errorMsg += '❌ API 할당량 초과\n\n잠시 후 다시 시도해주세요.';
      } else {
        errorMsg += '에러: ' + error.message + '\n\n콘솔(F12)에서 상세 내용을 확인하세요.';
      }
      
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteRoom = (roomId, e) => {
    e.stopPropagation();
    if (confirm('삭제하시겠습니까?')) {
      setChatRooms(chatRooms.filter(room => room.roomId !== roomId));
      if (currentRoom?.roomId === roomId) {
        setCurrentRoom(null);
        setCurrentView('chatList');
      }
    }
  };

  const getColors = (color) => {
    const colors = {
      purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', light: 'bg-purple-50', text: 'text-purple-600' },
      blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-50', text: 'text-blue-600' },
      pink: { bg: 'bg-pink-600', hover: 'hover:bg-pink-700', light: 'bg-pink-50', text: 'text-pink-600' },
      green: { bg: 'bg-green-600', hover: 'hover:bg-green-700', light: 'bg-green-50', text: 'text-green-600' },
      orange: { bg: 'bg-orange-600', hover: 'hover:bg-orange-700', light: 'bg-orange-50', text: 'text-orange-600' }
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="w-full h-screen">
      {currentView === 'chatList' && (
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="p-6 bg-white shadow-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <MessageCircle className="w-8 h-8 text-purple-600" />
                  내 캐릭터 챗
                  {isAdmin && <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">관리자</span>}
                </h1>
                <p className="text-gray-600 mt-2">{chatRooms.length}개 활성</p>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="p-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    <Shield className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={() => { setTempApiKey(geminiApiKey); setShowSettings(true); }}
                  className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </div>
            {!geminiApiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">⚠️ API 키 설정 필요</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {chatRooms.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">활성화된 캐릭터 없음</p>
                <button
                  onClick={() => setShowActivation(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  캐릭터 활성화
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {chatRooms.map(room => {
                  const last = room.messages[room.messages.length - 1];
                  const colors = getColors(room.color);
                  
                  return (
                    <div
                      key={room.roomId}
                      onClick={() => openRoom(room)}
                      className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl cursor-pointer border-l-4"
                      style={{ borderLeftColor: room.color === 'purple' ? '#9333ea' : room.color === 'blue' ? '#2563eb' : room.color === 'pink' ? '#ec4899' : room.color === 'green' ? '#16a34a' : '#ea580c' }}
                    >
                      <div className="flex justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-xl">{room.characterName}</h3>
                          <span className="text-xs text-gray-400">{new Date(room.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button onClick={(e) => deleteRoom(room.roomId, e)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className={`${colors.light} rounded-lg p-3 mb-3`}>
                        <p className="text-sm line-clamp-2">
                          {last.role === 'user' ? '나: ' : `${room.characterName}: `}
                          {last.content}
                        </p>
                      </div>
                      
                      <span className={`${colors.text} text-xs font-semibold`}>{room.messages.length}개</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t">
            <button onClick={() => setShowActivation(true)} className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              새 캐릭터
            </button>
          </div>
        </div>
      )}

      {currentView === 'chat' && currentRoom && (
        <div className="h-full flex flex-col bg-white">
          <div className={`p-4 ${getColors(currentRoom.color).bg} text-white shadow-lg flex items-center gap-4`}>
            <button onClick={() => setCurrentView('chatList')} className="p-2 hover:bg-white/20 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentRoom.characterName}</h2>
              <p className="text-sm opacity-80">온라인</p>
            </div>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-white/20 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {showMenu && (
            <div className="absolute right-4 top-20 bg-white rounded-lg shadow-xl border z-10">
              <button
                onClick={() => { deleteRoom(currentRoom.roomId, { stopPropagation: () => {} }); setShowMenu(false); }}
                className="w-full px-4 py-3 hover:bg-red-50 text-red-600 rounded-lg"
              >
                삭제
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="max-w-4xl mx-auto space-y-4">
              {currentRoom.messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                    msg.role === 'user' ? `${getColors(currentRoom.color).bg} text-white` : 'bg-white border'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className={`text-xs mt-2 block ${msg.role === 'user' ? 'opacity-70' : 'text-gray-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-5 py-4 border">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-4 bg-white border-t">
            <div className="max-w-4xl mx-auto flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={geminiApiKey ? "메시지..." : "API 키 필요"}
                disabled={isLoading || !geminiApiKey}
                className="flex-1 px-5 py-3 border-2 rounded-full focus:outline-none focus:border-purple-400 disabled:bg-gray-100"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || !geminiApiKey}
                className={`px-6 py-3 ${getColors(currentRoom.color).bg} text-white rounded-full disabled:bg-gray-300`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                설정
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Gemini API 키
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600">
                    무료 발급
                  </a>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">💡 안내</h3>
                <ul className="text-sm space-y-1">
                  <li>• Google AI Studio에서 무료 발급 가능</li>
                  <li>• API 키는 브라우저에만 저장됩니다</li>
                  <li>• 각 채팅방은 독립적으로 작동합니다</li>
                </ul>
              </div>

              <button
                onClick={saveApiKey}
                disabled={!tempApiKey}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
              >
                로그인
              </button>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 text-center">
                  관리자 키: <code className="bg-gray-100 px-2 py-1 rounded">AIzaSyAdminKey...</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActivation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Lock className="w-6 h-6" />
                활성화
              </h2>
              <button onClick={() => setShowActivation(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <input
              type="text"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              placeholder="코드 입력"
              className="w-full px-4 py-3 border rounded-lg font-mono mb-4"
            />
            <button
              onClick={activateCharacter}
              disabled={!activationCode.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
            >
              활성화
            </button>
          </div>
        </div>
      )}

      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-full max-h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-amber-600" />
                관리자 패널
              </h2>
              <button 
                onClick={() => setShowAdminPanel(false)} 
                className="text-gray-400 hover:text-gray-600 text-3xl font-light leading-none"
                title="닫기"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <BarChart3 className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-3xl font-bold text-blue-600">{generatedCodesList.length}</p>
                    <p className="text-sm">총 생성</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <BarChart3 className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-3xl font-bold text-green-600">{generatedCodesList.filter(c => c.used).length}</p>
                    <p className="text-sm">활성화</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <BarChart3 className="w-5 h-5 text-gray-600 mb-2" />
                    <p className="text-3xl font-bold text-gray-600">{generatedCodesList.length - generatedCodesList.filter(c => c.used).length}</p>
                    <p className="text-sm">미사용</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">새 캐릭터 생성</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">캐릭터 이름</label>
                      <input
                        type="text"
                        value={newCharacter.name}
                        onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                        placeholder="예: 뱀파이어 백작"
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">상품 코드</label>
                      <input
                        type="text"
                        value={newCharacter.productCode}
                        onChange={(e) => setNewCharacter({...newCharacter, productCode: e.target.value.toUpperCase()})}
                        placeholder="예: VAMP-2024"
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">색상</label>
                    <div className="flex gap-2">
                      {['purple', 'blue', 'pink', 'green', 'orange'].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewCharacter({...newCharacter, color})}
                          className={`w-12 h-12 rounded-lg ${getColors(color).bg} ${newCharacter.color === color ? 'ring-4 ring-gray-400' : ''}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">프롬프트</label>
                    <textarea
                      value={newCharacter.systemPrompt}
                      onChange={(e) => setNewCharacter({...newCharacter, systemPrompt: e.target.value})}
                      placeholder="프롬프트 입력..."
                      rows={8}
                      className="w-full px-4 py-3 border rounded-lg resize-none font-mono text-sm"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">첫 인사</label>
                    <input
                      type="text"
                      value={newCharacter.greeting}
                      onChange={(e) => setNewCharacter({...newCharacter, greeting: e.target.value})}
                      placeholder="첫 메시지..."
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>

                  <button
                    onClick={generateCode}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold"
                  >
                    코드 생성
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4">생성된 코드</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {generatedCodesList.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">코드 없음</p>
                    ) : (
                      generatedCodesList.map((item, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border-l-4 ${item.used ? 'bg-gray-50 border-gray-400' : 'bg-green-50 border-green-500'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold">{item.characterName}</p>
                              <p className="text-sm font-mono">{item.code}</p>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs ${item.used ? 'bg-gray-200' : 'bg-green-200'}`}>
                                {item.used ? '사용됨' : '미사용'}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.code);
                                  alert('복사!');
                                }}
                                className="p-2 hover:bg-gray-200 rounded-lg"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 코드 생성 완료 토스트 */}
      {showSuccessToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full">
              ✓
            </div>
            <div>
              <p className="font-bold text-lg">코드 생성 완료!</p>
              <p className="text-sm opacity-90 font-mono">{generatedCodeText}</p>
              <p className="text-xs opacity-75 mt-1">📋 클립보드에 복사되었습니다</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterChatApp;

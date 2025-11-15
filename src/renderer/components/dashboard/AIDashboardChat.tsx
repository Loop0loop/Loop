'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Plus, MessageCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logger } from '../../../shared/logger';

const AI_PROMPT_STYLES = {
  container: 'flex flex-col h-full overflow-hidden',
  
  // 메시지 영역
  messageContainer: 'flex-1 overflow-y-auto flex flex-col gap-3 pb-4',
  messageGroup: 'flex gap-2 items-end',
  messageUserGroup: 'flex gap-2 justify-end items-end',
  messageBubble: 'max-w-[70%] px-3 py-2 rounded-lg text-xs leading-relaxed',
  messageUser: 'bg-[hsl(var(--accent-primary))] text-[hsl(var(--primary-foreground))]',
  messageAssistant: 'bg-foreground/10 text-foreground',
  messageEmpty: 'flex-1 flex items-center justify-center',
  
  // 입력 영역
  inputSection: 'flex-shrink-0 space-y-3 border-t border-foreground/10 pt-4',
  inputGroup: 'flex flex-col gap-2',
  mainInput: 'w-full px-4 py-3 rounded-lg bg-foreground/5 border border-foreground/20 text-sm focus:outline-none focus:border-[hsl(var(--accent-primary))]/40 focus:bg-foreground/10 transition-all resize-none',
  actionBar: 'flex gap-2 items-center',
  actionButton: 'px-2 py-1 rounded-md text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors flex items-center gap-1',
  sendButton: 'px-3 py-1 rounded-md bg-[hsl(var(--accent-primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center justify-center ml-auto',
  
  // 제안 질문
  suggestionsContainer: 'flex flex-col gap-2',
  suggestionButton: 'text-left text-xs text-[hsl(var(--accent-primary))] hover:opacity-70 transition-opacity truncate',
  
  // 상태
  loadingDot: 'w-1.5 h-1.5 bg-current rounded-full animate-pulse',
  errorMessage: 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-md text-xs',
} as const;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 🎯 대시보드 AI 프롬포트 컴포넌트
 * 
 * Image2 스타일 UI:
 * - "Ask anything" 메인 입력창
 * - + Add 컨텍스트 버튼
 * - 메시지 히스토리 (위에 표시)
 * - 제안 질문
 * - 세션 기반 (메모리만, DB X)
 */
export function AIDashboardChat(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Gemini 상태 확인
  useEffect(() => {
    const checkGeminiStatus = async () => {
      try {
        if (!window.electronAPI) {
          Logger.warn('AI_PROMPT', 'Electron API not available');
          return;
        }

        const response = await window.electronAPI['gemini:get-status']();
        if (response.success && response.data) {
          setGeminiAvailable(response.data.available ?? false);
          if (!response.data.available) {
            setError(response.data.message ?? 'Gemini API를 설정해주세요');
          }
        }
      } catch (err) {
        Logger.warn('AI_PROMPT', 'Failed to check Gemini status', err);
      }
    };

    checkGeminiStatus();
  }, []);

  // 자동 스크롤
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 텍스트에어리어 높이 자동 조절
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Enter로 전송, Shift+Enter로 줄바꿈
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  }, [input, isLoading]);

  // 메시지 전송
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !geminiAvailable || isLoading) {
      return;
    }

    setError(null);
    const userMessage = input;
    const messageId = `msg_${Date.now()}`;

    // 사용자 메시지 추가
    setMessages(prev => [...prev, {
      id: messageId,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      // AI 응답 요청
      const response = await window.electronAPI['gemini:send-message']({
        projectId: '',
        message: userMessage,
        systemPrompt: '당신은 작가님의 창작을 돕는 AI 어시스턴트입니다. 친절하고 구체적인 조언을 제공해주세요.',
        history: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        })),
      });

      if (response.success && response.data) {
        setMessages(prev => [...prev, {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: response.data?.response || '응답을 생성하는 중입니다...',
          timestamp: new Date(),
        }]);
      } else {
        setError(response.error ?? 'AI 응답을 가져오지 못했습니다');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'AI 응답 중 오류가 발생했습니다';
      setError(errorMsg);
      Logger.error('AI_PROMPT', 'Failed to send message', err);
    } finally {
      setIsLoading(false);
    }
  }, [input, geminiAvailable, isLoading, messages]);

  // 제안 질문
  const suggestedQuestions = useMemo(() => [
    '웹소설 작성 팁을 알려줘',
    '캐릭터 개발의 기본은?',
    '흥미로운 플롯을 만드는 방법',
  ], []);

  // Gemini 사용 불가
  if (!geminiAvailable) {
    return (
      <div className={AI_PROMPT_STYLES.container}>
        <div className={AI_PROMPT_STYLES.messageEmpty}>
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <p className="text-xs text-muted-foreground max-w-[90%]">
              {error || 'Gemini API 설정이 필요합니다'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={AI_PROMPT_STYLES.container}>
      {/* 메시지 영역 */}
      {messages.length === 0 ? (
        <div className={AI_PROMPT_STYLES.messageEmpty}>
          <div className="flex flex-col items-center gap-3">
            <MessageCircle className="w-6 h-6 text-[hsl(var(--accent-primary))]" />
            <p className="text-xs font-medium">AI 어시스턴트</p>
            <p className="text-xs text-center text-muted-foreground max-w-[85%] leading-relaxed">
              작가님의 창작을 돕는 AI 어시스턴트입니다. 궁금한 점을 물어보세요.
            </p>

            {/* 제안 질문 */}
            <div className={AI_PROMPT_STYLES.suggestionsContainer}>
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(question);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                  className={AI_PROMPT_STYLES.suggestionButton}
                >
                  → {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={AI_PROMPT_STYLES.messageContainer}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === 'user' ? AI_PROMPT_STYLES.messageUserGroup : AI_PROMPT_STYLES.messageGroup}
            >
              <div
                className={`${AI_PROMPT_STYLES.messageBubble} ${
                  msg.role === 'user' ? AI_PROMPT_STYLES.messageUser : AI_PROMPT_STYLES.messageAssistant
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={AI_PROMPT_STYLES.messageGroup}>
              <div className="flex gap-1 px-3 py-2">
                <div className={AI_PROMPT_STYLES.loadingDot} />
                <div className={AI_PROMPT_STYLES.loadingDot} style={{ animationDelay: '0.1s' }} />
                <div className={AI_PROMPT_STYLES.loadingDot} style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className={AI_PROMPT_STYLES.errorMessage}>
          {error}
        </div>
      )}

      {/* 입력 영역 */}
      <div className={AI_PROMPT_STYLES.inputSection}>
        {/* 메인 입력창 */}
        <div className={AI_PROMPT_STYLES.inputGroup}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Shift+Enter: 줄바꿈)"
            className={AI_PROMPT_STYLES.mainInput}
            rows={1}
            disabled={isLoading || !geminiAvailable}
          />

          {/* 액션 바 */}
          <div className={AI_PROMPT_STYLES.actionBar}>
            <button
              onClick={() => Logger.info('AI_PROMPT', 'Add context clicked')}
              className={AI_PROMPT_STYLES.actionButton}
              title="컨텍스트 추가"
              disabled={isLoading}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || !geminiAvailable}
              className={AI_PROMPT_STYLES.sendButton}
              title="전송 (Enter)"
              aria-label="메시지 전송"
            >
              {isLoading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

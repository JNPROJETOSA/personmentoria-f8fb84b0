import { useState, useEffect } from 'react';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatSession {
    id: string;
    title: string;
    date: string;
    messages: Message[];
}

const STORAGE_KEY = 'tutor-regis-history';

export function useChatHistory() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSessions(parsed);
                if (parsed.length > 0) {
                    // Select the most recent one (first in list usually)
                    setCurrentSessionId(parsed[0].id);
                } else {
                    createNewChat();
                }
            } catch (e) {
                console.error('Failed to parse chat history', e);
                createNewChat();
            }
        } else {
            createNewChat();
        }
    }, []);

    // Save to local storage whenever sessions change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        }
    }, [sessions]);

    const createNewChat = () => {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: 'Nova Conversa',
            date: new Date().toISOString(),
            messages: [
                {
                    role: 'assistant',
                    content: 'Olá! Sou o **TUTOR REGIS** 🎓, seu assistente de estudos para residência médica. \n\nPosso te ajudar com:\n- 📊 Análise do seu desempenho\n- 💡 Sugestões de estudo personalizadas\n- 📚 Dúvidas sobre temas médicos\n- 🎯 Estratégias de revisão\n\nComo posso te ajudar hoje?'
                }
            ]
        };

        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        return newSession.id;
    };

    const deleteChat = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id);
            // If we deleted the active session, switch to another one or create new
            if (id === currentSessionId) {
                if (filtered.length > 0) {
                    setCurrentSessionId(filtered[0].id);
                } else {
                    // If no chats left, we'll create one in a moment, but let's clear state first
                    setCurrentSessionId(null);
                    // Effect will handle empty state or we can force create here
                    // But safer to let the component handle "no session" or auto-create
                    setTimeout(() => createNewChat(), 0);
                }
            }
            return filtered;
        });
    };

    const updateCurrentChat = (messages: Message[]) => {
        if (!currentSessionId) return;

        setSessions(prev => prev.map(session => {
            if (session.id === currentSessionId) {
                // Update title if it's the first user message
                let title = session.title;
                if (session.messages.length <= 1 && messages.length > 1) {
                    const firstUserMsg = messages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                    }
                }

                return {
                    ...session,
                    messages,
                    title,
                    date: new Date().toISOString() // Update timestamp to bring to top? Or keep original? Let's update for "Last updated" sort if we wanted.
                };
            }
            return session;
        }));
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);

    return {
        sessions,
        currentSession,
        currentSessionId,
        setCurrentSessionId,
        createNewChat,
        deleteChat,
        updateCurrentChat
    };
}

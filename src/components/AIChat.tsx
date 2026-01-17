import { useState, useRef, useEffect } from 'react';
import { Send, BrainCircuit, Loader2, Plus, MessageSquare, Trash2, History, Menu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExerciseLog, ClassItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import { useChatHistory, Message } from '@/hooks/useChatHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AIChatProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
}

export default function AIChat({ exercises, classes }: AIChatProps) {
  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createNewChat,
    deleteChat,
    updateCurrentChat
  } = useChatHistory();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // Mobile toggle
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSession) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...currentSession.messages, userMessage];

    // Optimistic update
    updateCurrentChat(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare user data context
      const userData = {
        exercises,
        classes,
        profile,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages,
            userData,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit excedido. Aguarde alguns instantes e tente novamente.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes. Adicione créditos ao workspace.');
        }
        throw new Error('Erro ao comunicar com TUTOR REGIS');
      }

      if (!response.body) {
        throw new Error('Resposta inválida do servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Create assistant message placeholder
      const withAssistantPlaceholder = [...updatedMessages, { role: 'assistant', content: '' } as Message];
      updateCurrentChat(withAssistantPlaceholder);

      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              // Real-time update to specific session
              updateCurrentChat([
                ...updatedMessages,
                { role: 'assistant', content: assistantContent }
              ]);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erro ao conversar com TUTOR REGIS',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });

      // Remove empty assistant message if error occurred
      updateCurrentChat(updatedMessages);

    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 animate-in fade-in duration-500">
      {/* History Sidebar - Desktop: Always visible, Mobile: Toggleable */}
      <Card className={`flex-col w-80 shrink-0 ${isHistoryOpen ? 'flex absolute z-20 h-full left-0 top-0 shadow-2xl' : 'hidden md:flex'}`}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico
            </CardTitle>
            <Button size="sm" variant="outline" onClick={createNewChat}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Chat
            </Button>
            {isHistoryOpen && (
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setIsHistoryOpen(false)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col p-2 gap-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setIsHistoryOpen(false); // Close on mobile selection
                  }}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors group ${currentSessionId === session.id
                      ? 'bg-primary/10 hover:bg-primary/15'
                      : 'hover:bg-muted'
                    }`}
                >
                  <div className="flex flex-col flex-1 min-w-0 mr-2">
                    <span className={`text-sm font-medium truncate ${currentSessionId === session.id ? 'text-primary' : ''}`}>
                      {session.title || 'Nova Conversa'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.date), "d 'de' MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => deleteChat(session.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma conversa salva
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col min-w-0">
        <CardHeader className="border-b py-3 md:py-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-2"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <BrainCircuit className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">TUTOR REGIS</CardTitle>
              <CardDescription className="truncate hidden sm:block">
                Assistente inteligente com IA especializado em residência médica
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 md:hidden" onClick={createNewChat}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-0 overflow-hidden relative">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {currentSession?.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-4 ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                      }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-4 h-4" />
                        <span className="text-xs font-semibold">TUTOR REGIS</span>
                      </div>
                    )}
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Analisando seus dados...</span>
                    </div>
                  </div>
                </div>
              )}

              {currentSession?.messages.length === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8 px-2 md:px-8">
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 whitespace-normal"
                    onClick={() => setInput('Analise meu desempenho geral e sugira áreas para focar')}
                    disabled={isLoading}
                  >
                    📊 Análise do meu desempenho
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 whitespace-normal"
                    onClick={() => setInput('Quais tópicos devo revisar com base nas minhas notas?')}
                    disabled={isLoading}
                  >
                    🎯 Sugestões de revisão
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 whitespace-normal"
                    onClick={() => setInput('Me explique técnicas de memorização para residência médica')}
                    disabled={isLoading}
                  >
                    🧠 Técnicas de estudo
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-left h-auto py-3 whitespace-normal"
                    onClick={() => setInput('Como organizar meu cronograma de estudos?')}
                    disabled={isLoading}
                  >
                    📅 Organização de estudos
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background mt-auto">
            <div className="flex gap-2 max-w-4xl mx-auto w-full">
              <Textarea
                placeholder="Digite sua pergunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="min-h-[50px] max-h-[120px] resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0 h-[50px] w-[50px]"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

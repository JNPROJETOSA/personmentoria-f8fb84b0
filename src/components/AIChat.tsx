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
import { GoogleGenerativeAI } from "@google/generative-ai";

interface AIChatProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

    // 1. Prepare user message
    const userMessage: Message = { role: 'user', content: input };
    const messagesToProcess = [...currentSession.messages, userMessage];

    // Optimistic update
    updateCurrentChat(messagesToProcess);
    setInput('');
    setIsLoading(true);

    try {
      // 3. Configure Model with System Instruction
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da API não encontrada (VITE_GOOGLE_API_KEY). Tente reiniciar o servidor (npm run dev).");
      }

      // 2. Prepare Context Stats
      const contextStats = {
        name: profile?.name || 'Estudante',
        level: profile?.level || 1,
        xp: profile?.xp || 0,
        completedClasses: classes.filter(c => c.studied).length,
        totalClasses: classes.length,
        exercisesDone: exercises.length,
        correctness: exercises.length > 0
          ? Math.round((exercises.reduce((acc, curr) => acc + curr.correctAnswers, 0) / exercises.reduce((acc, curr) => acc + curr.totalQuestions, 0)) * 100)
          : 0
      };

      // 3. Configure Model with System Instruction
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Updated as per user request
        systemInstruction: `Você é o Tutor Regis, um mentor de residência médica experiente, motivador e focado.
        
        DADOS DO ALUNO:
        - Nome: ${contextStats.name}
        - Nível: ${contextStats.level} (XP: ${contextStats.xp})
        - Progresso Aulas: ${contextStats.completedClasses}/${contextStats.totalClasses}
        - Questões Feitas: ${contextStats.exercisesDone}
        - Desempenho Médio: ${contextStats.correctness}%

        SUAS DIRETRIZES:
        1. Responda de forma concisa, direta e útil.
        2. Use emojis para manter o tom leve 🎓🩺.
        3. Se o aluno perguntar sobre cronograma, baseie-se no progresso dele.
        4. Se perguntar dúvida técnica de medicina, explique com clareza e autoridade.
        5. Sempre motive o aluno a continuar estudando.
        `
      });

      // 4. Convert History to Gemini Format
      // Gemini requires history to start with 'user'. We skip the initial greeting if present.
      let validHistoryMsgs = currentSession.messages;
      if (validHistoryMsgs.length > 0 && validHistoryMsgs[0].role === 'assistant') {
        validHistoryMsgs = validHistoryMsgs.slice(1);
      }

      const historyForGemini = validHistoryMsgs
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      const chat = model.startChat({
        history: historyForGemini,
      });

      // 5. Stream Response
      const result = await chat.sendMessageStream(input);

      let assistantContent = "";
      const messagesWithAssistant = [...messagesToProcess, { role: 'assistant', content: '' } as Message];
      updateCurrentChat(messagesWithAssistant);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        assistantContent += chunkText;

        updateCurrentChat([
          ...messagesToProcess,
          { role: 'assistant', content: assistantContent }
        ]);
      }

    } catch (error) {
      console.error('Gemini Error:', error);

      let errorMessage = "Erro desconhecido.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro no Tutor Regis',
        description: errorMessage,
        variant: 'destructive',
      });
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

  const quickPrompts = [
    { label: "📊 Análise Geral", text: "Analise meu desempenho geral e sugira áreas para focar" },
    { label: "🎯 Revisão", text: "Quais tópicos devo revisar com base nas minhas notas?" },
    { label: "🧠 Memorização", text: "Me explique técnicas de memorização para residência" },
    { label: "📅 Cronograma", text: "Como organizar meu cronograma de estudos?" }
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 animate-in fade-in duration-500">
      {/* History Sidebar */}
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
                    setIsHistoryOpen(false);
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
                Assistente de Residência Médica
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
                      <span className="text-sm">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}

              {!currentSession?.messages.length || currentSession?.messages.length <= 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8 px-2 md:px-8">
                  {quickPrompts.map((prompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start text-left h-auto py-3 whitespace-normal"
                      onClick={() => setInput(prompt.text)}
                      disabled={isLoading}
                    >
                      {prompt.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background mt-auto">
            <div className="flex gap-2 max-w-4xl mx-auto w-full">
              <Textarea
                placeholder="Digite sua pergunta pro Regis..."
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

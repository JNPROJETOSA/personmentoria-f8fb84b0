import { useState, useRef, useEffect } from 'react';
import { Send, BrainCircuit, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExerciseLog, ClassItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  exercises: ExerciseLog[];
  classes: ClassItem[];
}

export default function AIChat({ exercises, classes }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o **Tutor PERRY** 🎓, seu assistente de estudos para residência médica. \n\nPosso te ajudar com:\n- 📊 Análise do seu desempenho\n- 💡 Sugestões de estudo personalizadas\n- 📚 Dúvidas sobre temas médicos\n- 🎯 Estratégias de revisão\n\nComo posso te ajudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
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
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            })),
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
        throw new Error('Erro ao comunicar com Tutor PERRY');
      }

      if (!response.body) {
        throw new Error('Resposta inválida do servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Create assistant message placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return updated;
              });
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
        title: 'Erro ao conversar com Tutor PERRY',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      
      // Remove empty assistant message if error occurred
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.content === '') {
          updated.pop();
        }
        return updated;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="h-[calc(100vh-10rem)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            Tutor PERRY
          </CardTitle>
          <CardDescription>
            Assistente inteligente com IA especializado em residência médica
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col h-[calc(100%-8rem)]">
          <ScrollArea ref={scrollRef} className="flex-1 pr-4 mb-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-4 h-4" />
                        <span className="text-xs font-semibold">Tutor PERRY</span>
                      </div>
                    )}
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua pergunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="min-h-[60px] max-h-[120px]"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="shrink-0 h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sugestões de perguntas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Analise meu desempenho geral e sugira áreas para focar')}
              disabled={isLoading}
            >
              📊 Análise do meu desempenho
            </Button>
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Quais tópicos devo revisar com base nas minhas notas?')}
              disabled={isLoading}
            >
              🎯 Sugestões de revisão
            </Button>
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Me explique técnicas de memorização para residência médica')}
              disabled={isLoading}
            >
              🧠 Técnicas de estudo
            </Button>
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Como organizar meu cronograma de estudos?')}
              disabled={isLoading}
            >
              📅 Organização de estudos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

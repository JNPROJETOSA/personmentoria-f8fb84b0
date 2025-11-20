import { useState, useRef, useEffect } from 'react';
import { Send, BrainCircuit, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExerciseLog, ClassItem } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

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
      content: 'Olá! Sou o Tutor PERRY, seu assistente de estudos para residência médica. Posso ajudá-lo com:\n\n• Explicações de conceitos médicos\n• Dicas de estudo e memorização\n• Análise do seu desempenho\n• Esclarecimento de dúvidas\n\nComo posso ajudá-lo hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateContext = () => {
    const totalQuestions = exercises.reduce((sum, ex) => sum + ex.totalQuestions, 0);
    const totalCorrect = exercises.reduce((sum, ex) => sum + ex.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    return `Contexto do estudante:
- Total de questões: ${totalQuestions}
- Acurácia geral: ${accuracy.toFixed(1)}%
- Aulas assistidas: ${classes.filter(c => c.studied).length}/${classes.length}
- Áreas praticadas: ${new Set(exercises.map(ex => ex.area)).size}`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('API key não configurada');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Você é o Tutor PERRY, um assistente especializado em residência médica brasileira. Seja claro, objetivo e educativo.

${generateContext()}

Pergunta do estudante: ${input}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao comunicar com a API');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.candidates[0].content.parts[0].text
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        title: "Erro ao processar",
        description: "Não foi possível obter uma resposta. Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      }]);
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
      <Card className="h-[calc(100vh-16rem)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            Tutor PERRY
          </CardTitle>
          <CardDescription>
            Assistente inteligente especializado em residência médica
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
              onClick={() => setInput('Quais são as principais causas de dispneia em pediatria?')}
            >
              Causas de dispneia em pediatria
            </Button>
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Como memorizar os diagnósticos diferenciais de dor abdominal?')}
            >
              Dor abdominal - diagnósticos diferenciais
            </Button>
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Me explique a fisiopatologia da pré-eclâmpsia')}
            >
              Fisiopatologia da pré-eclâmpsia
            </Button>
            <Button
              variant="outline"
              className="justify-start text-left h-auto py-3"
              onClick={() => setInput('Como posso melhorar minha acurácia nas questões?')}
            >
              Dicas para melhorar acurácia
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

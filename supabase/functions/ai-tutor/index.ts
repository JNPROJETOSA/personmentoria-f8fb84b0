import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context from user data
    const contextPrompt = buildContextPrompt(userData);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é o Tutor PERRY, um assistente de estudos especializado em preparação para residência médica no Brasil. 

CONTEXTO DO ESTUDANTE:
${contextPrompt}

SUAS RESPONSABILIDADES:
1. Analisar o desempenho do estudante com base nos dados fornecidos
2. Identificar pontos fracos e fortes em cada área médica
3. Sugerir estratégias de estudo personalizadas
4. Responder dúvidas técnicas sobre medicina
5. Motivar e apoiar o estudante na jornada

DIRETRIZES:
- Seja empático e motivador
- Use dados concretos para embasar suas sugestões
- Priorize áreas com baixo desempenho
- Sugira técnicas de estudo eficientes (revisão espaçada, flashcards, etc.)
- Mantenha um tom profissional mas amigável
- Use emojis ocasionalmente para deixar a conversa mais leve
- Seja direto e objetivo, evite respostas muito longas

FORMATO DE RESPOSTA:
- Use markdown para formatação
- Destaque métricas importantes em **negrito**
- Use listas para organizar informações
- Inclua sugestões práticas e acionáveis`
          },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Erro ao comunicar com o Tutor PERRY');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Tutor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildContextPrompt(userData: any): string {
  if (!userData) return 'Nenhum dado disponível ainda.';

  const { exercises, classes, profile } = userData;
  
  let context = '';

  // Profile info
  if (profile) {
    context += `PERFIL:
- Nome: ${profile.name}
- Nível: ${profile.level}
- XP Total: ${profile.xp}
- Streak: ${profile.streak} dias consecutivos\n\n`;
  }

  // Exercises analysis
  if (exercises && exercises.length > 0) {
    const totalQuestions = exercises.reduce((sum: number, e: any) => sum + e.totalQuestions, 0);
    const totalCorrect = exercises.reduce((sum: number, e: any) => sum + e.correctAnswers, 0);
    const overallAccuracy = ((totalCorrect / totalQuestions) * 100).toFixed(1);

    // Performance by area
    const areaStats = exercises.reduce((acc: any, e: any) => {
      if (!acc[e.area]) {
        acc[e.area] = { correct: 0, total: 0 };
      }
      acc[e.area].correct += e.correctAnswers;
      acc[e.area].total += e.totalQuestions;
      return acc;
    }, {});

    context += `DESEMPENHO EM EXERCÍCIOS:
- Total de questões: ${totalQuestions}
- Acertos: ${totalCorrect}
- Acurácia geral: ${overallAccuracy}%
- Exercícios realizados: ${exercises.length}\n\n`;

    context += `DESEMPENHO POR ÁREA:\n`;
    Object.entries(areaStats).forEach(([area, stats]: [string, any]) => {
      const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
      context += `- ${area}: ${accuracy}% (${stats.correct}/${stats.total})\n`;
    });
    context += '\n';

    // Recent exercises
    const recentExercises = exercises.slice(0, 5);
    context += `ÚLTIMOS EXERCÍCIOS:\n`;
    recentExercises.forEach((e: any) => {
      const acc = ((e.correctAnswers / e.totalQuestions) * 100).toFixed(0);
      context += `- ${e.topic} (${e.area}): ${acc}% - ${e.date}\n`;
    });
    context += '\n';
  }

  // Classes info
  if (classes && classes.length > 0) {
    const studiedClasses = classes.filter((c: any) => c.studied).length;
    const pendingClasses = classes.length - studiedClasses;
    
    context += `AULAS:
- Total: ${classes.length}
- Estudadas: ${studiedClasses}
- Pendentes: ${pendingClasses}\n\n`;

    if (pendingClasses > 0) {
      const pending = classes.filter((c: any) => !c.studied).slice(0, 3);
      context += `PRÓXIMAS AULAS PENDENTES:\n`;
      pending.forEach((c: any) => {
        context += `- ${c.title} (${c.area}) - Prioridade ${c.priority}\n`;
      });
    }
  }

  return context;
}

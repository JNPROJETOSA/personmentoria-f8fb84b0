/**
 * SessionSummary — Tela de resumo exibida ao final de uma sessão de estudo
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCw, ArrowLeft, Clock, Zap, Brain, Smile, Frown } from 'lucide-react';
import type { SessionSummaryData } from '@/hooks/useStudySession';

interface SessionSummaryProps {
  summary: SessionSummaryData;
  onClose: () => void;
}

export default function SessionSummary({ summary, onClose }: SessionSummaryProps) {
  const accuracy = summary.totalReviewed > 0 
    ? Math.round(((summary.goodCount + summary.easyCount) / summary.totalReviewed) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Sessão Concluída!</h2>
          <p className="text-muted-foreground">
            Você revisou {summary.totalReviewed} card{summary.totalReviewed !== 1 ? 's' : ''} em {summary.durationMinutes} minuto{summary.durationMinutes !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          icon={<Brain className="w-4 h-4" />} 
          label="Revisados" 
          value={summary.totalReviewed} 
          color="text-primary"
        />
        <StatCard 
          icon={<Zap className="w-4 h-4" />} 
          label="Novos" 
          value={summary.newCards}
          color="text-blue-500"
        />
        <StatCard 
          icon={<Clock className="w-4 h-4" />} 
          label="Duração" 
          value={`${summary.durationMinutes}m`}
          color="text-amber-500"
        />
        <StatCard 
          icon={accuracy >= 70 ? <Smile className="w-4 h-4" /> : <Frown className="w-4 h-4" />} 
          label="Acertos" 
          value={`${accuracy}%`}
          color={accuracy >= 70 ? 'text-green-500' : 'text-red-500'}
        />
      </div>

      {/* Response breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Distribuição de Respostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <ResponseBar label="Errei" count={summary.againCount} total={summary.totalReviewed} color="bg-red-500" />
            <ResponseBar label="Difícil" count={summary.hardCount} total={summary.totalReviewed} color="bg-orange-500" />
            <ResponseBar label="Bom" count={summary.goodCount} total={summary.totalReviewed} color="bg-green-500" />
            <ResponseBar label="Fácil" count={summary.easyCount} total={summary.totalReviewed} color="bg-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`inline-flex mb-1 ${color}`}>{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ResponseBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="text-center">
      <div className="h-20 flex flex-col justify-end mb-1 relative">
        <div 
          className={`${color} rounded-t-md w-full transition-all duration-500`} 
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

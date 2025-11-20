import { Save, Book } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotebookData, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface NotebookProps {
  data: NotebookData;
  setData: (data: NotebookData) => void;
}

export default function Notebook({ data, setData }: NotebookProps) {
  const handleSave = () => {
    toast({
      title: "Salvo com sucesso!",
      description: "Suas anotações foram atualizadas.",
    });
  };

  const handleChange = (area: MedicalArea, value: string) => {
    setData({ ...data, [area]: value });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5" />
            Caderno de Erros e Anotações
          </CardTitle>
          <CardDescription>
            Organize seus aprendizados por área médica. As anotações são salvas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={MedicalArea.CLINICA} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 h-auto p-1">
              {Object.values(MedicalArea).map(area => (
                <TabsTrigger
                  key={area}
                  value={area}
                  className="data-[state=active]:border-l-4 transition-all"
                  style={{
                    borderLeftColor: AREA_COLORS[area]
                  }}
                >
                  {area.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.values(MedicalArea).map(area => (
              <TabsContent key={area} value={area} className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: AREA_COLORS[area] }}
                  />
                  <h3 className="font-semibold">{area}</h3>
                </div>

                <Textarea
                  placeholder={`Anote aqui seus principais erros, dúvidas e insights sobre ${area}...

Exemplos:
• Errei questão X porque confundi Y com Z
• Dica: sempre lembrar de ABC antes de DEF
• Diferencial diagnóstico importante: ...
• Condutas prioritárias em caso de ...`}
                  value={data[area]}
                  onChange={(e) => handleChange(area, e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{data[area].length} caracteres</span>
                  <span>{data[area].split('\n').length} linhas</span>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <Button onClick={handleSave} className="w-full mt-6">
            <Save className="w-4 h-4 mr-2" />
            Salvar Anotações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicas de uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Erros recorrentes:</strong> Anote questões que você erra repetidamente e identifique padrões.
          </p>
          <p>
            <strong className="text-foreground">Macetes:</strong> Registre mnemônicos, siglas e truques para memorização.
          </p>
          <p>
            <strong className="text-foreground">Diferenciais:</strong> Liste diagnósticos diferenciais importantes e como distingui-los.
          </p>
          <p>
            <strong className="text-foreground">Condutas:</strong> Anote fluxogramas de atendimento e condutas prioritárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

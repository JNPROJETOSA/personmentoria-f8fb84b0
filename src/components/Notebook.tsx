import { useState, useEffect, useRef } from 'react';
import { Save, Book, FileDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotebookData, MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface NotebookProps {
  data: NotebookData;
  onUpdate: (area: MedicalArea, content: string) => Promise<void>;
}

export default function Notebook({ data, onUpdate }: NotebookProps) {
  const isMountedRef = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [localData, setLocalData] = useState(data);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const saveAllChanges = async () => {
    setIsSaving(true);
    
    // Save all areas with content
    const savePromises = Object.entries(localData).map(([area, content]) => {
      return onUpdate(area as MedicalArea, content);
    });

    try {
      await Promise.all(savePromises);
      
      if (isMountedRef.current) {
        setHasUnsavedChanges(false);
        toast({
          title: "Salvo com sucesso!",
          description: "Suas anotações foram salvas na nuvem.",
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar suas anotações. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleChange = (area: MedicalArea, content: string) => {
    setLocalData(prev => ({ ...prev, [area]: content }));
    setHasUnsavedChanges(true);

    // Debounce auto-save (5 seconds)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(area, content);
      if (isMountedRef.current) {
        setHasUnsavedChanges(false);
      }
    }, 5000);
  };

  const generateNotebookPDF = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Perry Teal header
      const perryTeal: [number, number, number] = [13, 148, 136];
      pdf.setFillColor(perryTeal[0], perryTeal[1], perryTeal[2]);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('PERSON MENTORIA - Caderno de Erros', pageWidth / 2, 15, { align: 'center' });
      
      let yPosition = 40;
      
      // Add each area's notes
      Object.values(MedicalArea).forEach((area) => {
        const content = localData[area];
        if (!content || content.trim().length === 0) return;
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Area header with color
        const rgb = AREA_COLORS[area].match(/\w\w/g)?.map(x => parseInt(x, 16)) as [number, number, number];
        if (rgb) {
          pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
          pdf.roundedRect(margin, yPosition, maxWidth, 12, 2, 2, 'F');
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(area, margin + 5, yPosition + 8);
        
        yPosition += 20;
        
        // Content
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        
        const lines = pdf.splitTextToSize(content, maxWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 6;
        });
        
        yPosition += 10;
      });
      
      // Footer on all pages
      const pageCount = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Gerado em ${new Date().toLocaleString('pt-BR')} via PERSON MENTORIA - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      pdf.save(`PERSON_MENTORIA_Caderno_de_Erros_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "Seu caderno de erros foi exportado.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (isMountedRef.current) {
        toast({
          title: "Erro ao gerar PDF",
          description: "Não foi possível exportar o caderno.",
          variant: "destructive"
        });
      }
    }
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
            Organize seus aprendizados por área médica.
            {hasUnsavedChanges && (
              <span className="text-orange-500 font-semibold ml-2">• Alterações não salvas</span>
            )}
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
                  value={localData[area]}
                  onChange={(e) => handleChange(area, e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{localData[area].length} caracteres</span>
                  <span>{localData[area].split('\n').length} linhas</span>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex gap-3 mt-6">
            <Button 
              onClick={saveAllChanges} 
              disabled={!hasUnsavedChanges || isSaving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : hasUnsavedChanges ? 'Salvar Agora' : 'Tudo Salvo'}
            </Button>
            <Button onClick={generateNotebookPDF} variant="outline" className="flex-1">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
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

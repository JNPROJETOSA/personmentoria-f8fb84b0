import { useState, useRef, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';



interface ProfileSettingsProps {
  profile: {
    name: string;
    user_id: string;
    exam_year: string | null;
    target_institutions: string[] | null;
    target_specialty: string | null;
  } | null;
  updateProfile: (updates: Partial<{
    name: string;
    exam_year: string | null;
    target_institutions: string[] | null;
    target_specialty: string | null;
  }>) => void;
  userEmail: string | undefined;
}

const nameSchema = z.string()
  .trim()
  .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
  .max(100, { message: "Nome deve ter no máximo 100 caracteres" })
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, { message: "Nome deve conter apenas letras e espaços" });

export default function ProfileSettings({ profile, updateProfile, userEmail }: ProfileSettingsProps) {
  const isMountedRef = useRef(true);
  const [name, setName] = useState(profile?.name || '');
  const [examYear, setExamYear] = useState(profile?.exam_year || '');
  const [targetInstitutions, setTargetInstitutions] = useState<string[]>(profile?.target_institutions || []);
  const [newInstitution, setNewInstitution] = useState('');
  const [targetSpecialty, setTargetSpecialty] = useState(profile?.target_specialty || '');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setExamYear(profile.exam_year || '');
      setTargetInstitutions(profile.target_institutions || []);
      setTargetSpecialty(profile.target_specialty || '');
    }
  }, [profile]);

  const handleAddInstitution = () => {
    if (newInstitution.trim()) {
      if (!targetInstitutions.includes(newInstitution.trim())) {
        setTargetInstitutions([...targetInstitutions, newInstitution.trim()]);
      }
      setNewInstitution('');
    }
  };

  const handleRemoveInstitution = (inst: string) => {
    setTargetInstitutions(targetInstitutions.filter(i => i !== inst));
  };

  const handleSave = async () => {
    setError('');

    // Validação
    const validation = nameSchema.safeParse(name);
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Nome inválido";
      setError(errorMessage);
      if (isMountedRef.current) {
        toast({
          title: "Erro de validação",
          description: errorMessage,
          variant: "destructive"
        });
      }
      return;
    }

    try {
      // Salvar
      await updateProfile({
        name: validation.data,
        exam_year: examYear || null,
        target_institutions: targetInstitutions.length > 0 ? targetInstitutions : null,
        target_specialty: targetSpecialty || null
      });

      setIsEditing(false);

      if (isMountedRef.current) {
        toast({
          title: "Perfil atualizado!",
          description: "Suas informações foram salvas com sucesso.",
        });
      }
    } catch (err) {
      console.error("Failed to update profile", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Verifique sua conexão ou contate o suporte.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
    setExamYear(profile?.exam_year || '');
    setTargetInstitutions(profile?.target_institutions || []);
    setTargetSpecialty(profile?.target_specialty || '');
    setIsEditing(false);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Gerencie suas informações de perfil e objetivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome de Exibição</Label>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  maxLength={100}
                  className={error ? 'border-destructive' : ''}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-md bg-muted text-foreground">
                {profile?.name || 'Nome não definido'}
              </div>
            )}
          </div>

          {/* Ano de Prova */}
          <div className="space-y-2">
            <Label htmlFor="examYear">Ano de Prestação da Prova</Label>
            {isEditing ? (
              <Input
                id="examYear"
                type="number"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                placeholder="Ex: 2026"
                maxLength={4}
              />
            ) : (
              <div className="p-3 rounded-md bg-muted text-foreground">
                {profile?.exam_year || 'Não definido'}
              </div>
            )}
          </div>

          {/* Especialidade Pretendida */}
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidade Pretendida</Label>
            {isEditing ? (
              <Input
                id="specialty"
                value={targetSpecialty}
                onChange={(e) => setTargetSpecialty(e.target.value)}
                placeholder="Ex: Cardiologia, Pediatria..."
              />
            ) : (
              <div className="p-3 rounded-md bg-muted text-foreground">
                {profile?.target_specialty || 'Não definido'}
              </div>
            )}
          </div>

          {/* Instituições Alvo */}
          <div className="space-y-2">
            <Label>Instituições Pretendidas</Label>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newInstitution}
                    onChange={(e) => setNewInstitution(e.target.value)}
                    placeholder="Adicionar instituição (Ex: USP)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInstitution();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddInstitution} variant="secondary">Adicionar</Button>
                </div>

                {targetInstitutions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetInstitutions.map((inst, idx) => (
                      <div key={idx} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <span>{inst}</span>
                        <button
                          onClick={() => handleRemoveInstitution(inst)}
                          className="hover:text-destructive focus:outline-none"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-md bg-muted text-foreground min-h-[46px] flex flex-wrap gap-2 items-center">
                {profile?.target_institutions && profile.target_institutions.length > 0 ? (
                  profile.target_institutions.map((inst, idx) => (
                    <span key={idx} className="bg-background border px-2 py-0.5 rounded-md text-sm">
                      {inst}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Nenhuma instituição definida</span>
                )}
              </div>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="p-3 rounded-md bg-muted text-muted-foreground">
              {userEmail || 'Email não disponível'}
            </div>
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado diretamente. Para alterar, entre em contato com o suporte.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="w-full">
                Editar Informações
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estatísticas do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Nível</span>
            <span className="font-semibold">{(profile as any)?.level || 1}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">XP Total</span>
            <span className="font-semibold">{(profile as any)?.xp || 0}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Sequência de Estudos</span>
            <span className="font-semibold">{(profile as any)?.streak || 0} dias</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Atividades Totais</span>
            <span className="font-semibold">{(profile as any)?.total_activities || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>

  );
}

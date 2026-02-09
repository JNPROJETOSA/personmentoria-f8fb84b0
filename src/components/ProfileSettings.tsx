import { useState, useRef, useEffect } from 'react';
import { User, Save, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Reset Records State
  const [isResettingRecords, setIsResettingRecords] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isProcessingReset, setIsProcessingReset] = useState(false);
  const [resetError, setResetError] = useState('');

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

  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('A confirmação da senha não coincide.');
      return;
    }
    if (!currentPassword) {
      setPasswordError('Por favor, digite sua senha atual.');
      return;
    }

    try {
      if (!userEmail) throw new Error("Email do usuário não encontrado.");

      // 1. Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Senha atual incorreta.');
        return;
      }

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: "Senha alterada com sucesso!",
        description: "Use sua nova senha no próximo login."
      });

      // Reset fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);

    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  const handleResetRecords = async () => {
    setResetError('');

    if (!resetPassword) {
      setResetError('Por favor, digite sua senha para confirmar.');
      return;
    }

    try {
      if (!userEmail) throw new Error("Email do usuário não encontrado.");

      // 1. Verify password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: resetPassword,
      });

      if (signInError) {
        setResetError('Senha incorreta. Verifique e tente novamente.');
        return;
      }

      // 2. Show final confirmation dialog
      setShowResetConfirmation(true);

    } catch (error: any) {
      console.error('Reset validation error:', error);
      setResetError(error.message || 'Erro ao validar senha.');
    }
  };

  const confirmResetRecords = async () => {
    setIsProcessingReset(true);
    setShowResetConfirmation(false);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não encontrado');

      // Call the reset function
      const { data, error } = await supabase.rpc('reset_user_records', {
        target_user_id: user.id
      });

      if (error) throw error;

      if (data?.success === false) {
        throw new Error(data.error || 'Erro ao resetar registros');
      }

      // Success!
      toast({
        title: "Registros resetados com sucesso!",
        description: "Todos os seus dados de estudo foram apagados. A página será recarregada.",
      });

      // Reset form
      setResetPassword('');
      setIsResettingRecords(false);
      setResetError('');

      // Reload page after 2 seconds to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Reset records error:', error);
      toast({
        title: "Erro ao resetar registros",
        description: error.message || "Ocorreu um erro. Tente novamente mais tarde.",
        variant: "destructive"
      });
      setIsProcessingReset(false);
    }
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

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChangingPassword ? (
            <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
              Alterar Senha
            </Button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-sm text-destructive font-medium">{passwordError}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleChangePassword}>
                  Salvar Nova Senha
                </Button>
                <Button variant="ghost" onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordError('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resetar Registros */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Resetar Registros
          </CardTitle>
          <CardDescription>
            Apagar permanentemente todo o histórico de estudos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isResettingRecords ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-destructive-foreground">
                  <p className="font-semibold mb-1">Atenção: Esta ação é irreversível!</p>
                  <p className="text-muted-foreground">
                    Ao resetar seus registros, você perderá permanentemente todos os dados de progresso:
                    aulas estudadas, exercícios, simulados, revisões, flashcards, caderno de erros, editais e estatísticas.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsResettingRecords(true)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Resetar Todos os Registros
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="resetPassword">Digite sua senha para confirmar</Label>
                <Input
                  id="resetPassword"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Sua senha"
                  disabled={isProcessingReset}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  Esta ação irá apagar <strong>PERMANENTEMENTE</strong> todos os seus registros de estudo.
                  Seus dados pessoais (nome, email, instituições) serão mantidos.
                </p>
              </div>

              {resetError && (
                <p className="text-sm text-destructive font-medium">{resetError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleResetRecords}
                  disabled={isProcessingReset}
                  className="flex-1"
                >
                  {isProcessingReset ? 'Processando...' : 'Confirmar Reset'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsResettingRecords(false);
                    setResetPassword('');
                    setResetError('');
                  }}
                  disabled={isProcessingReset}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirmation} onOpenChange={setShowResetConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Tem certeza absoluta?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a <strong>APAGAR PERMANENTEMENTE</strong> todos os seus dados de estudo.
                Esta ação <strong>NÃO PODE SER DESFEITA</strong>.
              </p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-semibold mb-2">Será apagado:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Todas as aulas marcadas como estudadas</li>
                  <li>Todos os registros de exercícios e simulados</li>
                  <li>Todas as revisões agendadas</li>
                  <li>Todos os flashcards e pastas</li>
                  <li>Todo o caderno de erros</li>
                  <li>Todos os editais e progresso</li>
                  <li>Todas as sessões do modo prova</li>
                  <li>Todo o histórico de burnout</li>
                  <li>Seu XP, nível e sequência de estudos</li>
                </ul>
              </div>
              <p className="text-sm">
                <strong>Será mantido:</strong> Seus dados pessoais (nome, email, instituições) e metas de estudo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingReset}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetRecords}
              disabled={isProcessingReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessingReset ? 'Resetando...' : 'Sim, resetar tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div >

  );
}

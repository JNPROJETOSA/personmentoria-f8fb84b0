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
  } | null;
  updateProfile: (updates: { name: string }) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile?.name]);

  const handleSave = () => {
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

    // Salvar
    updateProfile({ name: validation.data });
    setIsEditing(false);

    if (isMountedRef.current) {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
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
            Gerencie suas informações de perfil
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

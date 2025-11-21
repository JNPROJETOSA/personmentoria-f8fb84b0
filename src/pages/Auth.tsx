import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, Mail, Lock, User, Key } from "lucide-react";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get('reset') === 'true';
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(isResetMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isResetMode) {
      setIsResetPassword(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, [isResetMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        // Reset password with new password
        if (newPassword !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }

        if (newPassword.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres');
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        toast({
          title: "Senha alterada!",
          description: "Sua senha foi redefinida com sucesso.",
        });
        
        setIsResetPassword(false);
        setIsLogin(true);
        navigate('/auth');
      } else if (isForgotPassword) {
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });

        if (error) throw error;

        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        
        setIsForgotPassword(false);
        setEmail('');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta ao PERRYMED.",
        });
        navigate("/");
      } else {
        // Validate invite code first
        const { data: isValid, error: codeError } = await supabase
          .rpc('validate_invite_code', { code_input: inviteCode });

        if (codeError || !isValid) {
          toast({
            title: "Código inválido",
            description: "O código de convite não é válido ou expirou.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Cadastro realizado!",
          description: "Sua conta foi criada com sucesso. Faça login para continuar.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-orange-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
            PERRYMED
          </CardTitle>
          <CardDescription>
            {isResetPassword
              ? "Crie sua nova senha"
              : isForgotPassword
              ? "Recuperar senha"
              : isLogin
              ? "Entre na sua conta para continuar estudando"
              : "Crie sua conta e comece sua jornada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isResetPassword ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirme a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {!isLogin && !isForgotPassword && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Nome completo"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Código de Convite</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="inviteCode"
                          type="text"
                          placeholder="Código de acesso"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          className="pl-10"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {!isForgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {isLogin && !isForgotPassword && !isResetPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              disabled={loading}
            >
              {loading
                ? "Carregando..."
                : isResetPassword
                ? "Redefinir Senha"
                : isForgotPassword
                ? "Enviar Email de Recuperação"
                : isLogin
                ? "Entrar"
                : "Cadastrar"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail('');
                }}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Voltar ao login
              </button>
            ) : !isResetPassword && (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                {isLogin
                  ? "Não tem uma conta? Cadastre-se"
                  : "Já tem uma conta? Faça login"}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

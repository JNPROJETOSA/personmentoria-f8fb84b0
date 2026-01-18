
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                toast({
                    title: "Cadastro realizado!",
                    description: "Verifique seu email para confirmar o cadastro (se necessário) ou faça login.",
                });
                setIsSignUp(false); // Switch back to login
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            let message = "Ocorreu um erro inesperado.";

            if (error.message.includes('Email not authorized')) {
                message = "Este email não tem permissão para acessar o sistema. Contate um administrador.";
            } else if (error.message.includes('Invalid login credentials')) {
                message = "Email ou senha incorretos.";
            }

            toast({
                title: "Erro de autenticação",
                description: message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-primary/20 shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-primary">
                        Mentoria Residência
                    </CardTitle>
                    <CardDescription>
                        {isSignUp ? "Crie sua conta para começar" : "Entre para acessar sua plataforma de estudos"}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleAuth}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder="Seu email"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Sua senha"
                                    className="pl-9"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                isSignUp ? "Cadastrar" : "Entrar"
                            )}
                        </Button>
                        <Button
                            variant="link"
                            type="button"
                            className="text-sm text-muted-foreground"
                            onClick={() => setIsSignUp(!isSignUp)}
                        >
                            {isSignUp ? "Já tem uma conta? Faça login" : "Primeiro acesso? Cadastre-se"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

import { useState } from 'react';
import { BrainCircuit, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { REGISTRATION_CODE } from '@/lib/constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegister) {
      if (code !== REGISTRATION_CODE) {
        toast({
          title: "Código inválido",
          description: "O código de registro está incorreto.",
          variant: "destructive"
        });
        return;
      }
      
      const users = JSON.parse(localStorage.getItem('perry_users') || '[]');
      if (users.some((u: User) => u.email === email)) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já está em uso.",
          variant: "destructive"
        });
        return;
      }
      
      const newUser: User = { email, name, password };
      users.push(newUser);
      localStorage.setItem('perry_users', JSON.stringify(users));
      onLogin(newUser);
      
      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao PERRYMED.",
      });
    } else {
      const users = JSON.parse(localStorage.getItem('perry_users') || '[]');
      const user = users.find((u: User) => u.email === email && u.password === password);
      
      if (user) {
        onLogin(user);
        toast({
          title: "Login realizado!",
          description: `Bem-vindo de volta, ${user.name}!`,
        });
      } else {
        toast({
          title: "Credenciais inválidas",
          description: "Email ou senha incorretos.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-medical-preventiva/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="w-10 h-10 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">
              PERRY<span className="text-primary">MED</span>
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isRegister ? 'Criar nova conta' : 'Entre na sua conta'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr(a). Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="code">Código de Registro</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Código fornecido"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" size="lg">
              {isRegister ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

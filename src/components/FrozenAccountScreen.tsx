import { Snowflake, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FrozenAccountScreenProps {
  userName: string;
  onSignOut: () => void;
}

const FrozenAccountScreen = ({ userName, onSignOut }: FrozenAccountScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Snowflake className="w-10 h-10 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">Conta Congelada</CardTitle>
          <CardDescription className="text-base">
            Olá, <span className="font-semibold">{userName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Sua conta foi temporariamente congelada pelo administrador. 
            Enquanto estiver congelada, você não poderá adicionar ou modificar dados na plataforma.
          </p>
          <p className="text-sm text-muted-foreground">
            Seus dados estão seguros e serão mantidos. Entre em contato com o administrador para mais informações.
          </p>
          <Button variant="outline" className="w-full" onClick={onSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FrozenAccountScreen;

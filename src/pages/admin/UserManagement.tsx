
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function UserManagementPage() {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
                    <p className="text-muted-foreground">Administre permissões e crie novas contas.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>Voltar ao Painel</Button>
            </div>

            <AdminUserManagement />
        </div>
    );
}


import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Shield, ShieldCheck, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface WhitelistedUser {
    email: string;
    role: 'admin' | 'student' | 'mentor';
    created_at: string;
}

export const AdminUserManagement = () => {
    const [users, setUsers] = useState<WhitelistedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'student' | 'mentor'>('student');
    const [newName, setNewName] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth(); // Current admin user

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_whitelist')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data as WhitelistedUser[]);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                title: "Erro ao carregar usuários",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;
        setInviteLoading(true);

        try {
            if (newPassword && newPassword.length < 6) {
                toast({ title: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
                setInviteLoading(false);
                return;
            }

            // Step 1: Whitelist the user (Liberar acesso)
            const { error: rpcError } = await supabase.rpc('admin_create_user', {
                new_email: newEmail,
                new_role: newRole,
                new_name: newName
            });

            if (rpcError) throw rpcError;

            // Step 2: Attempt to create the user with password if provided
            if (newPassword) {
                const secondaryClient = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    { auth: { persistSession: false } }
                );

                const { error: signUpError } = await secondaryClient.auth.signUp({
                    email: newEmail,
                    password: newPassword,
                    options: {
                        data: {
                            full_name: newName || newEmail,
                            name: newName || newEmail.split('@')[0]
                        }
                    }
                });

                if (signUpError) {
                    console.warn('SignUp attempted but user might already exist or confirmation required:', signUpError);
                    toast({
                        title: "Permissão concedida!",
                        description: `${newEmail} já está na lista, mas a senha não pôde ser definida automaticamente (pode ser um usuário já existente).`
                    });
                } else {
                    toast({
                        title: "Usuário criado!",
                        description: `${newEmail} foi cadastrado e permissionado como ${newRole}.`
                    });
                }
            } else {
                toast({
                    title: "Permissão adicionada!",
                    description: `${newEmail} agora pode se cadastrar no site como ${newRole}.`
                });
            }

            setNewEmail('');
            setNewPassword('');
            setNewName('');
            fetchUsers(); 
        } catch (error: any) {
            console.error('Error adding user:', error);
            toast({
                title: "Erro ao adicionar usuário",
                description: error.message || "Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDelete = async (email: string) => {
        if (!confirm(`Remover acesso de ${email}?`)) return;

        try {
            const { error } = await supabase
                .from('admin_whitelist')
                .delete()
                .eq('email', email);

            if (error) throw error;

            toast({ title: "Acesso removido com sucesso." });
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast({ title: "Erro ao remover", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                {/* Invite Form */}
                <Card className="md:col-span-1 border-primary/20 h-fit">
                    <CardHeader>
                        <CardTitle>Adicionar Novo Usuário</CardTitle>
                        <CardDescription>Crie uma conta ou libere acesso para um email.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome (Opcional)</label>
                                <Input
                                    type="text"
                                    placeholder="Nome completo"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    placeholder="exemplo@email.com"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Senha Inicial (Opcional)</label>
                                <Input
                                    type="text"
                                    placeholder="Deixe vazio para apenas liberar acesso"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    minLength={6}
                                />
                                <p className="text-xs text-muted-foreground">Se preenchido, o usuário será criado imediatamente.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Função</label>
                                <Select value={newRole} onValueChange={(v: 'admin' | 'student' | 'mentor') => setNewRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Aluno</SelectItem>
                                        <SelectItem value="mentor">Mentor</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={inviteLoading}>
                                {inviteLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {newPassword ? "Criar Usuário" : "Adicionar Permissão"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Users List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Usuários Autorizados</CardTitle>
                        <CardDescription>Lista de emails permitidos no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Função</TableHead>
                                            <TableHead>Data Aprovação</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    Nenhum usuário cadastrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : users.map((user) => (
                                            <TableRow key={user.email}>
                                                <TableCell className="font-medium">{user.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'mentor' ? 'outline' : 'secondary'} className="flex w-fit gap-1 items-center">
                                                        {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : user.role === 'mentor' ? <UserCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                        {user.role === 'admin' ? 'Administrador' : user.role === 'mentor' ? 'Mentor' : 'Aluno'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(user.email)}
                                                        className="text-destructive hover:text-destructive/90"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

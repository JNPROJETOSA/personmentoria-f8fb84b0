
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface WhitelistedUser {
    email: string;
    role: 'admin' | 'student';
    created_at: string;
}

export const AdminUserManagement = () => {
    const [users, setUsers] = useState<WhitelistedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'student'>('student');
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
            // 1. Add to Whitelist
            const { error } = await supabase
                .from('admin_whitelist')
                .insert([{
                    email: newEmail,
                    role: newRole,
                    created_by: user?.id
                }]);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast({ title: "Usuário já está na lista!", variant: "destructive" });
                } else {
                    throw error;
                }
                return;
            }

            toast({
                title: "Usuário adicionado!",
                description: `${newEmail} agora pode se cadastrar como ${newRole}.`
            });

            setNewEmail('');
            fetchUsers(); // Refresh list
        } catch (error) {
            console.error('Error inviting user:', error);
            toast({
                title: "Erro ao adicionar usuário",
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
                        <CardDescription>Libere o acesso para um novo aluno ou administrador.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-4">
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
                                <label className="text-sm font-medium">Função</label>
                                <Select value={newRole} onValueChange={(v: 'admin' | 'student') => setNewRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="student">Aluno</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={inviteLoading}>
                                {inviteLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Adicionar Permissão
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
                                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="flex w-fit gap-1 items-center">
                                                        {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                        {user.role === 'admin' ? 'Administrador' : 'Aluno'}
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

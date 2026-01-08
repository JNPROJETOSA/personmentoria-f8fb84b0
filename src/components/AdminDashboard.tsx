import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, PenTool, FileText, Trophy, Flame, BarChart3 } from 'lucide-react';
import { UserSummary } from '@/hooks/useAdminData';
import AdminUserAnalysis from './AdminUserAnalysis';

interface AdminDashboardProps {
  users: UserSummary[];
  loading: boolean;
}

const AdminDashboard = ({ users, loading }: AdminDashboardProps) => {
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

  const handleViewAnalysis = (user: UserSummary) => {
    setSelectedUser(user);
  };

  // If viewing a specific user, show the analysis component
  if (selectedUser) {
    return (
      <AdminUserAnalysis 
        user={selectedUser} 
        onBack={() => setSelectedUser(null)} 
      />
    );
  }

  const totalExercises = users.reduce((sum, u) => sum + u.exerciseCount, 0);
  const totalExams = users.reduce((sum, u) => sum + u.examCount, 0);
  const totalClasses = users.reduce((sum, u) => sum + u.classesStudied, 0);
  const avgAccuracy = users.length > 0 
    ? Math.round(users.reduce((sum, u) => sum + u.totalAccuracy, 0) / users.length * 10) / 10 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Painel do Administrador</h2>
          <p className="text-muted-foreground">Acompanhe o progresso de todos os usuários</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {users.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exercícios Realizados</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <PenTool className="w-6 h-6 text-blue-500" />
              {totalExercises}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Provas Registradas</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-500" />
              {totalExams}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aulas Estudadas</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-green-500" />
              {totalClasses}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acerto Médio</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {avgAccuracy}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>Clique em "Ver Detalhes" para ver informações completas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Nível</TableHead>
                <TableHead className="text-center">XP</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Streak
                  </span>
                </TableHead>
                <TableHead className="text-center">Exercícios</TableHead>
                <TableHead className="text-center">Provas</TableHead>
                <TableHead className="text-center">Aulas</TableHead>
                <TableHead className="text-center">Acerto</TableHead>
                <TableHead className="text-center">Último Estudo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{user.level}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{user.xp}</TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      {user.streak > 0 && <Flame className="w-4 h-4 text-orange-500" />}
                      {user.streak}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{user.exerciseCount}</TableCell>
                  <TableCell className="text-center">{user.examCount}</TableCell>
                  <TableCell className="text-center">
                    {user.classesStudied}/{user.totalClasses}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={user.totalAccuracy >= 70 ? 'default' : user.totalAccuracy >= 50 ? 'secondary' : 'destructive'}>
                      {user.totalAccuracy}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {user.last_study_date || 'Nunca'}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewAnalysis(user)}>
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Análise
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;

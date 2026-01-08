import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, BookOpen, PenTool, FileText, Trophy, Flame, Eye, CreditCard } from 'lucide-react';
import { UserSummary } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';

interface AdminDashboardProps {
  users: UserSummary[];
  loading: boolean;
}

interface UserDetails {
  exercises: any[];
  exams: any[];
  classes: any[];
  editorialProgress: any[];
}

const AdminDashboard = ({ users, loading }: AdminDashboardProps) => {
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleViewDetails = async (user: UserSummary) => {
    setSelectedUser(user);
    setDetailsLoading(true);

    try {
      const [exercisesRes, examsRes, classesRes, editorialRes] = await Promise.all([
        supabase.from('exercises').select('*').eq('user_id', user.user_id).order('date', { ascending: false }).limit(20),
        supabase.from('exams').select('*').eq('user_id', user.user_id).order('date', { ascending: false }),
        supabase.from('classes').select('*').eq('user_id', user.user_id).order('date', { ascending: false }),
        supabase.from('editorial_progress').select('*').eq('user_id', user.user_id)
      ]);

      setUserDetails({
        exercises: exercisesRes.data || [],
        exams: examsRes.data || [],
        classes: classesRes.data || [],
        editorialProgress: editorialRes.data || []
      });
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

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
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(user)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Detalhes de {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userDetails && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <PenTool className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{userDetails.exercises.length}</p>
                    <p className="text-sm text-muted-foreground">Exercícios</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{userDetails.exams.length}</p>
                    <p className="text-sm text-muted-foreground">Provas</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{userDetails.classes.filter(c => c.studied).length}/{userDetails.classes.length}</p>
                    <p className="text-sm text-muted-foreground">Aulas</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <CreditCard className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                    <p className="text-2xl font-bold">{userDetails.editorialProgress.filter(e => e.status === 'done').length}</p>
                    <p className="text-sm text-muted-foreground">Tópicos Concluídos</p>
                  </div>
                </div>

                {/* Recent Exercises */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    Exercícios Recentes
                  </h3>
                  {userDetails.exercises.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum exercício registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.exercises.slice(0, 10).map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{ex.topic}</p>
                            <p className="text-sm text-muted-foreground">{ex.specialty} • {ex.date}</p>
                          </div>
                          <Badge variant={((ex.correct_answers / ex.total_questions) * 100) >= 70 ? 'default' : 'destructive'}>
                            {ex.correct_answers}/{ex.total_questions} ({Math.round((ex.correct_answers / ex.total_questions) * 100)}%)
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exams */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Provas Realizadas
                  </h3>
                  {userDetails.exams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma prova registrada</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.exams.map((exam: any) => (
                        <div key={exam.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{exam.name}</p>
                            <p className="text-sm text-muted-foreground">{exam.institution} • {exam.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Classes */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Aulas Cadastradas
                  </h3>
                  {userDetails.classes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma aula cadastrada</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.classes.slice(0, 10).map((cls: any) => (
                        <div key={cls.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{cls.title}</p>
                            <p className="text-sm text-muted-foreground">{cls.specialty} • {cls.date}</p>
                          </div>
                          <Badge variant={cls.studied ? 'default' : 'secondary'}>
                            {cls.studied ? 'Estudada' : 'Pendente'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;

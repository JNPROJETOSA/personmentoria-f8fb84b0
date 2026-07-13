import { useState } from 'react';
import { Plus, Edit, Trash2, Volume2, VolumeX, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneralNotifications } from '@/hooks/useGeneralNotifications';
import { GeneralNotification } from '@/lib/types';
import { formatDateDisplay } from '@/lib/dateUtils';

export default function GeneralNotificationsAdmin() {
  const { user, isAdmin } = useAuth();
  const {
    notifications,
    loading,
    createNotification,
    updateNotification,
    republishNotification,
    deleteNotification,
  } = useGeneralNotifications(user?.id, isAdmin);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<GeneralNotification | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(false);

  const handleOpenCreate = () => {
    setTitle('');
    setMessage('');
    setActive(false);
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    await createNotification(title, message, active);
    setIsCreateOpen(false);
  };

  const handleOpenEdit = (notif: GeneralNotification) => {
    setSelectedNotif(notif);
    setTitle(notif.title);
    setMessage(notif.message);
    setActive(notif.active);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (shouldRepublicate: boolean) => {
    if (!selectedNotif) return;
    if (!title.trim() || !message.trim()) return;

    if (shouldRepublicate) {
      // Updates content AND increments version (republish)
      await updateNotification(selectedNotif.id, {
        title,
        message,
        active: true, // Auto-activates on republish
        version: selectedNotif.version + 1,
      });
    } else {
      // Normal update keeping version
      await updateNotification(selectedNotif.id, {
        title,
        message,
        active,
      });
    }
    setIsEditOpen(false);
    setSelectedNotif(null);
  };

  const handleOpenDelete = (notif: GeneralNotification) => {
    setSelectedNotif(notif);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedNotif) return;
    await deleteNotification(selectedNotif.id);
    setIsDeleteOpen(false);
    setSelectedNotif(null);
  };

  const handleToggleActive = async (notif: GeneralNotification) => {
    await updateNotification(notif.id, { active: !notif.active });
  };

  const handleRepublicateDirect = async (notif: GeneralNotification) => {
    await republishNotification(notif.id, notif.version);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-destructive">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-xl font-bold">Acesso Negado</h3>
        <p>Você não tem permissão para visualizar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">Gerenciar Notificações Gerais</h3>
          <p className="text-sm text-muted-foreground">
            Publique comunicados globais em destaque para todos os alunos
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex gap-2 items-center">
          <Plus className="w-4 h-4" />
          Nova Notificação
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando notificações...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground space-y-2">
          <Volume2 className="w-12 h-12 mx-auto opacity-30" />
          <p className="font-medium text-lg">Nenhuma notificação cadastrada</p>
          <p className="text-sm">Clique em "Nova Notificação" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((notif) => (
            <Card key={notif.id} className="overflow-hidden border border-border bg-card">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg font-bold">{notif.title}</CardTitle>
                      <Badge variant={notif.active ? 'default' : 'secondary'} className="h-5">
                        {notif.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Badge variant="outline" className="h-5 border-primary/30 text-primary">
                        Publicação #{notif.version}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Criada em: {formatDateDisplay(notif.created_at)}
                      {notif.updated_at !== notif.created_at && (
                        <span> • Atualizada: {formatDateDisplay(notif.updated_at)}</span>
                      )}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">
                      {notif.active ? 'Ativa' : 'Inativa'}
                    </span>
                    <Switch
                      checked={notif.active}
                      onCheckedChange={() => handleToggleActive(notif)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {notif.message}
                </p>
                
                <div className="flex justify-end items-center gap-2 mt-4 border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground flex gap-1 items-center"
                    onClick={() => handleRepublicateDirect(notif)}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Republicar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 flex gap-1 items-center"
                    onClick={() => handleOpenEdit(notif)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 flex gap-1 items-center"
                    onClick={() => handleOpenDelete(notif)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Notificação Geral</DialogTitle>
            <DialogDescription>
              Preencha o título e a mensagem. A notificação aparecerá para todos os alunos ativos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Notificação</Label>
              <Input
                id="title"
                placeholder="Ex: Novo simulado geral liberado!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem completa</Label>
              <Textarea
                id="message"
                placeholder="Escreva a mensagem aqui..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="create-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="create-active" className="cursor-pointer">
                Publicar imediatamente como Ativa
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || !message.trim()}>
              Criar Notificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Notificação</DialogTitle>
            <DialogDescription>
              Escolha entre atualizar apenas o texto ou republicar para todos os alunos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título da Notificação</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-message">Mensagem completa</Label>
              <Textarea
                id="edit-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Ativa (Alunos visualizarão se ainda não confirmaram esta versão)
              </Label>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs text-muted-foreground flex gap-2">
              <AlertCircle className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-foreground block mb-0.5">Qual a diferença?</span>
                <strong>Salvar Edição:</strong> Apenas salva o texto. Alunos que já marcaram como visualizado não verão o aviso de novo.<br />
                <strong>Salvar e Republicar:</strong> Incrementa a versão, zerando o status de leitura de todos. A notificação aparecerá de novo para cada aluno.
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={() => handleSaveEdit(false)}>
              Salvar Edição
            </Button>
            <Button onClick={() => handleSaveEdit(true)}>
              Salvar e Republicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Notificação Geral</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta notificação? Esta ação é irreversível e removerá todos os registros de leitura correspondentes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

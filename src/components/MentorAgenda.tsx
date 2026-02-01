import { useState, useEffect } from 'react';
import { useMeetingScheduler } from '@/hooks/useMeetingScheduler';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format, addHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Users, CalendarDays, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function MentorAgenda() {
    const { user, isMentor, isAdmin } = useAuth();
    const { slots, loading, fetchSlots, createSlots, deleteSlot, cancelMeeting } = useMeetingScheduler(user?.id, isMentor || isAdmin);

    // Add Slot State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState("10:00");

    useEffect(() => {
        if (user?.id) fetchSlots();
    }, [user?.id]);

    const handleAddSlot = async () => {
        if (!date || !time) {
            toast({ title: 'Selecione data e hora', variant: 'destructive' });
            return;
        }

        // Construct Date Object
        const [hours, minutes] = time.split(':').map(Number);
        const start = new Date(date);
        start.setHours(hours, minutes, 0, 0);

        const end = addHours(start, 1); // Fixed 60 min duration

        await createSlots([{ start, end }]);
    };

    const handleDelete = async (slotId: string, isBooked: boolean) => {
        if (isBooked) {
            if (confirm('Este horário está reservado! Deseja cancelar a reunião e liberar o horário? (O aluno será avisado)')) {
                // Logic for mentor cancelling a booked meeting -> Unbook
                await cancelMeeting(slotId, new Date().toISOString()); // Pass current time to bypass 12h check (mentor override logic inside hook needed?)
                // Wait, cancelMeeting in hook checks 12h if !isMentor. So Mentor can cancel anytime.
            }
        } else {
            if (confirm('Remover este horário livre?')) {
                await deleteSlot(slotId);
            }
        }
    }

    if (!isMentor && !isAdmin) return <div>Acesso restrito a mentores e administradores.</div>;

    // Grouping slots? List is properly sorted by hook.

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" /> Gerenciar Disponibilidade
                    </CardTitle>
                    <CardDescription>Defina os horários em que você estará disponível para os alunos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add Slot Controls */}
                    <div className="flex flex-col md:flex-row gap-4 items-end border-b pb-6">
                        <div className="space-y-2 flex-1">
                            <Label>Data</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 w-32">
                            <Label>Horário</Label>
                            <Input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddSlot} disabled={loading}>
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Horário
                        </Button>
                    </div>

                    {/* Slots List */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Seus Horários ({slots.length})</h3>
                        {loading && <p className="text-muted-foreground text-sm">Carregando...</p>}

                        {!loading && slots.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum horário cadastrado. Adicione horários acima.
                            </div>
                        )}

                        <div className="grid gap-3">
                            {slots.map(slot => {
                                const isBooked = !!slot.student_id;
                                const startDate = new Date(slot.start_time);
                                return (
                                    <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col text-sm">
                                                <span className="font-semibold">{format(startDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                                                <span className="text-muted-foreground">
                                                    {format(startDate, "HH:mm")} - {format(new Date(slot.end_time), "HH:mm")}
                                                </span>
                                            </div>
                                            {isBooked ? (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                    Reservado por: {slot.student_name || 'Aluno (Nome não disponível)'}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">Livre</Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(slot.id, isBooked)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

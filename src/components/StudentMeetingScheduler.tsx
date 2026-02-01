import { useState, useEffect, useMemo } from 'react';
import { useMeetingScheduler, MeetingSlot } from '@/hooks/useMeetingScheduler';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { useProfile } from '@/hooks/useProfile';

export function StudentMeetingScheduler() {
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { slots, loading, fetchSlots, bookMeeting, cancelMeeting } = useMeetingScheduler(user?.id, false);
    const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [bookingSlot, setBookingSlot] = useState<MeetingSlot | null>(null);

    useEffect(() => {
        if (user?.id) fetchSlots();
    }, [user?.id]);

    // Derived Data
    const myMeeting = useMemo(() => slots.find(s => s.student_id === user?.id), [slots, user?.id]);

    const availableSlots = useMemo(() => slots.filter(s => !s.student_id), [slots]);

    const mentorsWithSlots = useMemo(() => {
        const map = new Map<string, string>(); // id -> name
        availableSlots.forEach(s => {
            if (s.mentor) map.set(s.mentor_id, s.mentor.name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [availableSlots]);

    // Filter slots for view
    const visibleSlots = useMemo(() => {
        if (!selectedMentorId || !selectedDate) return [];
        return availableSlots.filter(s =>
            s.mentor_id === selectedMentorId &&
            isSameDay(new Date(s.start_time), selectedDate)
        );
    }, [availableSlots, selectedMentorId, selectedDate]);

    // If student has a meeting, show it prominently
    if (myMeeting) {
        const meetingDate = new Date(myMeeting.start_time);
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <Alert className="bg-primary/10 border-primary text-primary-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Reunião Confirmada!</AlertTitle>
                    <AlertDescription>
                        Você já possui uma reunião agendada. Deseja remarcar? Cancele a atual primeiro.
                    </AlertDescription>
                </Alert>

                <Card className="border-2 border-primary/20">
                    <CardHeader>
                        <CardTitle>Sua Reunião</CardTitle>
                        <CardDescription>Detalhes do agendamento</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                            <Avatar>
                                <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{myMeeting.mentor?.name || 'Mentor'}</p>
                                <p className="text-sm text-muted-foreground">Mentor(a)</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Data</span>
                                <span className="font-medium flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4" />
                                    {format(meetingDate, "dd 'de' MMMM", { locale: ptBR })}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Horário</span>
                                <span className="font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {format(meetingDate, "HH:mm")}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => {
                                if (confirm('Tem certeza? Só é possível cancelar com 12h de antecedência.')) {
                                    cancelMeeting(myMeeting.id, myMeeting.start_time);
                                }
                            }}
                        >
                            Cancelar Reunião
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    Agendar Mentoria
                </h2>
                <p className="text-sm text-muted-foreground">
                    Escolha um mentor e um horário disponível. Você pode agendar 1 reunião por semana.
                </p>
            </div>

            {mentorsWithSlots.length === 0 && !loading ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nenhum horário disponível</AlertTitle>
                    <AlertDescription>
                        No momento, nenhum mentor disponibilizou horários. Tente novamente mais tarde.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left: Mentor & Calendar Selection */}
                    <div className="md:col-span-5 space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">1. Escolha o Mentor</label>
                            <div className="grid grid-cols-1 gap-2">
                                {mentorsWithSlots.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMentorId(m.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-muted text-left",
                                            selectedMentorId === m.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                                        )}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedMentorId && (
                            <div className="space-y-3 animate-in slide-in-from-left-2 duration-300">
                                <label className="text-sm font-medium">2. Escolha a Data</label>
                                <div className="border rounded-lg p-3 bg-card">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        locale={ptBR}
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        className="w-full flex justify-center"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Slots Selection */}
                    <div className="md:col-span-7">
                        {selectedMentorId && selectedDate ? (
                            <div className="space-y-4 animate-in fade-in duration-500">
                                <label className="text-sm font-medium">3. Horários Disponíveis</label>

                                {visibleSlots.length === 0 ? (
                                    <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                                        Nenhum horário livre para esta data.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {visibleSlots.map(slot => (
                                            <Dialog key={slot.id}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="h-auto py-4 flex flex-col gap-1 hover:border-primary hover:text-primary"
                                                        onClick={() => setBookingSlot(slot)}
                                                    >
                                                        <span className="text-lg font-bold">
                                                            {format(new Date(slot.start_time), "HH:mm")}
                                                        </span>
                                                        <Badge variant="secondary" className="text-[10px]">60 min</Badge>
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Confirmar Agendamento</DialogTitle>
                                                        <DialogDescription>
                                                            Você está prestes a agendar uma mentoria.
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    <div className="py-4 space-y-4">
                                                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium text-muted-foreground">Horário</p>
                                                                <p className="text-lg font-bold">
                                                                    {format(new Date(slot.start_time), "HH:mm")} - {format(new Date(slot.end_time), "HH:mm")}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-1 text-right">
                                                                <p className="text-sm font-medium text-muted-foreground">Data</p>
                                                                <p className="font-medium">
                                                                    {format(new Date(slot.start_time), "dd/MM/yyyy")}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <Alert variant="destructive">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <AlertTitle className="font-bold">Aviso Importante</AlertTitle>
                                                            <AlertDescription>
                                                                Você pode cancelar esta reunião somente até 12 horas antes do horário marcado.
                                                            </AlertDescription>
                                                        </Alert>
                                                    </div>

                                                    <DialogFooter>
                                                        <Button onClick={() => bookMeeting(slot.id, profile?.name || 'Aluno')} className="w-full md:w-auto">
                                                            Confirmar Reserva
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground border rounded-lg border-dashed bg-muted/20 min-h-[300px]">
                                <p>Selecione um mentor e uma data para ver os horários.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

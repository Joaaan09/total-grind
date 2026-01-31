import React from 'react';
import { User, TrainingBlock, ProgressData } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button } from './ui';
import { Calendar, TrendingUp, Users, Activity, ArrowRight } from 'lucide-react';

interface DashboardProps {
    user: User;
    activeBlocks: TrainingBlock[];
    progressData: ProgressData[];
    onNavigate: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, activeBlocks, progressData, onNavigate }) => {
    // Calcular estadísticas dinámicas: total de sesiones completadas
    const totalSessions = activeBlocks.reduce((acc, block) => {
        return acc + block.weeks.reduce((wAcc, week) => {
            return wAcc + week.days.filter(d => d.isCompleted).length;
        }, 0);
    }, 0);

    // Calcular racha de entrenamiento basada en sesiones
    const streak = totalSessions > 0 ? Math.floor(totalSessions / 2) + 1 : 0;

    // Calcular el Total SBD (Squat + Bench + Deadlift) del historial de progreso
    const getBestLift = (exerciseName: string) => {
        const exercise = progressData.find(p => p.exerciseName === exerciseName);
        if (!exercise || !exercise.history.length) return 0;
        // Usar estimatedMax para el total, con fallback a actualMax
        return Math.max(...exercise.history.map(h => h.estimatedMax || h.actualMax || 0));
    };

    // Usar nombres exactos de levantamientos de competición
    const squat = getBestLift('Comp SQ');
    const bench = getBestLift('Comp BP');
    const deadlift = getBestLift('Comp DL');

    const sbdTotal = squat + bench + deadlift;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Sección de bienvenida con nombre del usuario */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Hola, {user.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-400">Listo para romper tus PRs hoy?</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onNavigate('/profile')}>
                        <Users size={18} className="mr-2" /> Mi perfil
                    </Button>
                </div>
            </div>

            {/* Grid de estadísticas rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-900/20 border-blue-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600/20 text-blue-500 rounded-lg">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Sesiones</p>
                                <p className="text-2xl font-bold text-white">{totalSessions}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-600/20 text-green-500 rounded-lg">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">SBD Total</p>
                                <p className="text-2xl font-bold text-white">{sbdTotal > 0 ? sbdTotal : '-'} <span className="text-sm font-normal text-slate-500">kg</span></p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-600/20 text-purple-500 rounded-lg">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Racha</p>
                                <p className="text-2xl font-bold text-white">{streak} días</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-600/20 text-orange-500 rounded-lg">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Coach</p>
                                <p className="text-xl font-bold text-white truncate max-w-[100px]">
                                    {user.coachId && typeof user.coachId === 'object' ? user.coachId.name : (user.coachId ? 'Entrenador' : '-')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Próximos Entrenamientos */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Próximos Entrenamientos</h2>
                    <Button variant="ghost" size="sm" className="text-blue-500" onClick={() => onNavigate('/training')}>
                        Ver todo <ArrowRight size={16} className="ml-1" />
                    </Button>
                </div>

                {(() => {
                    // Recopilar todos los días pendientes de todos los bloques
                    const pendingDays = activeBlocks.flatMap(block =>
                        block.weeks.flatMap(week =>
                            week.days
                                .filter(day => !day.isCompleted)
                                .map(day => ({ ...day, blockTitle: block.title, blockId: block.id }))
                        )
                    ).slice(0, 5);

                    return pendingDays.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {pendingDays.map((day, index) => (
                                <Card
                                    key={`${day.blockId}-${day.id}`}
                                    className="group cursor-pointer hover:border-blue-500/50 transition-all hover:bg-slate-900"
                                    onClick={() => onNavigate(`/training/${day.blockId}`)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-blue-400 font-medium uppercase tracking-wide mb-1 truncate">
                                                    {day.blockTitle}
                                                </p>
                                                <h3 className="text-lg font-semibold text-white truncate">
                                                    {day.dayName}
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {day.exercises?.length || 0} ejercicios
                                                </p>
                                            </div>
                                            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <ArrowRight size={18} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="border-dashed border-slate-700">
                            <CardContent className="p-8 text-center">
                                <p className="text-slate-500 mb-4">¡Enhorabuena! No tienes entrenamientos pendientes.</p>
                                <Button variant="outline" onClick={() => onNavigate('/training')}>Ver planificación</Button>
                            </CardContent>
                        </Card>
                    );
                })()}
            </section>
        </div>
    );
};
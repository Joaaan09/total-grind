import React, { useState } from 'react';
import { TrainingDay, Exercise, ExerciseSet } from '../types';
import { calculate1RM, TrainingService } from '../services/mockService';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from './ui';
import { CheckCircle2, Circle, Save, Loader2, ChevronLeft, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Props para el componente de sesión de entrenamiento
interface WorkoutSessionProps {
  day: TrainingDay;
  onComplete: () => void;
  onCancel?: () => void;
}

const WorkoutSession: React.FC<WorkoutSessionProps> = ({ day, onComplete, onCancel }) => {
  const { token } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>(day.exercises);
  const [athleteNotes, setAthleteNotes] = useState(day.athleteNotes || '');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSetUpdate = (exerciseId: string, setId: string, field: keyof ExerciseSet, value: string | number) => {
    setExercises(prevExercises => prevExercises.map(ex => {
      if (ex.id !== exerciseId) return ex;

      return {
        ...ex,
        sets: ex.sets.map(set => {
          if (set.id !== setId) return set;

          const updatedSet = { ...set, [field]: value };

          // Calcular automáticamente el 1RM si hay peso y repeticiones
          if ((field === 'weight' || field === 'reps' || field === 'rpe') && (updatedSet.weight || field === 'weight')) {
            const w = field === 'weight' ? Number(value) : Number(updatedSet.weight);
            const r = field === 'reps' ? Number(value) : Number(updatedSet.reps);
            const rpe = field === 'rpe' ? Number(value) : Number(updatedSet.rpe || 10);

            if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
              updatedSet.estimated1rm = calculate1RM(w, r, rpe);
            }
          }

          return updatedSet;
        })
      };
    }));
  };

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    setExercises(prevExercises => prevExercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(set => {
          if (set.id !== setId) return set;
          return { ...set, isCompleted: !set.isCompleted };
        })
      };
    }));
  };

  const handleSave = async () => {
    if (!token) {
      alert("Error: No hay sesión activa");
      return;
    }

    // Validar que TODAS las series tengan peso y reps
    const incompleteSets: string[] = [];
    exercises.forEach(ex => {
      ex.sets.forEach((set, idx) => {
        if (!set.weight || !set.reps) {
          incompleteSets.push(`${ex.name} - Serie ${idx + 1}`);
        }
      });
    });

    if (incompleteSets.length > 0) {
      setValidationError(`Debes rellenar peso y reps en todas las series: ${incompleteSets.slice(0, 3).join(', ')}${incompleteSets.length > 3 ? ` y ${incompleteSets.length - 3} más...` : ''}`);
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    // Preparar el objeto del día actualizado con los ejercicios completados y notas
    const updatedDay: TrainingDay = {
      ...day,
      exercises: exercises,
      athleteNotes: athleteNotes || undefined,
      isCompleted: true
    };

    const success = await TrainingService.updateDay(token, day.id, updatedDay);
    setIsSaving(false);

    if (success) {
      setSessionComplete(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } else {
      alert("Error al guardar la sesión. Revisa la consola o la conexión al backend.");
    }
  };

  // Función para resetear/borrar la sesión
  const handleResetSession = async () => {
    if (!token) return;

    setIsSaving(true);
    // Resetear ejercicios: quitar peso, reps, rpe real y marcar como no completados
    const resetExercises = day.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        ...set,
        weight: undefined,
        reps: undefined,
        rpe: undefined,
        estimated1rm: undefined,
        isCompleted: false
      }))
    }));

    const resetDay: TrainingDay = {
      ...day,
      exercises: resetExercises,
      athleteNotes: undefined,
      isCompleted: false
    };

    const success = await TrainingService.updateDay(token, day.id, resetDay);
    setIsSaving(false);
    setShowResetConfirm(false);

    if (success) {
      onComplete(); // Volver al bloque
    } else {
      alert("Error al borrar la sesión.");
    }
  };

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 animate-in zoom-in-50">
        <div className="h-20 w-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold text-white">¡Entrenamiento Guardado!</h2>
        <p className="text-slate-400">Datos sincronizados con la base de datos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Botón volver */}
      {onCancel && (
        <button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft size={18} />
          <span>Volver al bloque</span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{day.dayName}</h1>
          <p className="text-slate-400 text-sm">Registra tus series reales</p>
        </div>
        <Button onClick={handleSave} className="gap-2" variant="primary" disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Guardar Sesión'}</span>
        </Button>
      </div>

      {/* Mensaje de error de validación */}
      {validationError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{validationError}</p>
        </div>
      )}

      {/* Botón borrar sesión (solo si ya está completada) */}
      {day.isCompleted && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
            onClick={() => setShowResetConfirm(true)}
            disabled={isSaving}
          >
            <Trash2 size={16} />
            Borrar sesión
          </Button>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 size={24} />
              <h3 className="text-xl font-bold text-white">¿Borrar sesión?</h3>
            </div>
            <p className="text-slate-300">
              Se eliminarán todos los datos de esta sesión (peso, reps, notas) y volverá a aparecer como pendiente.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleResetSession}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Borrar sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de salida */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-yellow-400">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold text-white">¿Salir sin guardar?</h3>
            </div>
            <p className="text-slate-300">
              Los datos que hayas introducido en esta sesión se perderán si no los guardas primero.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowExitConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setShowExitConfirm(false);
                  onCancel?.();
                }}
              >
                Salir sin guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Descripción de la sesión (si el entrenador la puso) */}
      {day.description && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">Notas del entrenador:</span> {day.description}
          </p>
        </div>
      )}

      {exercises.map((exercise) => (
        <Card key={exercise.id} className="overflow-hidden border-slate-800 bg-slate-900/40">
          <CardHeader className="bg-slate-900/60 pb-4 border-b border-slate-800">
            <CardTitle className="flex justify-between items-center text-lg text-blue-400">
              {exercise.name}
            </CardTitle>
            {exercise.notes && <p className="text-xs text-slate-500 mt-1">{exercise.notes}</p>}
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-400 uppercase text-sm">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3 min-w-[80px]">Objetivo</th>
                    <th className="p-3 w-20">Kg</th>
                    <th className="p-3 w-16">Reps</th>
                    <th className="p-3 w-16">RPE</th>
                    <th className="p-3 w-16 text-center">e1RM</th>
                    <th className="p-3 w-12 text-center">Ok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {exercise.sets.map((set, index) => (
                    <tr key={set.id} className={set.isCompleted ? "bg-green-900/10" : ""}>
                      <td className="p-3 text-center text-slate-500 font-mono">{index + 1}</td>
                      <td className="p-3 text-slate-400 text-xs">
                        <div className="flex flex-col">
                          <span>{set.targetReps} reps</span>
                          <span className="text-slate-600">@ RPE {set.targetRpe}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-full h-10 px-2 bg-slate-950 border-slate-700 focus:border-blue-500 text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={set.weight || ''}
                          onChange={(e) => handleSetUpdate(exercise.id, set.id, 'weight', e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-full h-10 px-2 bg-slate-950 border-slate-700 focus:border-blue-500 text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={set.reps || ''}
                          onChange={(e) => handleSetUpdate(exercise.id, set.id, 'reps', e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          placeholder="-"
                          max={10}
                          className="w-full h-10 px-2 bg-slate-950 border-slate-700 focus:border-blue-500 text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={set.rpe || ''}
                          onChange={(e) => handleSetUpdate(exercise.id, set.id, 'rpe', e.target.value)}
                        />
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">
                        {set.estimated1rm ? Math.round(set.estimated1rm) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSetComplete(exercise.id, set.id)}
                          className={`p-1 rounded-full transition-colors ${set.isCompleted ? 'text-green-500 bg-green-500/20' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                          {set.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Notas del atleta */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
        <label className="text-sm font-medium text-slate-300">Mis notas de la sesión</label>
        <textarea
          placeholder="Sensaciones, observaciones, fatiga, dolor art..."
          value={athleteNotes}
          onChange={(e) => setAthleteNotes(e.target.value)}
          rows={3}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:border-blue-500 outline-none resize-none"
        />
      </div>

      {/* Botón flotante de guardar para móviles */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-500" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
        </Button>
      </div>
    </div>
  );
};

export default WorkoutSession;
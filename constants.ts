import { TrainingBlock, User, ProgressData } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  email: 'atleta@powerlift.pro',
  name: 'Alex Atleta',
  role: 'athlete',
  coachId: 'c1'
};

export const MOCK_COACH: User = {
  id: 'c1',
  email: 'coach@powerlift.pro',
  name: 'Entrenador Carlos',
  role: 'coach'
};

export const MOCK_PROGRESS: ProgressData[] = [
  {
    exerciseName: 'Comp SQ',
    history: [
      { date: '2023-10-01', estimatedMax: 180, actualMax: 175 },
      { date: '2023-11-01', estimatedMax: 185, actualMax: 180 },
      { date: '2023-12-01', estimatedMax: 190, actualMax: 185 },
      { date: '2024-01-01', estimatedMax: 195, actualMax: 190 },
      { date: '2024-02-01', estimatedMax: 200, actualMax: 195 },
    ]
  },
  {
    exerciseName: 'Comp BP',
    history: [
      { date: '2023-10-01', estimatedMax: 110, actualMax: 105 },
      { date: '2023-11-01', estimatedMax: 112, actualMax: 107 },
      { date: '2023-12-01', estimatedMax: 115, actualMax: 110 },
      { date: '2024-01-01', estimatedMax: 117, actualMax: 112 },
      { date: '2024-02-01', estimatedMax: 120, actualMax: 115 },
    ]
  },
  {
    exerciseName: 'Comp DL',
    history: [
      { date: '2023-10-01', estimatedMax: 210, actualMax: 200 },
      { date: '2023-11-01', estimatedMax: 215, actualMax: 205 },
      { date: '2023-12-01', estimatedMax: 220, actualMax: 210 },
      { date: '2024-01-01', estimatedMax: 225, actualMax: 215 },
      { date: '2024-02-01', estimatedMax: 235, actualMax: 225 },
    ]
  }
];

export const MOCK_BLOCKS: TrainingBlock[] = [
  {
    id: 'b1',
    title: 'Bloque de Hipertrofia',
    ownerId: 'u1',
    source: 'assigned',
    assignedBy: 'Entrenador Carlos',
    startDate: '2023-10-01',
    weeks: [
      {
        id: 'w1',
        blockId: 'b1',
        weekNumber: 1,
        days: [
          {
            id: 'd1',
            weekId: 'w1',
            dayName: 'Día 1: Sentadilla',
            isCompleted: true,
            exercises: [
              {
                id: 'e1',
                dayId: 'd1',
                name: 'Competition Squat',
                sets: [
                  { id: 's1', exerciseId: 'e1', targetReps: '5', targetRpe: 7, reps: 5, weight: 160, rpe: 7, isCompleted: true, estimated1rm: 186 },
                  { id: 's2', exerciseId: 'e1', targetReps: '5', targetRpe: 7, reps: 5, weight: 160, rpe: 7.5, isCompleted: true, estimated1rm: 186 },
                  { id: 's3', exerciseId: 'e1', targetReps: '5', targetRpe: 8, reps: 5, weight: 165, rpe: 8, isCompleted: true, estimated1rm: 192 }
                ]
              },
              {
                id: 'e2',
                dayId: 'd1',
                name: 'Leg Press',
                sets: [
                  { id: 's4', exerciseId: 'e2', targetReps: '10', targetRpe: 8, reps: 10, weight: 200, rpe: 8, isCompleted: true }
                ]
              }
            ]
          },
          {
            id: 'd2',
            weekId: 'w1',
            dayName: 'Día 2: Banca',
            isCompleted: false,
            exercises: [
              {
                id: 'e3',
                dayId: 'd2',
                name: 'Competition Bench Press',
                sets: [
                  { id: 's5', exerciseId: 'e3', targetReps: '6', targetRpe: 7, isCompleted: false },
                  { id: 's6', exerciseId: 'e3', targetReps: '6', targetRpe: 8, isCompleted: false },
                  { id: 's7', exerciseId: 'e3', targetReps: '6', targetRpe: 9, isCompleted: false }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'b2',
    title: 'Bloque Personalizado Fuerza',
    ownerId: 'u1',
    source: 'personal',
    startDate: '2024-03-01',
    weeks: [
      {
        id: 'w2',
        blockId: 'b2',
        weekNumber: 1,
        days: [
          {
            id: 'd3',
            weekId: 'w2',
            dayName: 'Día 1: SBD',
            isCompleted: false,
            exercises: []
          }
        ]
      }
    ]
  }
];
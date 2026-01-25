import { TrainingBlock, ProgressData, TrainingDay, TrainingWeek } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Función auxiliar para transformar _id de Mongo a id recursivamente
const transformId = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(transformId);
  }
  if (data && typeof data === 'object') {
    const { _id, ...rest } = data;
    const newObj = { ...rest };
    if (_id) newObj.id = _id;

    // Procesar claves recursivamente
    for (const key in newObj) {
      if (typeof newObj[key] === 'object') {
        newObj[key] = transformId(newObj[key]);
      }
    }
    return newObj;
  }
  return data;
};

// Función auxiliar para obtener cabeceras de autenticación
const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

export const TrainingService = {
  getBlocks: async (token: string): Promise<TrainingBlock[]> => {
    try {
      const res = await fetch(`${API_URL}/blocks`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch blocks');
      const data = await res.json();
      return transformId(data);
    } catch (error) {
      console.error("Backend not reachable, check console.", error);
      return [];
    }
  },

  getProgress: async (token: string): Promise<ProgressData[]> => {
    try {
      const res = await fetch(`${API_URL}/progress`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch progress');
      const data = await res.json();
      return transformId(data);
    } catch (error) {
      console.error("Backend not reachable", error);
      return [];
    }
  },

  createBlock: async (token: string, blockData: { title: string; source?: string; startDate?: string; weeks?: TrainingWeek[] }): Promise<TrainingBlock | null> => {
    try {
      const res = await fetch(`${API_URL}/blocks`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(blockData)
      });
      if (!res.ok) throw new Error('Failed to create block');
      const data = await res.json();
      return transformId(data);
    } catch (error) {
      console.error("Error creating block", error);
      return null;
    }
  },

  updateBlock: async (token: string, blockId: string, blockData: Partial<TrainingBlock>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/blocks/${blockId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(blockData)
      });
      return res.ok;
    } catch (error) {
      console.error("Error updating block", error);
      return false;
    }
  },

  deleteBlock: async (token: string, blockId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/blocks/${blockId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      return res.ok;
    } catch (error) {
      console.error("Error deleting block", error);
      return false;
    }
  },

  // Actualizar un día específico (usado al guardar una sesión de entrenamiento)
  updateDay: async (token: string, dayId: string, dayData: TrainingDay) => {
    try {
      const res = await fetch(`${API_URL}/days/${dayId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(dayData),
      });
      return res.ok;
    } catch (error) {
      console.error("Error saving day", error);
      return false;
    }
  },
  // ============== INVITACIONES ==============
  getInvites: async (token: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/user/invites`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error("Error fetching invites", error);
      return [];
    }
  },

  acceptInvite: async (token: string, coachId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/user/invites/${coachId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      return res.ok;
    } catch (error) {
      console.error("Error accepting invite", error);
      return false;
    }
  },

  rejectInvite: async (token: string, coachId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/user/invites/${coachId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      return res.ok;
    } catch (error) {
      console.error("Error rejecting invite", error);
      return false;
    }
  },
  // ============== MÉTODOS DE ENTRENADOR ==============

  // Cambiar rol del usuario
  changeRole: async (token: string, role: 'athlete' | 'coach'): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/role`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ role })
      });
      return res.ok;
    } catch (error) {
      console.error("Error changing role", error);
      return false;
    }
  },

  uploadAvatar: async (token: string, file: Blob): Promise<{ success: boolean; url?: string }> => {
    try {
      const formData = new FormData();
      formData.append('avatar', file, 'avatar.jpg');

      const res = await fetch(`${API_URL}/user/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false };
      }
      return { success: true, url: data.profilePicture };
    } catch (error) {
      return { success: false };
    }
  },

  updateProfile: async (token: string, data: { name?: string; profilePicture?: any }): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (error) {
      console.error("Error updating profile", error);
      return false;
    }
  },

  changePassword: async (token: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/user/password`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true };
    } catch (error) {
      console.error("Error changing password", error);
      return { success: false, error: 'Network error' };
    }
  },

  // Obtener atletas del entrenador
  getAthletes: async (token: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/coach/athletes`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error("Error fetching athletes", error);
      return [];
    }
  },

  // Añadir atleta por email
  addAthlete: async (token: string, athleteEmail: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_URL}/coach/athletes`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ athleteEmail })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add athlete');
      }
      return await res.json();
    } catch (error) {
      console.error("Error adding athlete", error);
      throw error;
    }
  },

  // Eliminar atleta
  removeAthlete: async (token: string, athleteId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/coach/athletes/${athleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      return res.ok;
    } catch (error) {
      console.error("Error removing athlete", error);
      return false;
    }
  },

  // Obtener progreso de un atleta
  getAthleteProgress: async (token: string, athleteId: string): Promise<ProgressData[]> => {
    try {
      const res = await fetch(`${API_URL}/coach/athletes/${athleteId}/progress`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return [];
      const data = await res.json();
      return transformId(data);
    } catch (error) {
      console.error("Error fetching athlete progress", error);
      return [];
    }
  },

  // Obtener bloques de un atleta
  getAthleteBlocks: async (token: string, athleteId: string): Promise<TrainingBlock[]> => {
    try {
      const res = await fetch(`${API_URL}/coach/athletes/${athleteId}/blocks`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return [];
      const data = await res.json();
      return transformId(data);
    } catch (error) {
      console.error("Error fetching athlete blocks", error);
      return [];
    }
  },

  // Crear bloque para un atleta
  createBlockForAthlete: async (token: string, athleteId: string, blockData: any): Promise<TrainingBlock | null> => {
    try {
      const res = await fetch(`${API_URL}/coach/athletes/${athleteId}/blocks`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(blockData)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return transformId(data);
    } catch (error) {
      console.error("Error creating block for athlete", error);
      return null;
    }
  }
};

export const calculate1RM = (weight: number, reps: number, rpe: number = 10): number => {
  if (reps === 1 && rpe === 10) return weight;
  // Nueva fórmula: 1RM = Peso * (1 + (Reps + (10 - RPE)) / 30)
  return Math.round(weight * (1 + (reps + (10 - rpe)) / 30));
};
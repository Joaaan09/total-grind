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
  },

  // ============== MÉTODOS DE ADMINISTRADOR ==============

  // Obtener estadísticas del sistema
  getAdminStats: async (token: string): Promise<{ totalUsers: number; totalAthletes: number; totalCoaches: number; totalBlocks: number } | null> => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch admin stats');
      return await res.json();
    } catch (error) {
      console.error("Error fetching admin stats", error);
      return null;
    }
  },

  // Obtener todos los usuarios
  getAllUsers: async (token: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return await res.json();
    } catch (error) {
      console.error("Error fetching users", error);
      return [];
    }
  },

  // Crear usuario (Admin)
  createUser: async (token: string, userData: { email: string; password: string; name: string; role?: string }): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al crear usuario' };
      }
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Error creating user", error);
      return { success: false, error: 'Error de conexión' };
    }
  },

  // Obtener detalle de un usuario
  getUserDetail: async (token: string, userId: string): Promise<any | null> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) throw new Error('Failed to fetch user detail');
      const data = await res.json();
      return {
        ...data,
        blocks: transformId(data.blocks),
        progress: transformId(data.progress)
      };
    } catch (error) {
      console.error("Error fetching user detail", error);
      return null;
    }
  },

  // Modificar usuario
  updateUser: async (token: string, userId: string, userData: { name?: string; email?: string; role?: string }): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(userData)
      });
      return res.ok;
    } catch (error) {
      console.error("Error updating user", error);
      return false;
    }
  },

  // Eliminar usuario
  deleteUser: async (token: string, userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      return res.ok;
    } catch (error) {
      console.error("Error deleting user", error);
      return false;
    }
  },

  // Obtener un bloque específico (Admin)
  getBlockById: async (token: string, blockId: string): Promise<TrainingBlock | null> => {
    try {
      const res = await fetch(`${API_URL}/admin/blocks/${blockId}`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return transformId([data])[0];
    } catch (error) {
      console.error("Error fetching block by id", error);
      return null;
    }
  },

  // Obtener atletas de un entrenador
  getCoachAthletes: async (token: string, coachId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${coachId}/athletes`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error("Error fetching coach athletes", error);
      return [];
    }
  },

  // Asignar atleta a un entrenador
  assignAthleteToCoach: async (token: string, coachId: string, athleteId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${coachId}/athletes`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ athleteId })
      });
      return res.ok;
    } catch (error) {
      console.error("Error assigning athlete to coach", error);
      return false;
    }
  },

  // Quitar atleta de un entrenador
  removeAthleteFromCoach: async (token: string, coachId: string, athleteId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${coachId}/athletes/${athleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      return res.ok;
    } catch (error) {
      console.error("Error removing athlete from coach", error);
      return false;
    }
  },

  // Obtener atletas sin entrenador (para asignar)
  getAvailableAthletes: async (token: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: getAuthHeaders(token)
      });
      if (!res.ok) return [];
      const users = await res.json();
      // Filtrar solo atletas sin coach
      return users.filter((u: any) => u.role === 'athlete' && !u.coachId);
    } catch (error) {
      console.error("Error fetching available athletes", error);
      return [];
    }
  },

  // Crear bloque para un usuario (Admin)
  createBlockForUser: async (token: string, ownerId: string, title: string): Promise<TrainingBlock | null> => {
    try {
      const res = await fetch(`${API_URL}/admin/blocks`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ ownerId, title })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return transformId([data])[0];
    } catch (error) {
      console.error("Error creating block for user", error);
      return null;
    }
  }
};

export const calculate1RM = (weight: number, reps: number, rpe: number = 10): number => {
  if (reps === 1 && rpe === 10) return weight;
  // Nueva fórmula: 1RM = Peso * (1 + (Reps + (10 - RPE)) / 30)
  return Math.round(weight * (1 + (reps + (10 - rpe)) / 30));
};
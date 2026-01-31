import React, { useState, useEffect } from 'react';
import { TrainingService } from '../services/mockService';
import { User, TrainingBlock, ProgressData } from '../types';
import {
    Users,
    BarChart3,
    Trash2,
    Edit2,
    Eye,
    X,
    ChevronDown,
    ChevronRight,
    Dumbbell,
    AlertCircle,
    Check,
    RefreshCw,
    ExternalLink,
    UserPlus,
    UserMinus,
    Plus
} from 'lucide-react';

interface AdminStats {
    totalUsers: number;
    totalAthletes: number;
    totalCoaches: number;
    totalBlocks: number;
}

interface UserListItem {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    profilePicture?: string;
}

interface BestLifts {
    'Comp SQ': { estimated: number; actual: number };
    'Comp BP': { estimated: number; actual: number };
    'Comp DL': { estimated: number; actual: number };
    'Total': { estimated: number; actual: number };
}

interface UserDetail {
    user: UserListItem;
    blocks: TrainingBlock[];
    progress: ProgressData[];
    bestLifts: BestLifts;
}

interface AdminDashboardProps {
    token: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '', role: '' });
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

    // Estados para gestión de atletas de coach
    const [coachAthletes, setCoachAthletes] = useState<any[]>([]);
    const [showAddAthleteModal, setShowAddAthleteModal] = useState(false);
    const [availableAthletes, setAvailableAthletes] = useState<any[]>([]);

    // Estados para crear bloque
    const [showCreateBlockModal, setShowCreateBlockModal] = useState(false);
    const [newBlockTitle, setNewBlockTitle] = useState('');
    const [creatingBlock, setCreatingBlock] = useState(false);

    // Estados para crear usuario
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'athlete' });
    const [creatingUser, setCreatingUser] = useState(false);
    const [createUserError, setCreateUserError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [token]);

    const loadData = async () => {
        setLoading(true);
        const [statsData, usersData] = await Promise.all([
            TrainingService.getAdminStats(token),
            TrainingService.getAllUsers(token)
        ]);
        if (statsData) setStats(statsData);
        setUsers(usersData);
        setLoading(false);
    };

    const viewUserDetail = async (userId: string) => {
        const detail = await TrainingService.getUserDetail(token, userId);
        if (detail) {
            setSelectedUser(detail);
            setEditData({
                name: detail.user.name,
                email: detail.user.email,
                role: detail.user.role
            });
            setShowUserModal(true);

            // Si es coach, cargar sus atletas
            if (detail.user.role === 'coach') {
                const athletes = await TrainingService.getCoachAthletes(token, userId);
                setCoachAthletes(athletes);
            } else {
                setCoachAthletes([]);
            }
        }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        const success = await TrainingService.updateUser(token, selectedUser.user._id, editData);
        if (success) {
            setEditMode(false);
            await loadData();
            // Actualizar el usuario seleccionado
            setSelectedUser({
                ...selectedUser,
                user: { ...selectedUser.user, ...editData }
            });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const success = await TrainingService.deleteUser(token, userId);
        if (success) {
            setConfirmDelete(null);
            setShowUserModal(false);
            await loadData();
        }
    };

    const toggleBlockExpand = (blockId: string) => {
        const newExpanded = new Set(expandedBlocks);
        if (newExpanded.has(blockId)) {
            newExpanded.delete(blockId);
        } else {
            newExpanded.add(blockId);
        }
        setExpandedBlocks(newExpanded);
    };

    // Abrir modal de añadir atleta
    const openAddAthleteModal = async () => {
        const available = await TrainingService.getAvailableAthletes(token);
        setAvailableAthletes(available);
        setShowAddAthleteModal(true);
    };

    // Asignar atleta a coach
    const handleAddAthlete = async (athleteId: string) => {
        if (!selectedUser) return;
        const success = await TrainingService.assignAthleteToCoach(token, selectedUser.user._id, athleteId);
        if (success) {
            // Recargar atletas
            const athletes = await TrainingService.getCoachAthletes(token, selectedUser.user._id);
            setCoachAthletes(athletes);
            setShowAddAthleteModal(false);
        }
    };

    // Quitar atleta de coach
    const handleRemoveAthlete = async (athleteId: string) => {
        if (!selectedUser) return;
        const success = await TrainingService.removeAthleteFromCoach(token, selectedUser.user._id, athleteId);
        if (success) {
            // Actualizar lista
            setCoachAthletes(prev => prev.filter(a => a._id !== athleteId));
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Crear bloque para usuario
    const handleCreateBlock = async () => {
        if (!selectedUser || !newBlockTitle.trim()) return;
        setCreatingBlock(true);
        const block = await TrainingService.createBlockForUser(token, selectedUser.user._id, newBlockTitle);
        if (block) {
            // Recargar detalle del usuario
            const detail = await TrainingService.getUserDetail(token, selectedUser.user._id);
            if (detail) {
                setSelectedUser(detail);
            }
            setShowCreateBlockModal(false);
            setNewBlockTitle('');
        }
        setCreatingBlock(false);
    };

    // Crear usuario
    const handleCreateUser = async () => {
        if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
            setCreateUserError('Todos los campos son requeridos');
            return;
        }
        if (newUserData.password.length < 6) {
            setCreateUserError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setCreatingUser(true);
        setCreateUserError(null);
        const result = await TrainingService.createUser(token, newUserData);
        if (result.success) {
            setShowCreateUserModal(false);
            setNewUserData({ name: '', email: '', password: '', role: 'athlete' });
            await loadData();
        } else {
            setCreateUserError(result.error || 'Error al crear usuario');
        }
        setCreatingUser(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header con estadísticas */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-blue-400" />
                    Panel de Administración
                </h1>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Usuarios"
                        value={stats?.totalUsers || 0}
                        icon={<Users className="w-6 h-6" />}
                        color="blue"
                    />
                    <StatCard
                        title="Atletas"
                        value={stats?.totalAthletes || 0}
                        icon={<Dumbbell className="w-6 h-6" />}
                        color="green"
                    />
                    <StatCard
                        title="Entrenadores"
                        value={stats?.totalCoaches || 0}
                        icon={<Users className="w-6 h-6" />}
                        color="purple"
                    />
                    <StatCard
                        title="Bloques"
                        value={stats?.totalBlocks || 0}
                        icon={<BarChart3 className="w-6 h-6" />}
                        color="orange"
                    />
                </div>
            </div>

            {/* Lista de usuarios */}
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Usuarios Registrados
                    </h2>
                    <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Usuario
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Usuario</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300 hidden md:table-cell">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Rol</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300 hidden md:table-cell">Registro</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map(user => (
                                <tr key={user._id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {user.profilePicture ? (
                                                <img
                                                    src={user.profilePicture}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white font-medium">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-white font-medium">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : user.role === 'coach'
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {user.role === 'admin' ? 'Admin' : user.role === 'coach' ? 'Entrenador' : 'Atleta'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-sm hidden md:table-cell">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => viewUserDetail(user._id)}
                                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                            title="Ver detalle"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No hay usuarios registrados
                    </div>
                )}
            </div>

            {/* Modal de detalle de usuario */}
            {showUserModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header del modal */}
                        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {editMode ? 'Editar Usuario' : 'Detalle de Usuario'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowUserModal(false);
                                    setEditMode(false);
                                }}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-4 md:p-6 space-y-6">
                            {/* Información del usuario */}
                            <div className="bg-slate-700/50 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        {selectedUser.user.profilePicture ? (
                                            <img
                                                src={selectedUser.user.profilePicture}
                                                alt={selectedUser.user.name}
                                                className="w-16 h-16 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-slate-600 flex items-center justify-center text-2xl text-white font-medium">
                                                {selectedUser.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {editMode ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={editData.name}
                                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                    className="bg-slate-600 text-white px-3 py-1.5 rounded-lg w-full"
                                                    placeholder="Nombre"
                                                />
                                                <input
                                                    type="email"
                                                    value={editData.email}
                                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                                    className="bg-slate-600 text-white px-3 py-1.5 rounded-lg w-full"
                                                    placeholder="Email"
                                                />
                                                <select
                                                    value={editData.role}
                                                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                                    className="bg-slate-600 text-white px-3 py-1.5 rounded-lg w-full"
                                                >
                                                    <option value="athlete">Atleta</option>
                                                    <option value="coach">Entrenador</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="text-xl font-bold text-white">{selectedUser.user.name}</h4>
                                                <p className="text-slate-400">{selectedUser.user.email}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${selectedUser.user.role === 'admin'
                                                    ? 'bg-yellow-500/20 text-yellow-400'
                                                    : selectedUser.user.role === 'coach'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {selectedUser.user.role === 'admin' ? 'Admin' : selectedUser.user.role === 'coach' ? 'Entrenador' : 'Atleta'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Solo mostrar botones de editar/eliminar si NO es admin */}
                                    {selectedUser.user.role !== 'admin' && (
                                        <div className="flex gap-2">
                                            {editMode ? (
                                                <>
                                                    <button
                                                        onClick={handleUpdateUser}
                                                        className="p-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                                                    >
                                                        <Check className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditMode(false)}
                                                        className="p-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4 text-white" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditMode(true)}
                                                        className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete(selectedUser.user._id)}
                                                        className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-white" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sección de Atletas (solo para coaches) */}
                            {selectedUser.user.role === 'coach' && (
                                <div className="bg-slate-700/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <Users className="w-5 h-5 text-purple-400" />
                                            Atletas ({coachAthletes.length})
                                        </h4>
                                        <button
                                            onClick={openAddAthleteModal}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors text-sm text-white"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Añadir
                                        </button>
                                    </div>
                                    {coachAthletes.length > 0 ? (
                                        <div className="space-y-2">
                                            {coachAthletes.map(athlete => (
                                                <div key={athlete._id} className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {athlete.profilePicture ? (
                                                            <img
                                                                src={athlete.profilePicture}
                                                                alt={athlete.name}
                                                                className="w-8 h-8 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white font-medium">
                                                                {athlete.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-white font-medium">{athlete.name}</p>
                                                            <p className="text-xs text-slate-400">{athlete.email}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveAthlete(athlete._id)}
                                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                        title="Quitar atleta"
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-center py-4">
                                            Este entrenador no tiene atletas asignados
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Mejores marcas */}
                            <div className="bg-slate-700/50 rounded-xl p-4">
                                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Dumbbell className="w-5 h-5 text-blue-400" />
                                    Mejores Marcas
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <LiftCard title="Squat" data={selectedUser.bestLifts['Comp SQ']} />
                                    <LiftCard title="Bench" data={selectedUser.bestLifts['Comp BP']} />
                                    <LiftCard title="Deadlift" data={selectedUser.bestLifts['Comp DL']} />
                                    <LiftCard title="Total" data={selectedUser.bestLifts['Total']} isTotal />
                                </div>
                            </div>

                            {/* Bloques de entrenamiento */}
                            <div className="bg-slate-700/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-green-400" />
                                        Bloques de Entrenamiento ({selectedUser.blocks.length})
                                    </h4>
                                    <button
                                        onClick={() => setShowCreateBlockModal(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors text-sm text-white"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Crear Bloque
                                    </button>
                                </div>
                                {selectedUser.blocks.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedUser.blocks.map(block => (
                                            <div key={block.id} className="bg-slate-600/50 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => toggleBlockExpand(block.id)}
                                                    className="w-full p-3 flex items-center justify-between hover:bg-slate-600 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expandedBlocks.has(block.id) ? (
                                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                                        )}
                                                        <span className="text-white font-medium">{block.title}</span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${block.source === 'assigned'
                                                            ? 'bg-purple-500/20 text-purple-400'
                                                            : 'bg-blue-500/20 text-blue-400'
                                                            }`}>
                                                            {block.source === 'assigned' ? 'Asignado' : 'Personal'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.location.hash = `/training/${block.id}`;
                                                                setShowUserModal(false);
                                                            }}
                                                            className="p-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                                                            title="Editar bloque"
                                                        >
                                                            <ExternalLink className="w-3 h-3 text-white" />
                                                        </button>
                                                        <span className="text-slate-400 text-sm">
                                                            {block.weeks.length} semanas
                                                        </span>
                                                    </div>
                                                </button>

                                                {expandedBlocks.has(block.id) && (
                                                    <div className="px-3 pb-3 border-t border-slate-500/50">
                                                        {block.weeks.map((week, weekIdx) => (
                                                            <div key={week.id} className="mt-2">
                                                                <p className="text-slate-300 text-sm font-medium mb-1">
                                                                    Semana {weekIdx + 1}
                                                                </p>
                                                                <div className="pl-4 space-y-1">
                                                                    {week.days.map((day, dayIdx) => (
                                                                        <div key={day.id} className="flex items-center gap-2 text-sm">
                                                                            <span className={`w-2 h-2 rounded-full ${day.isCompleted ? 'bg-green-400' : 'bg-slate-500'
                                                                                }`} />
                                                                            <span className="text-slate-400">
                                                                                {day.dayName} - {day.exercises.length} ejercicios
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-center py-4">
                                        Este usuario no tiene bloques de entrenamiento
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-xl font-bold">Confirmar Eliminación</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            ¿Estás seguro de que deseas eliminar este usuario? Esta acción eliminará
                            todos sus datos (bloques, progreso, etc.) y <strong>no se puede deshacer</strong>.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteUser(confirmDelete)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-white"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de añadir atleta */}
            {showAddAthleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-purple-400" />
                                Añadir Atleta
                            </h3>
                            <button
                                onClick={() => setShowAddAthleteModal(false)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        {availableAthletes.length > 0 ? (
                            <div className="space-y-2">
                                {availableAthletes.map(athlete => (
                                    <button
                                        key={athlete._id}
                                        onClick={() => handleAddAthlete(athlete._id)}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        {athlete.profilePicture ? (
                                            <img
                                                src={athlete.profilePicture}
                                                alt={athlete.name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center text-white font-medium">
                                                {athlete.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="text-left">
                                            <p className="text-white font-medium">{athlete.name}</p>
                                            <p className="text-xs text-slate-400">{athlete.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-8">
                                No hay atletas disponibles sin entrenador
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de crear bloque */}
            {showCreateBlockModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-green-400" />
                                Crear Bloque para {selectedUser.user.name}
                            </h3>
                            <button
                                onClick={() => setShowCreateBlockModal(false)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Nombre del Bloque</label>
                                <input
                                    type="text"
                                    value={newBlockTitle}
                                    onChange={(e) => setNewBlockTitle(e.target.value)}
                                    placeholder="Ej: Fase de Fuerza"
                                    className="w-full bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:border-green-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowCreateBlockModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateBlock}
                                    disabled={!newBlockTitle.trim() || creatingBlock}
                                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                                >
                                    {creatingBlock ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Crear
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de crear usuario */}
            {showCreateUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-400" />
                                Crear Usuario
                            </h3>
                            <button
                                onClick={() => {
                                    setShowCreateUserModal(false);
                                    setCreateUserError(null);
                                    setNewUserData({ name: '', email: '', password: '', role: 'athlete' });
                                }}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {createUserError && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {createUserError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Nombre</label>
                                <input
                                    type="text"
                                    value={newUserData.name}
                                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                                    placeholder="Nombre completo"
                                    className="w-full bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newUserData.email}
                                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="w-full bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Contraseña</label>
                                <input
                                    type="password"
                                    value={newUserData.password}
                                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Rol</label>
                                <select
                                    value={newUserData.role}
                                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                                    className="w-full bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="athlete">Atleta</option>
                                    <option value="coach">Entrenador</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowCreateUserModal(false);
                                        setCreateUserError(null);
                                        setNewUserData({ name: '', email: '', password: '', role: 'athlete' });
                                    }}
                                    className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateUser}
                                    disabled={creatingUser}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                                >
                                    {creatingUser ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Crear
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para tarjetas de estadísticas
const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };

    return (
        <div className={`${colors[color]} border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
                {icon}
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-slate-400">{title}</p>
        </div>
    );
};

// Componente para mostrar mejores marcas
const LiftCard: React.FC<{
    title: string;
    data: { estimated: number; actual: number };
    isTotal?: boolean;
}> = ({ title, data, isTotal }) => {
    return (
        <div className={`${isTotal ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-600/50'} rounded-lg p-3`}>
            <p className={`text-sm font-medium ${isTotal ? 'text-yellow-400' : 'text-slate-400'} mb-2`}>
                {title}
            </p>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Est:</span>
                    <span className="text-white font-bold">{data.estimated || '-'} kg</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Real:</span>
                    <span className="text-green-400 font-bold">{data.actual || '-'} kg</span>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

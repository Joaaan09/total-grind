import React, { useState } from 'react';
import { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from './ui';
import { User as UserIcon, Mail, Shield, Users, Check, Loader2, Edit2, Save, X, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TrainingService } from '../services/mockService';
import { ChangePasswordModal } from './ChangePasswordModal';

interface ProfileProps {
    user: User;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
    const { token, refreshUser } = useAuth();
    const [isChangingRole, setIsChangingRole] = useState(false);
    const [invites, setInvites] = useState<any[]>([]);

    // Estados para editar el nombre del usuario
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [isSavingName, setIsSavingName] = useState(false);

    // Estado para el modal de cambio de contraseña
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Estados para subir imagen de perfil
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Estado para mostrar mensajes de éxito o error en la subida
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    React.useEffect(() => {
        const loadInvites = async () => {
            if (token && user.role === 'athlete' && !user.coachId) {
                const data = await TrainingService.getInvites(token);
                setInvites(data);
            }
        };
        loadInvites();
    }, [token, user]);

    const handleAcceptInvite = async (coachId: string) => {
        if (!token) return;
        const success = await TrainingService.acceptInvite(token, coachId);
        if (success) {
            if (refreshUser) await refreshUser();
            window.location.reload();
        }
    };

    const handleRejectInvite = async (coachId: string) => {
        if (!token) return;
        const success = await TrainingService.rejectInvite(token, coachId);
        if (success) {
            setInvites(prev => prev.filter(i => i.coachId !== coachId));
        }
    };

    const handleBecomeCoach = async () => {
        if (!token) return;
        setIsChangingRole(true);
        try {
            const success = await TrainingService.changeRole(token, 'coach');
            if (success) {
                // Refrescar los datos del usuario para actualizar el rol
                if (refreshUser) await refreshUser();
                window.location.reload(); // Force reload to update nav
            }
        } catch (error) {
            console.error('Error changing role:', error);
        } finally {
            setIsChangingRole(false);
        }
    };

    const handleBecomeAthlete = async () => {
        if (!token) return;
        setIsChangingRole(true);
        try {
            const success = await TrainingService.changeRole(token, 'athlete');
            if (success) {
                if (refreshUser) await refreshUser();
                window.location.reload();
            }
        } catch (error) {
            console.error('Error changing role:', error);
        } finally {
            setIsChangingRole(false);
        }
    };

    const handleSaveName = async () => {
        if (!token || !editName.trim()) return;
        setIsSavingName(true);
        try {
            const success = await TrainingService.updateProfile(token, { name: editName });
            if (success) {
                if (refreshUser) await refreshUser();
                setIsEditingName(false);
            }
        } catch (error) {
            console.error('Error updating name', error);
        } finally {
            setIsSavingName(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        setUploadStatus(null);
        setIsUploadingImage(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 500;
                const MAX_HEIGHT = 500;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Comprimir a JPEG con calidad 0.7 y subir como Blob
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        setUploadStatus({ type: 'error', message: "Error al procesar imagen." });
                        setIsUploadingImage(false);
                        return;
                    }

                    try {
                        const result = await TrainingService.uploadAvatar(token, blob);
                        if (result.success) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            if (refreshUser) await refreshUser();
                            setUploadStatus({ type: 'success', message: "Foto actualizada." });
                            setTimeout(() => setUploadStatus(null), 3000);
                        } else {
                            setUploadStatus({ type: 'error', message: "Error del servidor." });
                        }
                    } catch (error) {
                        setUploadStatus({ type: 'error', message: "Error de conexión." });
                    } finally {
                        setIsUploadingImage(false);
                    }
                }, 'image/jpeg', 0.7);
            };
        };
    };

    return (
        <>
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white">Perfil de Usuario</h1>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="relative group">
                            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-slate-700">
                                {user.profilePicture ? (
                                    <img
                                        key={`${user.profilePicture}-${user.profilePicture}`}
                                        src={user.profilePicture}
                                        alt="Profile"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <UserIcon size={32} />
                                )}
                            </div>
                            <button
                                className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 text-white shadow-lg hover:bg-blue-500 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingImage}
                            >
                                {isUploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Información del estado de subida */}
                        <div className="absolute -bottom-8 left-0 w-48">
                            {uploadStatus && (
                                <p className={`text-xs font-bold ${uploadStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {uploadStatus.message}
                                </p>
                            )}
                        </div>

                        <div className="flex-1">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="h-8 w-full max-w-[200px]"
                                    />
                                    <Button size="sm" variant="ghost" onClick={handleSaveName} disabled={isSavingName} className="h-8 w-8 p-0 text-green-500">
                                        {isSavingName ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setEditName(user.name); }} disabled={isSavingName} className="h-8 w-8 p-0 text-red-400">
                                        <X size={16} />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <CardTitle>{user.name}</CardTitle>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setEditName(user.name); setIsEditingName(true); }}
                                        className="h-6 w-6 p-0 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                                    >
                                        <Edit2 size={12} />
                                    </Button>
                                </div>
                            )}
                            <p className="text-slate-500">{user.email}</p>
                        </div>
                        <div className="ml-auto">
                            <Badge variant={user.role === 'coach' ? 'default' : 'outline'}>
                                {user.role === 'athlete' ? '🏋️ Atleta' : '👨‍🏫 Entrenador'}
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* Sección de Rol (Entrenador/Atleta) */}
                <Card className={user.role === 'coach' ? 'border-purple-500/30 bg-purple-950/10' : ''}>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            {user.role === 'coach' ? (
                                <>
                                    <Users size={20} className="text-purple-500" /> Panel de Entrenador
                                </>
                            ) : (
                                <>
                                    <Shield size={20} className="text-blue-500" /> Convertirse en Entrenador
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {user.role === 'coach' ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-purple-900/20 rounded-lg border border-purple-800/30">
                                    <Check className="text-purple-400" size={20} />
                                    <div>
                                        <p className="font-medium text-white">Eres Entrenador</p>
                                        <p className="text-sm text-slate-400">
                                            Puedes añadir atletas, crear planificaciones para ellos y ver su progreso.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.location.hash = '/coach'}
                                >
                                    <Users size={18} className="mr-2" /> Ir a Mis Atletas
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-slate-400 hover:text-white"
                                    onClick={handleBecomeAthlete}
                                    disabled={isChangingRole}
                                >
                                    {isChangingRole ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                                    Volver a ser solo Atleta
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400">
                                    Como entrenador podrás:
                                </p>
                                <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                                    <li>Añadir atletas a tu lista</li>
                                    <li>Crear y asignar bloques de entrenamiento</li>
                                    <li>Ver el progreso de cada atleta</li>
                                    <li>Seguir entrenando tú mismo normalmente</li>
                                </ul>
                                <Button
                                    className="w-full"
                                    onClick={handleBecomeCoach}
                                    disabled={isChangingRole}
                                >
                                    {isChangingRole ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" size={16} />
                                            Cambiando...
                                        </>
                                    ) : (
                                        <>
                                            <Users size={18} className="mr-2" />
                                            Convertirme en Entrenador
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Información del entrenador o invitaciones pendientes para atletas */}
                {user.role === 'athlete' && (
                    <>
                        {/* Entrenador activo */}
                        {user.coachId && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Shield size={20} className="text-blue-500" /> Mi Entrenador
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-900/30 text-blue-500 flex items-center justify-center font-bold">
                                                {typeof user.coachId === 'object' ? user.coachId.name.substring(0, 2).toUpperCase() : 'EC'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {typeof user.coachId === 'object' ? user.coachId.name : 'Tu Entrenador'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {typeof user.coachId === 'object' ? user.coachId.email : 'Conectado'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Invitaciones pendientes */}
                        {!user.coachId && invites.length > 0 && (
                            <Card className="border-blue-500/30 bg-blue-950/10">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Mail size={20} className="text-blue-400" /> Invitaciones Pendientes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {invites.map(invite => (
                                        <div key={invite._id || invite.coachId} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                            <div>
                                                <p className="font-medium text-white">{invite.coachName}</p>
                                                <p className="text-xs text-slate-400">Quiere ser tu entrenador</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-400 hover:text-red-300 border-slate-700"
                                                    onClick={() => handleRejectInvite(invite.coachId)}
                                                >
                                                    Rechazar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                                                    onClick={() => handleAcceptInvite(invite.coachId)}
                                                >
                                                    Aceptar
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Configuración</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-between" onClick={() => setIsPasswordModalOpen(true)}>
                            Cambiar Contraseña
                            <ArrowRightIcon />
                        </Button>
                        <Button variant="outline" className="w-full justify-between">
                            Unidades (kg/lbs)
                            <span className="text-slate-500">Metrico (kg)</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
        </>
    );
};

const ArrowRightIcon = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>;
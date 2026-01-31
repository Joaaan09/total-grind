import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TrainingBlockList, BlockDetail } from './components/TrainingBlock';
import { ProgressCharts } from './components/Progress';
import { Profile } from './components/Profile';
import { CoachDashboard } from './components/CoachDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Login, Register } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TrainingService } from './services/mockService';
import { CreateBlockModal } from './components/CreateBlockModal';
import { EditBlockModal } from './components/EditBlockModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TrainingBlock, ProgressData, User } from './types';
import { Loader2 } from 'lucide-react';

// Componente envoltorio para rutas protegidas (requiere autenticación)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Componente envoltorio para páginas de autenticación (redirige al inicio si ya está logueado)
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (isAuthenticated) {
    // Admins go to /admin, others go to /
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
};

// Componente envoltorio para rutas de admin (requiere rol admin)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { user, token } = useAuth();
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Cargar datos (bloques y progreso) cuando el usuario está autenticado
  useEffect(() => {
    const loadData = async () => {
      if (token) {
        const b = await TrainingService.getBlocks(token);
        const p = await TrainingService.getProgress(token);
        setBlocks(b);
        setProgressData(p);
      }
    };
    loadData();
  }, [token]);

  // Refrescar bloques y datos de progreso después de realizar cambios
  const refreshBlocks = async () => {
    if (token) {
      const b = await TrainingService.getBlocks(token);
      const p = await TrainingService.getProgress(token);
      setBlocks(b);
      setProgressData(p);
    }
  };

  // Convertir el usuario del contexto de autenticación al tipo User de la aplicación
  const appUser: User | null = user ? {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    coachId: user.coachId,
    profilePicture: user.profilePicture
  } : null;

  // Envoltorio para la vista de entrenamiento
  const TrainingView = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<TrainingBlock | null>(null);
    const [isRestrictionDialogOpen, setIsRestrictionDialogOpen] = useState(false);
    const [adminLoadedBlock, setAdminLoadedBlock] = useState<TrainingBlock | null>(null);
    const { blockId } = useParams();

    useEffect(() => {
      if (blockId) {
        setSelectedBlockId(blockId);
        // Si es admin y el bloque no está en la lista local, cargarlo
        if (user?.role === 'admin' && token) {
          const localBlock = blocks.find(b => b.id === blockId);
          if (!localBlock) {
            TrainingService.getBlockById(token, blockId).then(remoteBlock => {
              if (remoteBlock) {
                setAdminLoadedBlock(remoteBlock);
              }
            });
          }
        }
      } else {
        setSelectedBlockId(null);
        setAdminLoadedBlock(null);
      }
    }, [blockId, user?.role, token, blocks]);

    if (selectedBlockId) {
      // Primero buscar en bloques locales, luego en el bloque cargado por admin
      const block = blocks.find(b => b.id === selectedBlockId) || adminLoadedBlock;
      if (!block) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando bloque...</div>;

      return (
        <>
          <BlockDetail
            block={block}
            onBack={() => {
              setSelectedBlockId(null);
              setAdminLoadedBlock(null);
              // Admin vuelve a /admin, otros usuarios a /training
              window.location.hash = user?.role === 'admin' ? '/admin' : '/training';
            }}
            onEdit={(b) => setEditingBlock(b)}
            onRefresh={refreshBlocks}
          />
          {editingBlock && (
            <EditBlockModal
              isOpen={!!editingBlock}
              block={editingBlock}
              onClose={() => setEditingBlock(null)}
              onUpdate={async (id, data) => {
                if (token) {
                  await TrainingService.updateBlock(token, id, data);
                  await refreshBlocks();
                }
              }}
              onDelete={async (id) => {
                if (token) {
                  await TrainingService.deleteBlock(token, id);
                  await refreshBlocks();
                  setSelectedBlockId(null);
                  window.location.hash = '/training';
                }
              }}
            />
          )}
        </>
      );
    }

    return (
      <>
        <TrainingBlockList
          blocks={blocks}
          onSelectBlock={(id) => window.location.hash = `/training/${id}`}
          onCreateBlock={() => {
            if (appUser?.coachId) {
              setIsRestrictionDialogOpen(true);
            } else {
              setIsCreateModalOpen(true);
            }
          }}
        />
        <CreateBlockModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={async (blockData) => {
            if (token) {
              await TrainingService.createBlock(token, {
                title: blockData.title!,
                source: blockData.source,
                startDate: blockData.startDate,
                weeks: blockData.weeks
              });
              await refreshBlocks();
            }
          }}
        />
        <ConfirmDialog
          isOpen={isRestrictionDialogOpen}
          onClose={() => setIsRestrictionDialogOpen(false)}
          onConfirm={() => setIsRestrictionDialogOpen(false)}
          title="Acción Restringida"
          message="No puedes crear bloques propios porque tienes un entrenador asignado. Contacta con tu entrenador para solicitar cambios en tu planificación."
          confirmText="Entendido"
          cancelText="Cerrar"
          type="info"
        />
      </>
    );
  };

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Rutas de autenticación */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              {authMode === 'login'
                ? <Login onSwitchToRegister={() => setAuthMode('register')} />
                : <Register onSwitchToLogin={() => setAuthMode('login')} />
              }
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <Register onSwitchToLogin={() => setAuthMode('login')} />
            </AuthRoute>
          }
        />

        {/* Rutas protegidas (requiere inicio de sesión) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {/* Redirigir admins a /admin */}
              {user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Layout>
                  <Dashboard
                    user={appUser!}
                    activeBlocks={blocks}
                    progressData={progressData}
                    onNavigate={(path) => window.location.hash = path}
                  />
                </Layout>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/:blockId?"
          element={
            <ProtectedRoute>
              <Layout>
                <TrainingView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Layout>
                <ProgressCharts data={progressData} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile user={appUser!} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute>
              <Layout>
                <CoachDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Layout>
                <AdminDashboard token={token || ''} />
              </Layout>
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
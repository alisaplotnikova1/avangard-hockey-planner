import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { LoginScreen } from '@/components/LoginScreen';
import { Dashboard } from '@/components/Dashboard';

function AppContent() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-sm">Загрузка…</p>
      </div>
    );
  }

  if (!profile) return <LoginScreen />;
  return <Dashboard />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

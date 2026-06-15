import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { Dashboard } from './pages/Dashboard';
import { Emprestimos } from './pages/Emprestimos';
import { ArquivoDigital } from './pages/ArquivoDigital';
import { Digitalizacao } from './pages/Digitalizacao';
import { ArquivoFisico } from './pages/ArquivoFisico';
import { PesquisaAvancada } from './pages/PesquisaAvancada';
import { Relatorios } from './pages/Relatorios';
import { Utilizadores } from './pages/Utilizadores';
import { Instituicoes } from './pages/Instituicoes';
import { Configuracoes } from './pages/Configuracoes';
import { Login } from './pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/emprestimos" element={<ProtectedRoute><Emprestimos /></ProtectedRoute>} />
          <Route path="/arquivo-digital" element={<ProtectedRoute><ArquivoDigital /></ProtectedRoute>} />
          <Route path="/digitalizacao" element={<ProtectedRoute><Digitalizacao /></ProtectedRoute>} />
          <Route path="/arquivo-fisico" element={<ProtectedRoute><ArquivoFisico /></ProtectedRoute>} />
          <Route path="/pesquisa" element={<ProtectedRoute><PesquisaAvancada /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
          <Route path="/utilizadores" element={<ProtectedRoute><Utilizadores /></ProtectedRoute>} />
          <Route path="/instituicoes" element={<ProtectedRoute><Instituicoes /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
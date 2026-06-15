import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';
import { LogIn, Shield, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ email, password });
      if (res.data) {
        toast.success('Bem-vindo ao SIGAD!');
        navigate('/');
      } else {
        setError(res.error?.message || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-badge">
            <Shield size={24} />
          </div>
          <h1>SIGAD</h1>
          <p>Sistema Integrado de Gestão de Arquivos</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="admin@minplan.gov.ao" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Palavra-passe</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="error-badge">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <LogIn size={18} style={{ marginRight: '8px' }} />
                Entrar no Sistema
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          Versão 1.0.0 · © 2026 SIGAD Digital
        </div>
      </div>

      <style>{`
        .login-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #09090b;
          background-image: radial-gradient(circle at 50% 50%, #1c1c21 0%, #09090b 100%);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          background: #121215;
          border: 1px solid #27272a;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo-badge {
          width: 48px;
          height: 48px;
          background: var(--accent);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 0 20px rgba(255, 78, 0, 0.3);
        }
        .login-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .login-header p {
          color: #a1a1aa;
          font-size: 14px;
        }
        .error-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .btn-block {
          width: 100%;
          height: 44px;
          justify-content: center;
        }
        .login-footer {
          margin-top: 32px;
          text-align: center;
          color: #3f3f46;
          font-size: 12px;
        }
        .form-input {
          background: #1c1c21;
          border-color: #27272a;
          color: white;
        }
        .form-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(255, 78, 0, 0.1);
        }
        .form-label {
          color: #a1a1aa;
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { UserPlus, Circle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { NewUserModal } from '../components/dashboard/NewUserModal';

export function Utilizadores() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<any[]>('/users');
      if (res.data) setUsers(res.data);
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <Layout title="Utilizadores" subtitle="Gestão de acessos e permissões">
      <div className="view active">
        <div className="card">
          <div className="card-title">
            Utilizadores do Sistema 
            <button 
              className="btn btn-primary btn-sm" 
              style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setIsModalOpen(true)}
            >
              <UserPlus size={14} /> Adicionar
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} className="animate-spin" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Perfil</th>
                    <th>Departamento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.nome}</strong></td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`tag tag-${user.role_id === 1 ? 'secreto' : 'digital'}`}>
                          {user.role_nome || `Perfil ${user.role_id}`}
                        </span>
                      </td>
                      <td>{user.departamento_nome || '—'}</td>
                      <td>
                        <span style={{ color: user.ativo ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Circle size={8} fill={user.ativo ? 'var(--green)' : 'var(--red)'} /> 
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Nenhum utilizador encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <NewUserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUsers}
      />
    </Layout>
  );
}

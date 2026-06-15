import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { Building2, Circle, Loader2, Plus } from 'lucide-react';
import { NewInstitutionModal } from '../components/dashboard/NewInstitutionModal';

interface Instituicao {
  id: number;
  codigo: string;
  nome: string;
  sigla?: string;
  storage_limit_gb?: number;
  storage_used_bytes?: number;
  ativo?: boolean;
}

export function Instituicoes() {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await api.request<Instituicao[]>('/institutions');
    if (res.data) {
      setInstituicoes(res.data);
    } else {
      setError(res.error?.message || 'Sem permissao para listar instituicoes.');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatStorage = (bytes = 0, limit = 0) => {
    const usedGb = bytes / 1024 / 1024 / 1024;
    return `${usedGb.toFixed(2)} GB / ${limit || 0} GB`;
  };

  return (
    <Layout title="Instituicoes" subtitle="Plataforma multi-institucional">
      <div className="view active">
        <div className="card">
          <div className="card-title">
            Instituicoes na Plataforma
            <button 
              className="btn btn-primary btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px' }}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={14} /> Nova Instituicao
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Instituicao</th><th>Codigo</th><th>Armazenamento</th><th>Estado</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></td></tr>
                ) : instituicoes.map((inst) => (
                  <tr key={inst.id}>
                    <td><strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={14} /> {inst.nome}</strong></td>
                    <td>{inst.codigo}</td>
                    <td>{formatStorage(inst.storage_used_bytes, inst.storage_limit_gb)}</td>
                    <td>
                      <span style={{ color: inst.ativo === false ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Circle size={8} fill={inst.ativo === false ? 'var(--red)' : 'var(--green)'} />
                        {inst.ativo === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && instituicoes.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>{error || 'Nenhuma instituicao cadastrada.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewInstitutionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </Layout>
  );
}

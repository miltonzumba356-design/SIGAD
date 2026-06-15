import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { FileBarChart, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Relatorio {
  id: number;
  tipo: string;
  estado?: string;
  caminho_ficheiro?: string;
  usuario_nome?: string;
  created_at?: string;
}

export function Relatorios() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('RESUMO_DOCUMENTOS');

  const loadData = async () => {
    setLoading(true);
    const res = await api.request<Relatorio[]>('/reports');
    if (res.data) setRelatorios(res.data);
    else toast.error(res.error?.message || 'Erro ao carregar relatorios');
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const gerar = async () => {
    const res = await api.request('/reports', {
      method: 'POST',
      body: JSON.stringify({ name: tipo, type: tipo, filters: {} })
    });

    if (res.data) {
      toast.success('Geracao de relatorio iniciada');
      loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao gerar relatorio');
    }
  };

  return (
    <Layout title="Relatorios" subtitle="Geracao e historico de relatorios">
      <div className="view active">
        <div className="two-col">
          <div className="card">
            <div className="section-title"><FileBarChart size={16} /> Gerar Relatorio</div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="RESUMO_DOCUMENTOS">Resumo de documentos</option>
                <option value="EMPRESTIMOS">Emprestimos</option>
                <option value="DIGITALIZACAO">Digitalizacao</option>
                <option value="AUDITORIA">Auditoria</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={gerar}><Plus size={14} style={{ marginRight: '8px' }} /> Gerar</button>
            </div>
          </div>

          <div className="card">
            <div className="section-title"><FileBarChart size={16} /> Relatorios Gerados</div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Tipo</th><th>Estado</th><th>Usuario</th><th>Data</th><th>Ficheiro</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></td></tr>
                  ) : relatorios.map(relatorio => (
                    <tr key={relatorio.id}>
                      <td>{relatorio.tipo}</td>
                      <td><span className={`tag ${relatorio.estado === 'CONCLUIDO' ? 'tag-disponivel' : 'tag-publico'}`}>{relatorio.estado}</span></td>
                      <td>{relatorio.usuario_nome || '-'}</td>
                      <td>{relatorio.created_at ? new Date(relatorio.created_at).toLocaleString() : '-'}</td>
                      <td>{relatorio.caminho_ficheiro || '-'}</td>
                    </tr>
                  ))}
                  {!loading && relatorios.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Nenhum relatorio gerado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

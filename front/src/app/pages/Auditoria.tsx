import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { History, Loader2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  usuario_id?: number;
  usuario_nome?: string;
  acao: string;
  entidade: string;
  entidade_id?: number;
  detalhes?: string;
  ip_address?: string;
  created_at: string;
}

function parseDetalhes(detalhes?: string): { status_code?: number; method?: string; url?: string } {
  if (!detalhes) return {};
  try {
    return JSON.parse(detalhes);
  } catch {
    return {};
  }
}

export function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ acao: '', entidade: '', start_date: '', end_date: '' });

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.acao) params.append('acao', filters.acao);
    if (filters.entidade) params.append('entidade', filters.entidade);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const res = await api.request<AuditLog[]>(`/audit?${params.toString()}`);
    if (res.data) setLogs(res.data);
    else toast.error(res.error?.message || 'Erro ao carregar auditoria');
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout title="Auditoria do Sistema" subtitle="Registo de ações realizadas por utilizadores na plataforma">
      <div className="view active">
        <div className="card">
          <div className="section-title"><Filter size={16} /> Filtros</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ação</label>
              <input className="form-input" value={filters.acao} onChange={e => setFilters({ ...filters, acao: e.target.value })} placeholder="Ex: CRIAR_PASTA" />
            </div>
            <div className="form-group">
              <label className="form-label">Entidade</label>
              <select className="form-input" value={filters.entidade} onChange={e => setFilters({ ...filters, entidade: e.target.value })}>
                <option value="">Todas</option>
                <option value="documento">Documento</option>
                <option value="pasta">Pasta</option>
                <option value="localizacao_fisica">Localização Física</option>
                <option value="emprestimo">Empréstimo</option>
                <option value="digitalizacao">Digitalização</option>
                <option value="sessao">Sessão / Autenticação</option>
                <option value="instituicao">Instituição</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">De</label>
              <input type="date" className="form-input" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Até</label>
              <input type="date" className="form-input" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={loadData}>
              <Search size={14} style={{ marginRight: '8px' }} /> Filtrar
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><History size={16} /> Últimas Ações Registadas</div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Utilizador</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>Estado</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const detalhes = parseDetalhes(log.detalhes);
                    return (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.usuario_nome || 'Sistema'}</td>
                        <td><span className="tag tag-publico">{log.acao}</span></td>
                        <td>{log.entidade}{log.entidade_id ? ` #${log.entidade_id}` : ''}</td>
                        <td>
                          {detalhes.status_code ? (
                            <span style={{ color: detalhes.status_code < 300 ? 'var(--green)' : 'var(--red)' }}>
                              {detalhes.method} {detalhes.status_code}
                            </span>
                          ) : '-'}
                        </td>
                        <td>{log.ip_address || '-'}</td>
                      </tr>
                    );
                  })}
                  {!loading && logs.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Nenhum registo de auditoria encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

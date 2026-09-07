import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { 
  Files, 
  Archive, 
  Cloud, 
  ClipboardCheck, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  ArrowRight,
  TrendingUp,
  FileText,
  FileBox,
  Image as ImageIcon
} from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, docsRes] = await Promise.all([
          api.request<any>('/documents/stats'),
          api.getDocumentos({ limit: 5 })
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (docsRes.data) setRecentDocs(docsRes.data);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return <Layout title="Dashboard" subtitle="A carregar dados..."><div className="view active">A carregar...</div></Layout>;
  }

  return (
    <Layout
      title="Dashboard"
      subtitle={`Visão geral do sistema · Atualizado às ${new Date().toLocaleTimeString()}`}
    >
      <div className="view active">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon"><Files size={24} /></div>
            <div className="kpi-label">Total Documentos</div>
            <div className="kpi-value">{stats?.total || 0}</div>
            <div className="kpi-change"><TrendingUp size={12} style={{ marginRight: '4px' }} /> Atualizado</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><Archive size={24} /></div>
            <div className="kpi-label">Arquivos Físicos</div>
            <div className="kpi-value">{stats?.fisicos || 0}</div>
            <div className="kpi-change"><TrendingUp size={12} style={{ marginRight: '4px' }} /> Arquivo Central</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><Cloud size={24} /></div>
            <div className="kpi-label">Digitais / Cloud</div>
            <div className="kpi-value">{stats?.digitalizados || 0}</div>
            <div className="kpi-change"><TrendingUp size={12} style={{ marginRight: '4px' }} /> Cloud Ativa</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><ClipboardCheck size={24} /></div>
            <div className="kpi-label">Em Empréstimo</div>
            <div className="kpi-value">{stats?.emprestimos_ativos || 0}</div>
            <div className="kpi-change red"><AlertTriangle size={12} style={{ marginRight: '4px' }} /> Ver detalhes</div>
          </div>
        </div>

        <div className="three-col">
          <div className="card">
            <div className="card-title">Documentos Recentes <span>Ver todos <ArrowRight size={12} /></span></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Ref</th>
                    <th>Classificação</th>
                    <th>Suporte</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((doc: any) => (
                    <tr key={doc.id}>
                      <td>{doc.titulo}</td>
                      <td><code>DOC-{doc.id}</code></td>
                      <td>
                        <span className={`tag tag-${doc.classificacao?.toLowerCase()}`}>
                          {doc.classificacao}
                        </span>
                      </td>
                      <td>
                        <span className={`tag tag-${doc.suporte?.toLowerCase()}`}>
                          {doc.suporte}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentDocs.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center' }}>Nenhum documento encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Alertas Ativos <span>Ver todos <ArrowRight size={12} /></span></div>
            <div className="alert-item">
              <AlertCircle size={16} className="alert-icon" style={{ color: 'var(--red)' }} />
              <div className="alert-text">
                <strong>{stats?.atrasados || 0} Empréstimos em atraso</strong>
                <small>Ação imediata recomendada</small>
              </div>
            </div>
            <div className="alert-item info">
              <Info size={16} className="alert-icon" style={{ color: 'var(--blue)' }} />
              <div className="alert-text">
                <strong>{stats?.pendentes_dig || 0} docs. pendentes de digitalizar</strong>
                <small>Fila de digitalização ativa</small>
              </div>
            </div>

            <div className="card-title" style={{ marginTop: '18px' }}>Estatísticas da Instituição</div>
            {stats?.porTipo?.map((tipo: any) => (
              <div className="stat-row" key={tipo.nome}>
                <span className="stat-label">{tipo.nome}</span>
                <div className="stat-bar-bg">
                  <div className="stat-bar-fill" style={{ width: `${(tipo.count / stats.total) * 100}%` }}></div>
                </div>
                <span className="stat-val">{tipo.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

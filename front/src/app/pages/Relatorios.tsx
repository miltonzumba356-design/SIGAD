import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { FileBarChart, Loader2, Plus, Eye, Download } from 'lucide-react';
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

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await api.request<Relatorio[]>('/reports');
    if (res.data) setRelatorios(res.data);
    else if (!silent) toast.error(res.error?.message || 'Erro ao carregar relatórios');
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const temPendentes = relatorios.some(relatorio => relatorio.estado === 'GERANDO');
    if (!temPendentes) return;
    const interval = setInterval(() => loadData(true), 3000);
    return () => clearInterval(interval);
  }, [relatorios]);

  const verFicheiro = async (id: number) => {
    const res = await api.blob(`/reports/${id}/file`);
    if (res.data) {
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } else {
      toast.error(res.error?.message || 'Erro ao abrir relatório');
    }
  };

  const baixarFicheiro = async (id: number, tipo: string) => {
    const res = await api.download(`/reports/${id}/file?download=true`, `relatorio_${tipo}.pdf`);
    if (res.error) toast.error(res.error.message || 'Erro ao descarregar relatório');
  };

  const gerar = async () => {
    const res = await api.request('/reports', {
      method: 'POST',
      body: JSON.stringify({ name: tipo, type: tipo, filters: {} })
    });

    if (res.data) {
      toast.success('Geração de relatório iniciada');
      loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao gerar relatório');
    }
  };

  return (
    <Layout title="Relatórios" subtitle="Geração e histórico de relatórios">
      <div className="view active">
        <div className="two-col">
          <div className="card">
            <div className="section-title"><FileBarChart size={16} /> Gerar Relatório</div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="RESUMO_DOCUMENTOS">Resumo de documentos</option>
                <option value="EMPRESTIMOS">Empréstimos</option>
                <option value="DIGITALIZACAO">Digitalização</option>
                <option value="AUDITORIA">Auditoria</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={gerar}><Plus size={14} style={{ marginRight: '8px' }} /> Gerar</button>
            </div>
          </div>

          <div className="card">
            <div className="section-title"><FileBarChart size={16} /> Relatórios Gerados</div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Tipo</th><th>Estado</th><th>Usuário</th><th>Data</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></td></tr>
                  ) : relatorios.map(relatorio => (
                    <tr key={relatorio.id}>
                      <td>{relatorio.tipo}</td>
                      <td>
                        <span className={`tag ${relatorio.estado === 'CONCLUIDO' ? 'tag-disponivel' : relatorio.estado === 'ERRO' ? 'tag-secreto' : 'tag-publico'}`}>
                          {relatorio.estado === 'GERANDO' ? <Loader2 size={11} className="animate-spin" style={{ marginRight: 4, display: 'inline' }} /> : null}
                          {relatorio.estado}
                        </span>
                      </td>
                      <td>{relatorio.usuario_nome || '-'}</td>
                      <td>{relatorio.created_at ? new Date(relatorio.created_at).toLocaleString() : '-'}</td>
                      <td>
                        {relatorio.estado === 'CONCLUIDO' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" title="Visualizar" onClick={() => verFicheiro(relatorio.id)}><Eye size={15} /></button>
                            <button className="btn btn-ghost btn-sm" title="Baixar" onClick={() => baixarFicheiro(relatorio.id, relatorio.tipo)}><Download size={15} /></button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 11 }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && relatorios.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Nenhum relatório gerado.</td></tr>
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

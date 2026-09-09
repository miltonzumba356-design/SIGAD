import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { ShieldQuestion, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Pedido {
  id: number;
  documento_titulo: string;
  usuario_nome: string;
  motivo?: string;
  estado: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  aprovado_por_nome?: string;
  created_at?: string;
}

export function PedidosDownload() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await api.request<Pedido[]>('/download-requests');
    if (res.data) setPedidos(res.data);
    else toast.error(res.error?.message || 'Erro ao carregar pedidos de download');
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const responder = async (id: number, approved: boolean) => {
    setProcessando(id);
    const res = await api.request(`/download-requests/${id}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ approved })
    });
    setProcessando(null);
    if (res.data) {
      toast.success(approved ? 'Pedido aprovado' : 'Pedido rejeitado');
      loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao responder ao pedido');
    }
  };

  const pendentes = pedidos.filter(p => p.estado === 'PENDENTE');
  const historico = pedidos.filter(p => p.estado !== 'PENDENTE');

  return (
    <Layout title="Pedidos de Download" subtitle="Autorizações para descarregar documentos sem marca d'água">
      <div className="view active">
        <div className="card">
          <div className="section-title"><ShieldQuestion size={16} /> Pedidos Pendentes</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Documento</th><th>Solicitante</th><th>Motivo</th><th>Data</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></td></tr>
                ) : pendentes.map(pedido => (
                  <tr key={pedido.id}>
                    <td><strong>{pedido.documento_titulo}</strong></td>
                    <td>{pedido.usuario_nome}</td>
                    <td>{pedido.motivo || '-'}</td>
                    <td>{pedido.created_at ? new Date(pedido.created_at).toLocaleString() : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" disabled={processando === pedido.id} onClick={() => responder(pedido.id, true)}>
                          <Check size={14} style={{ marginRight: 4 }} /> Aprovar
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={processando === pedido.id} onClick={() => responder(pedido.id, false)}>
                          <X size={14} style={{ marginRight: 4 }} /> Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && pendentes.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Nenhum pedido pendente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="section-title"><ShieldQuestion size={16} /> Histórico</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Documento</th><th>Solicitante</th><th>Estado</th><th>Respondido por</th></tr></thead>
              <tbody>
                {historico.map(pedido => (
                  <tr key={pedido.id}>
                    <td>{pedido.documento_titulo}</td>
                    <td>{pedido.usuario_nome}</td>
                    <td>
                      <span style={{ color: pedido.estado === 'APROVADO' ? 'var(--green)' : 'var(--red)' }}>
                        {pedido.estado === 'APROVADO' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </td>
                    <td>{pedido.aprovado_por_nome || '-'}</td>
                  </tr>
                ))}
                {!loading && historico.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Sem histórico de pedidos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

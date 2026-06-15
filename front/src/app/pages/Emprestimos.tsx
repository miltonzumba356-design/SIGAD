import { useEffect, useMemo, useState, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { 
  Send, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Folder, 
  ClipboardList, 
  Loader2, 
  Plus,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { NewLoanModal } from '../components/dashboard/NewLoanModal';
import { ApproveLoanModal } from '../components/dashboard/ApproveLoanModal';
import { toast } from 'sonner';

interface Loan {
  id: number;
  documento_titulo: string;
  usuario_nome: string;
  departamento_nome?: string;
  data_pedido?: string;
  data_prevista_devolucao: string;
  estado: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'DEVOLVIDO';
  motivo?: string;
}

function daysRemaining(date: string) {
  const target = new Date(date).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / 86400000);
}

export function Emprestimos() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  // Verificar permissões do utilizador (mais seguro que IDs fixos)
  const user = JSON.parse(localStorage.getItem('usuario') || '{}');
  
  // Debug: Ver as permissões no console do navegador (F12)

  // Conversão explícita para número para evitar problemas com formatos (Ex: 1.0 ou "1")
  const roleId = Number(user.role_id);
  const canApprove = roleId === 1 || roleId === 2 || user.permissoes?.includes('loans.approve');
  const canReturn = roleId === 1 || roleId === 2 || user.permissoes?.includes('loans.return');


  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await api.request<Loan[]>('/loans');
    if (res.data) setLoans(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReturn = async (id: number) => {
    if (!window.confirm('Confirmar devolução deste documento ao arquivo?')) return;
    
    try {
      const res = await api.request(`/loans/${id}/return`, { method: 'PATCH', body: JSON.stringify({ notes: 'Devolução registrada via painel.' }) });
      if (res.data) {
        toast.success('Devolução registrada com sucesso!');
        loadData();
      }
    } catch (error) {
      toast.error('Erro ao registrar devolução');
    }
  };

  const stats = useMemo(() => ({
    ativos: loans.filter(loan => loan.estado === 'APROVADO').length,
    atrasados: loans.filter(loan => loan.estado === 'APROVADO' && daysRemaining(loan.data_prevista_devolucao) < 0).length,
    pendentes: loans.filter(loan => loan.estado === 'PENDENTE').length
  }), [loans]);

  const activeLoans = loans.filter(loan => loan.estado === 'APROVADO');
  const pendingLoans = loans.filter(loan => loan.estado === 'PENDENTE');

  return (
    <Layout title="Emprestimos e Requisicoes" subtitle="Controlo de saida e devolucao de documentos">
      <div className="view active">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={() => setIsNewModalOpen(true)}>
            <Plus size={16} style={{ marginRight: '8px' }} /> Solicitar Empréstimo
          </button>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon"><Send size={24} /></div>
            <div className="kpi-label">Em Emprestimo</div>
            <div className="kpi-value">{stats.ativos}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><AlertTriangle size={24} /></div>
            <div className="kpi-label">Em Atraso</div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>{stats.atrasados}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><Clock size={24} /></div>
            <div className="kpi-label">Pedidos Pendentes</div>
            <div className="kpi-value" style={{ color: 'var(--accent)' }}>{stats.pendentes}</div>
          </div>
        </div>

        <div className="section-title"><ClipboardList size={16} /> Emprestimos Ativos</div>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></div>
        ) : activeLoans.map((loan) => {
          const days = daysRemaining(loan.data_prevista_devolucao);
          const type = days < 0 ? 'late' : days <= 3 ? 'warn' : 'ok';
          return (
            <div className="loan-card" key={loan.id}>
              <div className="loan-icon">{loan.documento_titulo?.includes('Processo') ? <Folder size={22} /> : <FileText size={22} />}</div>
              <div className="loan-info">
                <div className="loan-title">{loan.documento_titulo}</div>
                <div className="loan-meta">
                  Requisitado por {loan.usuario_nome} {loan.departamento_nome ? `- ${loan.departamento_nome}` : ''} - Saiu: {loan.data_pedido ? new Date(loan.data_pedido).toLocaleDateString() : '-'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="loan-status">
                  <div className={`loan-days ${type}`}>{days}</div>
                  <div className="loan-days-label">dias {days < 0 ? 'em atraso' : 'restantes'}</div>
                </div>
                {canReturn && (
                  <button className="btn btn-ghost btn-sm" title="Registrar Devolução" onClick={() => handleReturn(loan.id)}>
                    <CheckCircle2 size={18} className="text-green" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!loading && activeLoans.length === 0 && (
          <div className="card" style={{ color: 'var(--muted)' }}>Nenhum emprestimo ativo.</div>
        )}

        <div style={{ marginTop: '32px' }}>
          <div className="section-title"><Clock size={16} /> Pedidos Pendentes de Aprovacao</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="card-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Solicitante</th>
                  <th>Data Pedido</th>
                  <th>Devolução Prevista</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoans.map(loan => (
                  <tr key={loan.id}>
                    <td><strong>{loan.documento_titulo}</strong></td>
                    <td>{loan.usuario_nome}</td>
                    <td>{loan.data_pedido ? new Date(loan.data_pedido).toLocaleDateString() : '-'}</td>
                    <td>{new Date(loan.data_prevista_devolucao).toLocaleDateString()}</td>
                    <td>
                      {canApprove ? (
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => { setSelectedLoan(loan); setIsApproveModalOpen(true); }}
                        >
                          Processar <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                        </button>
                      ) : (
                        <span className="tag tag-publico">Aguardando...</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && pendingLoans.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Nenhum pedido pendente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewLoanModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        onSuccess={loadData} 
      />

      <ApproveLoanModal 
        isOpen={isApproveModalOpen} 
        onClose={() => { setIsApproveModalOpen(false); setSelectedLoan(null); }} 
        loan={selectedLoan} 
        onSuccess={loadData} 
      />
    </Layout>
  );
}

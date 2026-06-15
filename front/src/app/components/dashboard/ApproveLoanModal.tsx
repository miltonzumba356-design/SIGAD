import * as React from "react";
import { X, Check, Loader2, Info, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface ApproveLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
  onSuccess?: () => void;
}

export function ApproveLoanModal({ isOpen, onClose, loan, onSuccess }: ApproveLoanModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  if (!isOpen || !loan) return null;

  const handleResponse = async (approved: boolean) => {
    setLoading(true);
    try {
      const res = await api.request(`/loans/${loan.id}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({
          approved,
          notes
        })
      });

      if (res.data) {
        toast.success(`Pedido ${approved ? 'aprovado' : 'rejeitado'} com sucesso!`);
        if (onSuccess) onSuccess();
        onClose();
        setNotes('');
      } else {
        toast.error(res.error?.message || 'Erro ao processar resposta');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="modal-title">
          Processar Pedido de Empréstimo
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="card" style={{ padding: '16px', marginBottom: '20px', border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Info style={{ color: '#3b82f6' }} size={24} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{loan.documento_titulo}</div>
              <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '2px' }}>
                Solicitado por: <strong>{loan.usuario_nome}</strong> em {new Date(loan.data_pedido).toLocaleDateString()}
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                <strong>Motivo:</strong> {loan.motivo || 'Nenhum motivo fornecido.'}
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nota do Administrador</label>
          <textarea 
            className="form-input" 
            rows={3}
            placeholder="Adicione uma nota sobre a entrega ou o motivo da rejeição..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button 
            className="btn btn-ghost" 
            style={{ color: '#ef4444' }} 
            onClick={() => handleResponse(false)} 
            disabled={loading}
          >
            <XCircle size={14} style={{ marginRight: '8px' }} />
            Rejeitar Pedido
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => handleResponse(true)} disabled={loading}>
              {loading ? (
                <Loader2 size={14} className="animate-spin" style={{ marginRight: '8px' }} />
              ) : (
                <Check size={14} style={{ marginRight: '8px' }} />
              )}
              Aprovar e Entregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

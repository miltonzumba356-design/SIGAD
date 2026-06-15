import * as React from "react";
import { X, Send, Search, Loader2, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Documento {
  id: number;
  titulo: string;
  tipo?: string;
}

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewLoanModal({ isOpen, onClose, onSuccess }: NewLoanModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [docs, setDocs] = React.useState<Documento[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDoc, setSelectedDoc] = React.useState<Documento | null>(null);
  const [formData, setFormData] = React.useState({
    return_date: '',
    reason: ''
  });

  React.useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    const res = await api.request<Documento[]>('/documents');
    if (res.data) setDocs(res.data);
  };

  const filteredDocs = docs.filter(doc => 
    doc.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedDoc || !formData.return_date || !formData.reason) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const res = await api.request('/loans', {
        method: 'POST',
        body: JSON.stringify({
          document_id: selectedDoc.id,
          return_date: formData.return_date,
          reason: formData.reason
        })
      });

      if (res.data) {
        toast.success('Solicitação enviada com sucesso!');
        if (onSuccess) onSuccess();
        onClose();
        reset();
      } else {
        toast.error(res.error?.message || 'Erro ao solicitar empréstimo');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedDoc(null);
    setSearchTerm('');
    setFormData({ return_date: '', reason: '' });
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="modal-title">
          Solicitar Empréstimo de Documento
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-group">
          <label className="form-label">Selecionar Documento *</label>
          {!selectedDoc ? (
            <div className="search-container" style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#a1a1aa' }} size={16} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '35px' }}
                  placeholder="Pesquise pelo título do documento..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {searchTerm && (
                <div className="search-results" style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: '1px solid #3f3f46', 
                  borderRadius: '4px',
                  marginTop: '4px',
                  background: '#18181b'
                }}>
                  {filteredDocs.map(doc => (
                    <div 
                      key={doc.id} 
                      className="search-item" 
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #27272a' }}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} style={{ color: '#a1a1aa' }} />
                        <span>{doc.titulo}</span>
                      </div>
                    </div>
                  ))}
                  {filteredDocs.length === 0 && (
                    <div style={{ padding: '8px 12px', color: '#a1a1aa' }}>Nenhum documento encontrado.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText style={{ color: '#3b82f6' }} />
                <strong style={{ fontSize: '14px' }}>{selectedDoc.titulo}</strong>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDoc(null)} style={{ fontSize: '12px' }}>Trocar</button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Data Prevista de Devolução *</label>
          <input 
            type="date" 
            className="form-input" 
            value={formData.return_date}
            onChange={e => setFormData({...formData, return_date: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Motivo do Empréstimo *</label>
          <textarea 
            className="form-input" 
            rows={3}
            placeholder="Descreva o motivo da necessidade do documento..."
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            style={{ resize: 'none' }}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 size={14} className="animate-spin" style={{ marginRight: '8px' }} />
            ) : (
              <Send size={14} style={{ marginRight: '8px' }} />
            )}
            Enviar Solicitação
          </button>
        </div>
      </div>
    </div>
  );
}

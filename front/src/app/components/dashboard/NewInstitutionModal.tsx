import * as React from "react";
import { X, Building2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface NewInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewInstitutionModal({ isOpen, onClose, onSuccess }: NewInstitutionModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    codigo: '',
    nome: '',
    sigla: '',
    admin_email: '',
    storage_limit_gb: 10
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.nome || !formData.codigo) {
      toast.error('Nome e Código são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const res = await api.request('/institutions', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.data) {
        toast.success('Instituição cadastrada com sucesso!');
        if (onSuccess) onSuccess();
        onClose();
        setFormData({ codigo: '', nome: '', sigla: '', admin_email: '', storage_limit_gb: 10 });
      } else {
        toast.error(res.error?.message || 'Erro ao cadastrar instituição');
      }
    } catch (error) {
      toast.error('Erro de conexão com o servidor');
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
          Cadastrar Nova Instituição
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Nome da Instituição *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: Ministério do Planeamento" 
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Sigla</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: MINPLAN" 
              value={formData.sigla}
              onChange={e => setFormData({...formData, sigla: e.target.value})}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Código Único *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: MINPLAN-01" 
              value={formData.codigo}
              onChange={e => setFormData({...formData, codigo: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email do Administrador</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="admin@exemplo.gov.ao" 
              value={formData.admin_email}
              onChange={e => setFormData({...formData, admin_email: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Limite de Armazenamento (GB)</label>
          <input 
            type="number" 
            className="form-input" 
            value={formData.storage_limit_gb}
            onChange={e => setFormData({...formData, storage_limit_gb: Number(e.target.value)})}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 size={14} className="animate-spin" style={{ marginRight: '8px' }} />
            ) : (
              <Building2 size={14} style={{ marginRight: '8px' }} />
            )}
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
}

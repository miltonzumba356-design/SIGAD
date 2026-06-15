import * as React from "react";
import { X, Save, FolderPlus, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parentFolderId?: number | null;
}

export function NewFolderModal({ isOpen, onClose, onSuccess, parentFolderId }: NewFolderModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nome: '',
    codigo: '',
    descricao: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const res = await api.request('/folders', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          pasta_pai_id: parentFolderId
        })
      });

      if (res.data) {
        toast.success('Pasta criada com sucesso!');
        if (onSuccess) onSuccess();
        onClose();
        setFormData({ nome: '', codigo: '', descricao: '' });
      } else {
        toast.error(res.error?.message || 'Erro ao criar pasta');
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
          Criar Nova Pasta
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-group">
          <label className="form-label">Nome da Pasta *</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Ex: Recursos Humanos" 
            value={formData.nome}
            onChange={e => setFormData({...formData, nome: e.target.value})}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Código (Opcional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: RH-2026" 
              value={formData.codigo}
              onChange={e => setFormData({...formData, codigo: e.target.value})}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea 
            className="form-input" 
            rows={3} 
            placeholder="Breve descrição do conteúdo..." 
            style={{ resize: 'none' }}
            value={formData.descricao}
            onChange={e => setFormData({...formData, descricao: e.target.value})}
          ></textarea>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 size={14} className="animate-spin" style={{ marginRight: '8px' }} />
            ) : (
              <FolderPlus size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            )}
            Criar Pasta
          </button>
        </div>
      </div>
    </div>
  );
}

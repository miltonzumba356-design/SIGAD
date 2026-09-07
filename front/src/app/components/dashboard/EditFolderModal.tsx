import * as React from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface EditFolderModalProps {
  folder: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditFolderModal({ folder, isOpen, onClose, onSuccess }: EditFolderModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({ nome: '', codigo: '', descricao: '' });

  React.useEffect(() => {
    if (!folder || !isOpen) return;
    setFormData({
      nome: folder.nome || '',
      codigo: folder.codigo || '',
      descricao: folder.descricao || ''
    });
  }, [folder, isOpen]);

  if (!isOpen || !folder) return null;

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da pasta é obrigatório');
      return;
    }

    setLoading(true);
    const res = await api.request(`/folders/${folder.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
    setLoading(false);

    if (res.data) {
      toast.success('Pasta atualizada com sucesso');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error?.message || 'Erro ao atualizar pasta');
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="modal-title">
          Editar Pasta
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-group">
          <label className="form-label">Nome da Pasta *</label>
          <input
            type="text"
            className="form-input"
            value={formData.nome}
            onChange={e => setFormData({ ...formData, nome: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Código (Opcional)</label>
          <input
            type="text"
            className="form-input"
            value={formData.codigo}
            onChange={e => setFormData({ ...formData, codigo: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-input"
            rows={3}
            style={{ resize: 'none' }}
            value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
          ></textarea>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} /> : <Save size={14} style={{ marginRight: 8 }} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

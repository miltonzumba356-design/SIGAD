import * as React from "react";
import { X, UserPlus, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Role {
  id: number;
  nome: string;
  descricao: string;
}

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewUserModal({ isOpen, onClose, onSuccess }: NewUserModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    role: '',
    active: true
  });

  React.useEffect(() => {
    if (isOpen) {
      api.request<Role[]>('/roles').then(res => {
        if (res.data) setRoles(res.data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    setLoading(true);
    try {
      const res = await api.request('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          role: Number(formData.role)
        })
      });

      if (res.data) {
        toast.success((res.data as any).message || 'Utilizador criado com sucesso!');
        if (onSuccess) onSuccess();
        onClose();
        setFormData({ name: '', email: '', role: '', active: true });
      } else {
        toast.error(res.error?.message || 'Erro ao criar utilizador');
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
          Adicionar Utilizador
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-group">
          <label className="form-label">Nome Completo *</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Ex: João Manuel" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Institucional *</label>
          <input 
            type="email" 
            className="form-input" 
            placeholder="exemplo@sigad.gov.ao" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Perfil / Permissões *</label>
          <select 
            className="form-input" 
            value={formData.role}
            onChange={e => setFormData({...formData, role: e.target.value})}
          >
            <option value="">Selecione um perfil...</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.nome}</option>
            ))}
          </select>
          <small style={{ color: '#a1a1aa', marginTop: '4px', display: 'block', fontSize: '12px' }}>
            {roles.find(r => r.id.toString() === formData.role)?.descricao}
          </small>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 size={14} className="animate-spin" style={{ marginRight: '8px' }} />
            ) : (
              <UserPlus size={14} style={{ marginRight: '8px' }} />
            )}
            Criar Utilizador
          </button>
        </div>
      </div>
    </div>
  );
}

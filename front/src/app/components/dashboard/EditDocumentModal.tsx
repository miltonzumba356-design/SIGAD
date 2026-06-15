import * as React from 'react';
import { X, Save, Upload, Loader2, FileIcon, ScanText } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface EditDocumentModalProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDocumentModal({ document, isOpen, onClose, onSuccess }: EditDocumentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [form, setForm] = React.useState({
    titulo: '',
    tipo: '',
    suporte: 'DIGITAL',
    classificacao: 'PUBLICO',
    data_documento: '',
    notas: ''
  });

  React.useEffect(() => {
    if (!document || !isOpen) return;
    setForm({
      titulo: document.titulo || '',
      tipo: document.tipo || '',
      suporte: document.suporte || 'DIGITAL',
      classificacao: document.classificacao || 'PUBLICO',
      data_documento: document.data_documento || '',
      notas: document.notas || ''
    });
    setFile(null);
  }, [document, isOpen]);

  if (!isOpen || !document) return null;

  const submit = async () => {
    if (!form.titulo.trim()) {
      toast.error('Titulo obrigatorio');
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('titulo', form.titulo);
    data.append('tipo', form.tipo);
    data.append('suporte', form.suporte);
    data.append('classificacao', form.classificacao);
    data.append('data_documento', form.data_documento);
    data.append('notas', form.notas);
    if (file) data.append('file', file);

    const res = await api.request(`/documents/${document.id}`, { method: 'PUT', body: data });
    setLoading(false);

    if (res.data) {
      toast.success(file ? 'Documento atualizado e nova versao indexada' : 'Documento atualizado');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error?.message || 'Erro ao atualizar documento');
    }
  };

  const digitize = async () => {
    setLoading(true);
    const res = await api.raw(`/documents/${document.id}/index`, { method: 'POST' });
    setLoading(false);
    if (res.data) toast.success('Documento digitalizado/indexado com OCR');
    else toast.error(res.error?.message || 'Erro ao digitalizar documento');
  };

  return (
    <div className="modal-overlay open" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="modal">
        <div className="modal-title">
          Editar Documento
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-group">
          <label className="form-label">Titulo</label>
          <input className="form-input" value={form.titulo} onChange={event => setForm({ ...form, titulo: event.target.value })} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <input className="form-input" value={form.tipo} onChange={event => setForm({ ...form, tipo: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Suporte</label>
            <select className="form-input" value={form.suporte} onChange={event => setForm({ ...form, suporte: event.target.value })}>
              <option value="DIGITAL">Digital</option>
              <option value="FISICO">Fisico</option>
              <option value="AMBOS">Digital e fisico</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Classificacao</label>
            <select className="form-input" value={form.classificacao} onChange={event => setForm({ ...form, classificacao: event.target.value })}>
              <option value="PUBLICO">Publico</option>
              <option value="RESTRITO">Restrito</option>
              <option value="CONFIDENCIAL">Confidencial</option>
              <option value="SECRETO">Secreto</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input type="date" className="form-input" value={form.data_documento || ''} onChange={event => setForm({ ...form, data_documento: event.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nova versao / upload digital</label>
          <div className="file-input-wrapper" style={{ position: 'relative' }}>
            <input type="file" className="form-input" style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} onChange={event => setFile(event.target.files?.[0] || null)} />
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface2)' }}>
              {file ? <FileIcon size={14} color="var(--accent)" /> : <Upload size={14} color="var(--muted)" />}
              <span style={{ color: file ? 'white' : 'var(--muted)', fontSize: '11px' }}>
                {file ? file.name : 'Clique para carregar uma nova versao'}
              </span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Observacoes</label>
          <textarea className="form-input" rows={3} value={form.notas || ''} onChange={event => setForm({ ...form, notas: event.target.value })} />
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={digitize} disabled={loading}>
            <ScanText size={14} style={{ marginRight: 8 }} /> Digitalizar/OCR
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} /> : <Save size={14} style={{ marginRight: 8 }} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

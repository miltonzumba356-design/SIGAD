import * as React from "react";
import { X, Save, Upload, Loader2, FileIcon } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  folderId?: number | null;
  physicalLocationId?: number | null;
}

type Support = 'DIGITAL' | 'FISICO' | 'AMBOS';

interface TreeNode {
  id: number;
  nome: string;
  tipo?: string;
  children?: TreeNode[];
}

function flattenLocations(nodes: TreeNode[], prefix = ''): Array<{ id: number; label: string; tipo?: string }> {
  return nodes.flatMap(node => {
    const label = prefix ? `${prefix} / ${node.nome}` : node.nome;
    return [
      { id: node.id, label, tipo: node.tipo },
      ...flattenLocations(node.children || [], label)
    ];
  });
}

function flattenFolders(nodes: any[], prefix = ''): Array<{ id: number; label: string }> {
  return nodes.flatMap(folder => {
    const label = prefix ? `${prefix} / ${folder.nome}` : folder.nome;
    return [
      { id: folder.id, label },
      ...flattenFolders(folder.children || [], label)
    ];
  });
}

export function NewDocumentModal({ isOpen, onClose, onSuccess, folderId, physicalLocationId }: NewDocumentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [folders, setFolders] = React.useState<Array<{ id: number; label: string }>>([]);
  const [locations, setLocations] = React.useState<Array<{ id: number; label: string; tipo?: string }>>([]);
  const [formData, setFormData] = React.useState({
    titulo: '',
    tipo: 'Oficio',
    suporte: 'DIGITAL' as Support,
    classificacao: 'PUBLICO',
    pasta_id: '',
    localizacao_id: '',
    numero_caixa: '',
    condicao: 'GOOD',
    data_documento: new Date().toISOString().split('T')[0],
    descricao: ''
  });

  React.useEffect(() => {
    if (!isOpen) return;

    setFormData(prev => ({
      ...prev,
      pasta_id: folderId ? String(folderId) : prev.pasta_id,
      localizacao_id: physicalLocationId ? String(physicalLocationId) : prev.localizacao_id
    }));

    Promise.all([
      api.request<any[]>('/folders?tree=true'),
      api.request<TreeNode[]>('/physical-archive/tree')
    ]).then(([folderRes, locationRes]) => {
      if (folderRes.data) setFolders(flattenFolders(folderRes.data));
      if (locationRes.data) setLocations(flattenLocations(locationRes.data));
    });
  }, [isOpen, folderId, physicalLocationId]);

  if (!isOpen) return null;

  const needsDigitalFolder = formData.suporte === 'DIGITAL' || formData.suporte === 'AMBOS';
  const needsPhysicalLocation = formData.suporte === 'FISICO' || formData.suporte === 'AMBOS';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      tipo: 'Oficio',
      suporte: 'DIGITAL',
      classificacao: 'PUBLICO',
      pasta_id: '',
      localizacao_id: '',
      numero_caixa: '',
      condicao: 'GOOD',
      data_documento: new Date().toISOString().split('T')[0],
      descricao: ''
    });
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      toast.error('Titulo e obrigatorio');
      return;
    }
    if (needsDigitalFolder && !formData.pasta_id) {
      toast.error('Indique a pasta onde o documento digital sera guardado');
      return;
    }
    if (needsPhysicalLocation && !formData.localizacao_id) {
      toast.error('Indique a localizacao fisica do documento');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.titulo);
      data.append('type', formData.tipo);
      data.append('support', formData.suporte);
      data.append('classification', formData.classificacao);
      data.append('data_documento', formData.data_documento);
      data.append('notas', formData.descricao);
      if (formData.pasta_id) data.append('folder_id', formData.pasta_id);
      if (formData.localizacao_id) data.append('localizacao_id', formData.localizacao_id);
      if (formData.numero_caixa) data.append('numero_caixa', formData.numero_caixa);
      if (formData.condicao) data.append('condicao', formData.condicao);
      if (selectedFile) data.append('file', selectedFile);

      const res = await api.request('/documents', { method: 'POST', body: data });

      if (res.data) {
        toast.success('Documento registado com sucesso');
        onSuccess?.();
        onClose();
        resetForm();
      } else {
        toast.error(res.error?.message || 'Erro ao guardar documento');
      }
    } catch {
      toast.error('Erro de conexao com o servidor');
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
          Registar Novo Documento
          <X className="modal-close" onClick={onClose} size={20} />
        </div>

        <div className="form-group">
          <label className="form-label">Titulo *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Oficio n. 235 - DNVT"
            value={formData.titulo}
            onChange={e => setFormData({ ...formData, titulo: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tipo de Documento *</label>
            <select className="form-input" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
              <option value="Oficio">Oficio</option>
              <option value="Contrato">Contrato</option>
              <option value="Processo">Processo</option>
              <option value="Despacho">Despacho</option>
              <option value="Relatorio">Relatorio</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Suporte *</label>
            <select className="form-input" value={formData.suporte} onChange={e => setFormData({ ...formData, suporte: e.target.value as Support })}>
              <option value="DIGITAL">Digital</option>
              <option value="FISICO">Fisico</option>
              <option value="AMBOS">Digital e fisico</option>
            </select>
          </div>
        </div>

        {needsDigitalFolder && (
          <div className="form-group">
            <label className="form-label">Pasta digital *</label>
            <select className="form-input" value={formData.pasta_id} onChange={e => setFormData({ ...formData, pasta_id: e.target.value })}>
              <option value="">Selecionar pasta</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.label}</option>
              ))}
            </select>
          </div>
        )}

        {needsPhysicalLocation && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Localizacao fisica *</label>
              <select className="form-input" value={formData.localizacao_id} onChange={e => setFormData({ ...formData, localizacao_id: e.target.value })}>
                <option value="">Selecionar edificio / sala / estante / prateleira</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>{location.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Caixa</label>
              <input className="form-input" value={formData.numero_caixa} onChange={e => setFormData({ ...formData, numero_caixa: e.target.value })} placeholder="Ex: CX-03" />
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Classificacao *</label>
            <select className="form-input" value={formData.classificacao} onChange={e => setFormData({ ...formData, classificacao: e.target.value })}>
              <option value="PUBLICO">Publico</option>
              <option value="RESTRITO">Restrito</option>
              <option value="CONFIDENCIAL">Confidencial</option>
              <option value="SECRETO">Secreto</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data do Documento</label>
            <input type="date" className="form-input" value={formData.data_documento} onChange={e => setFormData({ ...formData, data_documento: e.target.value })} />
          </div>
        </div>

        {needsPhysicalLocation && (
          <div className="form-group">
            <label className="form-label">Estado de conservacao</label>
            <select className="form-input" value={formData.condicao} onChange={e => setFormData({ ...formData, condicao: e.target.value })}>
              <option value="GOOD">Bom</option>
              <option value="FAIR">Razoavel</option>
              <option value="DETERIORATED">Deteriorado</option>
            </select>
          </div>
        )}

        {formData.suporte !== 'FISICO' && (
          <div className="form-group">
            <label className="form-label">Ficheiro Digital</label>
            <div className="file-input-wrapper" style={{ position: 'relative' }}>
              <input type="file" className="form-input" style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} onChange={handleFileChange} />
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface2)' }}>
                {selectedFile ? <FileIcon size={14} color="var(--accent)" /> : <Upload size={14} color="var(--muted)" />}
                <span style={{ color: selectedFile ? 'white' : 'var(--muted)', fontSize: '11px' }}>
                  {selectedFile ? selectedFile.name : 'Clique para selecionar um ficheiro'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Observacoes</label>
          <textarea className="form-input" rows={3} placeholder="Notas adicionais..." style={{ resize: 'none' }} value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })}></textarea>
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" style={{ marginRight: '8px' }} /> : <Save size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
            Guardar Documento
          </button>
        </div>
      </div>
    </div>
  );
}

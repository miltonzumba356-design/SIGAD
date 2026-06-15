import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { NewDocumentModal } from '../components/dashboard/NewDocumentModal';
import { SecureDocumentViewer } from '../components/dashboard/SecureDocumentViewer';
import { EditDocumentModal } from '../components/dashboard/EditDocumentModal';
import { api } from '../services/api';
import {
  Archive,
  Building,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  Eye,
  Pencil,
  Plus,
  Save,
  ScanText,
  Trash2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface LocationNode {
  id: number;
  nome: string;
  tipo: 'EDIFICIO' | 'SALA' | 'ESTANTE' | 'PRATELEIRA' | 'CAIXA';
  parent_id?: number | null;
  documentos_count?: number;
  children?: LocationNode[];
}

interface DocumentRow {
  id: number;
  titulo: string;
  tipo?: string;
  suporte?: string;
  classificacao?: string;
  localizacao_nome?: string;
  numero_caixa?: string;
  condicao?: 'GOOD' | 'FAIR' | 'DETERIORATED';
  created_at?: string;
}

const typeLabels: Record<LocationNode['tipo'], string> = {
  EDIFICIO: 'Edificio',
  SALA: 'Sala',
  ESTANTE: 'Estante',
  PRATELEIRA: 'Prateleira',
  CAIXA: 'Caixa'
};

const childType: Record<LocationNode['tipo'], LocationNode['tipo'] | ''> = {
  EDIFICIO: 'SALA',
  SALA: 'ESTANTE',
  ESTANTE: 'PRATELEIRA',
  PRATELEIRA: 'CAIXA',
  CAIXA: ''
};

function flattenLocations(nodes: LocationNode[]): LocationNode[] {
  return nodes.flatMap(node => [node, ...flattenLocations(node.children || [])]);
}

function LocationIcon({ tipo }: { tipo: LocationNode['tipo'] }) {
  if (tipo === 'EDIFICIO') return <Building size={14} />;
  if (tipo === 'SALA') return <Layers size={14} />;
  if (tipo === 'ESTANTE') return <Archive size={14} />;
  return <FolderOpen size={14} />;
}

export function ArquivoFisico() {
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRow | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'EDIFICIO' as LocationNode['tipo'],
    parent_id: '',
    codigo_barras: '',
    capacidade_caixas: ''
  });

  const allLocations = useMemo(() => flattenLocations(tree), [tree]);

  const loadTree = async () => {
    setLoading(true);
    const res = await api.request<LocationNode[]>('/physical-archive/tree');
    if (res.data) {
      setTree(res.data);
      const first = selectedLocation ? flattenLocations(res.data).find(loc => loc.id === selectedLocation.id) : null;
      if (first) setSelectedLocation(first);
    } else {
      toast.error(res.error?.message || 'Erro ao carregar arquivo fisico');
    }
    setLoading(false);
  };

  const loadDocuments = async (locationId: number) => {
    setDocsLoading(true);
    const res = await api.request<DocumentRow[]>(`/documents?localizacao_id=${locationId}`);
    if (res.data) setDocuments(res.data);
    else toast.error(res.error?.message || 'Erro ao carregar documentos');
    setDocsLoading(false);
  };

  useEffect(() => {
    loadTree();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadDocuments(selectedLocation.id);
      const nextType = childType[selectedLocation.tipo];
      setFormData(prev => ({
        ...prev,
        parent_id: String(selectedLocation.id),
        tipo: nextType || selectedLocation.tipo
      }));
    }
  }, [selectedLocation?.id]);

  const handleSelect = (node: LocationNode) => {
    setSelectedLocation(node);
    setLocationName(node.nome);
    setExpandedNodes(prev => ({ ...prev, [node.id]: true }));
  };

  const toggleNode = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleCreateLocation = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da localizacao e obrigatorio');
      return;
    }

    const res = await api.request('/physical-archive', {
      method: 'POST',
      body: JSON.stringify({
        nome: formData.nome,
        tipo: formData.tipo,
        parent_id: formData.parent_id ? Number(formData.parent_id) : undefined,
        codigo_barras: formData.codigo_barras || undefined,
        capacidade_caixas: formData.capacidade_caixas ? Number(formData.capacidade_caixas) : undefined
      })
    });

    if (res.data) {
      toast.success('Localizacao criada com sucesso');
      setFormData(prev => ({ ...prev, nome: '', codigo_barras: '', capacidade_caixas: '' }));
      await loadTree();
    } else {
      toast.error(res.error?.message || 'Erro ao criar localizacao');
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedLocation || !locationName.trim()) return;
    const res = await api.request(`/physical-archive/${selectedLocation.id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome: locationName })
    });
    if (res.data) {
      toast.success('Nome da localizacao atualizado');
      setEditingLocation(false);
      await loadTree();
    } else {
      toast.error(res.error?.message || 'Erro ao atualizar localizacao');
    }
  };

  const openDocument = (doc: DocumentRow) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const editDocument = async (doc: DocumentRow) => {
    const res = await api.getDocumento(doc.id);
    setSelectedDocument(res.data || doc);
    setEditOpen(true);
  };

  const digitizeDocument = async (doc: DocumentRow) => {
    const res = await api.getDocumento(doc.id);
    setSelectedDocument(res.data || doc);
    setEditOpen(true);
    toast.info('Carregue a versao digitalizada no campo de nova versao e guarde.');
  };

  const deleteDocument = async (doc: DocumentRow) => {
    if (!window.confirm(`Enviar "${doc.titulo}" para a reciclagem?`)) return;
    const res = await api.request(`/documents/${doc.id}`, { method: 'DELETE' });
    if (res.data) {
      toast.success('Documento enviado para a reciclagem');
      if (selectedLocation) await loadDocuments(selectedLocation.id);
      await loadTree();
    } else {
      toast.error(res.error?.message || 'Erro ao apagar documento');
    }
  };

  const renderTree = (nodes: LocationNode[]) => nodes.map(node => {
    const hasChildren = Boolean(node.children?.length);
    const expanded = expandedNodes[node.id] ?? true;

    return (
      <div key={node.id}>
        <div className={`tree-node ${selectedLocation?.id === node.id ? 'selected' : ''}`} onClick={() => handleSelect(node)}>
          <div onClick={(e) => hasChildren && toggleNode(node.id, e)} style={{ display: 'flex', alignItems: 'center', width: '14px' }}>
            {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
          </div>
          <LocationIcon tipo={node.tipo} />
          <span style={{ flex: 1 }}>{node.nome}</span>
          <span style={{ color: 'var(--muted)', fontSize: '10px' }}>{typeLabels[node.tipo]}</span>
        </div>
        {hasChildren && expanded && <div className="tree-children">{renderTree(node.children || [])}</div>}
      </div>
    );
  });

  const getConditionLabel = (condition?: string) => {
    if (condition === 'DETERIORATED') return 'Deteriorado';
    if (condition === 'FAIR') return 'Razoavel';
    return 'Bom';
  };

  const getConditionColor = (condition?: string) => {
    if (condition === 'DETERIORATED') return 'var(--red)';
    if (condition === 'FAIR') return 'var(--accent)';
    return 'var(--green)';
  };

  return (
    <Layout title="Arquivo Fisico" subtitle="Edificios, salas, estantes, prateleiras e documentos fisicos">
      <div className="view active">
        <div className="two-col">
          <div className="card">
            <div className="section-title"><Building size={16} /> Localizacao Fisica</div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></div>
            ) : tree.length ? (
              <div className="location-tree">{renderTree(tree)}</div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Nenhuma localizacao cadastrada.</div>
            )}
          </div>

          <div className="card">
            <div className="section-title"><Plus size={16} /> Nova Localizacao</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as LocationNode['tipo'] })}>
                  <option value="EDIFICIO">Edificio</option>
                  <option value="SALA">Sala</option>
                  <option value="ESTANTE">Estante</option>
                  <option value="PRATELEIRA">Prateleira</option>
                  <option value="CAIXA">Caixa</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dentro de</label>
                <select className="form-input" value={formData.parent_id} onChange={e => setFormData({ ...formData, parent_id: e.target.value })}>
                  <option value="">Raiz da instituicao</option>
                  {allLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{typeLabels[loc.tipo]} - {loc.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Edificio Central, Sala A, Estante 01" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Codigo de barras</label>
                <input className="form-input" value={formData.codigo_barras} onChange={e => setFormData({ ...formData, codigo_barras: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="form-group">
                <label className="form-label">Capacidade</label>
                <input type="number" className="form-input" value={formData.capacidade_caixas} onChange={e => setFormData({ ...formData, capacidade_caixas: e.target.value })} placeholder="Caixas" />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreateLocation}><Save size={14} style={{ marginRight: '8px' }} /> Guardar Localizacao</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Documentos em: {selectedLocation?.nome || 'selecione uma localizacao'}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedLocation && (
                <span onClick={() => setEditingLocation(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Pencil size={14} /> Editar Localizacao
                </span>
              )}
              <span onClick={() => setIsDocModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Novo Documento
              </span>
            </div>
          </div>
          {editingLocation && selectedLocation && (
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Nome da localizacao</label>
                <input className="form-input" value={locationName} onChange={e => setLocationName(e.target.value)} />
              </div>
              <div className="form-actions" style={{ alignItems: 'end' }}>
                <button className="btn btn-ghost" onClick={() => setEditingLocation(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleUpdateLocation}><Save size={14} style={{ marginRight: 8 }} /> Guardar</button>
              </div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Caixa</th>
                  <th>Estado</th>
                  <th>Suporte</th>
                  <th>Digital</th>
                  <th style={{ textAlign: 'right' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {docsLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></td></tr>
                ) : documents.map(doc => (
                  <tr key={doc.id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} /> {doc.titulo}</td>
                    <td>{doc.tipo || '-'}</td>
                    <td>{doc.numero_caixa || '-'}</td>
                    <td>
                      <span style={{ color: getConditionColor(doc.condicao), display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Circle size={8} fill={getConditionColor(doc.condicao)} /> {getConditionLabel(doc.condicao)}
                      </span>
                    </td>
                    <td><span className={`tag tag-${doc.suporte?.toLowerCase()}`}>{doc.suporte}</span></td>
                    <td>{doc.suporte === 'DIGITAL' || doc.suporte === 'AMBOS' ? <CheckCircle size={14} style={{ color: 'var(--green)' }} /> : <XCircle size={14} style={{ color: 'var(--muted)' }} />}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" title="Abrir versao digitalizada" onClick={() => openDocument(doc)}><Eye size={15} /></button>
                        <button className="btn btn-ghost btn-sm" title="Editar nome / substituir ficheiro" onClick={() => editDocument(doc)}><Pencil size={15} /></button>
                        <button className="btn btn-ghost btn-sm" title="Digitalizar / carregar versao digital" onClick={() => digitizeDocument(doc)}><ScanText size={15} /></button>
                        <button className="btn btn-ghost btn-sm" title="Apagar" onClick={() => deleteDocument(doc)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!docsLoading && documents.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                      Nenhum documento registado nesta localizacao.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        physicalLocationId={selectedLocation?.id}
        onSuccess={() => {
          if (selectedLocation) loadDocuments(selectedLocation.id);
        }}
      />
      <SecureDocumentViewer
        isOpen={viewerOpen}
        document={selectedDocument}
        onClose={() => setViewerOpen(false)}
      />
      <EditDocumentModal
        isOpen={editOpen}
        document={selectedDocument}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          if (selectedLocation) loadDocuments(selectedLocation.id);
          loadTree();
        }}
      />
    </Layout>
  );
}

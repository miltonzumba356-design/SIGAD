import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../services/api';
import { Printer, CheckCircle, Type, Play, Loader2, Upload, X, ScanLine, Network, FolderOpen, Archive } from 'lucide-react';
import { toast } from 'sonner';

interface FilaItem {
  id: number;
  documento_titulo: string;
  tipo_fila?: 'DIGITAL' | 'FISICA';
  localizacao_nome?: string;
  numero_caixa?: string;
  prioridade?: 'URGENT' | 'NORMAL' | 'LOW';
  estado?: 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDO';
  ocr_texto?: string;
}

interface TreeNode {
  id: number;
  nome: string;
  tipo?: string;
  children?: TreeNode[];
}

interface ScannerDevice {
  id: string;
  name: string;
}

interface DuplicateWarning {
  pending_id: string;
  similarity: number;
  existing_document: {
    id: number;
    titulo: string;
    tipo?: string;
    suporte?: string;
    classificacao?: string;
    pasta_nome?: string;
    localizacao_nome?: string;
    numero_caixa?: string;
  };
  scanned_document: {
    title: string;
    type?: string;
    support?: string;
    classification?: string;
    wordCount: number;
  };
}

type Support = 'DIGITAL' | 'AMBOS';

function flattenTree(nodes: TreeNode[], prefix = ''): Array<{ id: number; label: string }> {
  return nodes.flatMap(node => {
    const label = prefix ? `${prefix} / ${node.nome}` : node.nome;
    return [{ id: node.id, label }, ...flattenTree(node.children || [], label)];
  });
}

export function Digitalizacao() {
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [folders, setFolders] = useState<Array<{ id: number; label: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: number; label: string }>>([]);
  const [scanners, setScanners] = useState<ScannerDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'digital' | 'physical'>('all');
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);
  const [resolvingDuplicate, setResolvingDuplicate] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FilaItem | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    scanner_ip: '',
    title: '',
    type: 'Oficio',
    support: 'AMBOS' as Support,
    classification: 'PUBLICO',
    folder_id: '',
    localizacao_id: '',
    numero_caixa: '',
    condicao: 'GOOD',
    data_documento: new Date().toISOString().split('T')[0],
    notas: ''
  });

  const loadData = async (filter = queueFilter) => {
    setLoading(true);
    const queueParam = filter === 'all' ? '' : `?type=${filter}`;
    const [filaRes, foldersRes, locationsRes] = await Promise.all([
      api.request<FilaItem[]>(`/digitization${queueParam}`),
      api.request<TreeNode[]>('/folders?tree=true'),
      api.request<TreeNode[]>('/physical-archive/tree')
    ]);
    if (filaRes.data) setFila(filaRes.data);
    else toast.error(filaRes.error?.message || 'Erro ao carregar fila de digitalizacao');
    if (foldersRes.data) setFolders(flattenTree(foldersRes.data));
    if (locationsRes.data) setLocations(flattenTree(locationsRes.data));
    setLoading(false);
  };

  const loadScanners = async () => {
    const res = await api.request<ScannerDevice[]>('/digitization/scanners');
    if (res.data) setScanners(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData(queueFilter);
  }, [queueFilter]);

  const stats = useMemo(() => ({
    fisicas: fila.filter(item => item.tipo_fila === 'FISICA').length,
    pendentes: fila.filter(item => item.estado === 'PENDENTE').length,
    concluidos: fila.filter(item => item.estado === 'CONCLUIDO').length,
    ocr: fila.length ? Math.round((fila.filter(item => item.ocr_texto).length / fila.length) * 100) : 0
  }), [fila]);

  const digitalizar = async () => {
    if (!form.scanner_ip.trim() || !form.title.trim()) {
      toast.error('Informe o IP do scanner e o titulo do documento');
      return;
    }
    if (form.support === 'DIGITAL' && !form.folder_id) {
      toast.error('Documento digital deve indicar uma pasta digital');
      return;
    }
    if (form.support === 'AMBOS' && !form.localizacao_id) {
      toast.error('Documento hibrido deve indicar a localizacao fisica');
      return;
    }

    setScanning(true);
    const res = await api.request<{ document_id?: number; wordCount?: number; duplicate?: boolean } & DuplicateWarning>('/digitization/scan', {
      method: 'POST',
      body: JSON.stringify(form)
    });
    setScanning(false);

    if (res.data) {
      if (res.data.duplicate) {
        setDuplicateWarning(res.data);
        toast.warning(`Documento semelhante encontrado (${res.data.similarity}% igual)`);
        return;
      }

      toast.success(`Documento digitalizado e indexado (${res.data.wordCount} palavras)`);
      setForm(prev => ({
        ...prev,
        title: '',
        numero_caixa: '',
        notas: ''
      }));
      setScanModalOpen(false);
      await loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao acionar scanner');
    }
  };

  const resolveDuplicate = async (action: 'KEEP' | 'SUBSTITUTE' | 'IGNORE') => {
    if (!duplicateWarning) return;

    setResolvingDuplicate(true);
    const res = await api.request(`/digitization/scan/${duplicateWarning.pending_id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    setResolvingDuplicate(false);

    if (res.data) {
      const messages = {
        KEEP: 'Documento mantido como novo registo',
        SUBSTITUTE: 'Documento existente substituido',
        IGNORE: 'Digitalizacao ignorada'
      };
      toast.success(messages[action]);
      setDuplicateWarning(null);
      setScanModalOpen(false);
      await loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao resolver duplicidade');
    }
  };

  const assumir = async (id: number) => {
    const res = await api.request(`/digitization/${id}/assume`, { method: 'PATCH' });
    if (res.data) {
      toast.success('Tarefa assumida');
      loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao assumir tarefa');
    }
  };

  const openComplete = (item: FilaItem) => {
    setSelectedItem(item);
    setOcrText(item.ocr_texto || '');
    setFile(null);
  };

  const closeComplete = () => {
    setSelectedItem(null);
    setOcrText('');
    setFile(null);
  };

  const concluir = async () => {
    if (!selectedItem) return;

    setCompleting(true);
    const data = new FormData();
    data.append('ocr_text', ocrText);
    if (file) data.append('file', file);

    const res = await api.request(`/digitization/${selectedItem.id}/complete`, {
      method: 'PATCH',
      body: data
    });

    if (res.data) {
      toast.success('Digitalizacao concluida');
      closeComplete();
      await loadData();
    } else {
      toast.error(res.error?.message || 'Erro ao concluir digitalizacao');
    }
    setCompleting(false);
  };

  return (
    <Layout title="Digitalizacao" subtitle="Scanner de rede, fila de digitalizacao e OCR">
      <div className="view active">
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon"><Printer size={24} /></div>
            <div className="kpi-label">Pendentes</div>
            <div className="kpi-value" style={{ color: 'var(--accent)' }}>{stats.pendentes}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><CheckCircle size={24} /></div>
            <div className="kpi-label">Concluidos</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{stats.concluidos}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><Type size={24} /></div>
            <div className="kpi-label">Com OCR processado</div>
            <div className="kpi-value">{stats.ocr}%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon"><Archive size={24} /></div>
            <div className="kpi-label">Fila fisica</div>
            <div className="kpi-value" style={{ color: 'var(--accent2)' }}>{stats.fisicas}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Fila de Digitalizacao
            <span onClick={() => { setScanModalOpen(true); loadScanners(); }} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ScanLine size={14} /> Nova digitalizacao
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'digital', label: 'Digital' },
              { id: 'physical', label: 'Fisica' }
            ].map(item => (
              <button
                key={item.id}
                className={`btn ${queueFilter === item.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setQueueFilter(item.id as typeof queueFilter)}
                style={{ padding: '6px 12px', fontSize: 11 }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Codigo</th><th>Titulo</th><th>Fila</th><th>Localizacao</th><th>Prioridade</th><th>Estado</th><th>Acao</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" /></td></tr>
                ) : fila.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: "'Space Mono',monospace", color: 'var(--muted)' }}>DIG-{item.id}</td>
                    <td>{item.documento_titulo}</td>
                    <td><span className="tag tag-publico">{item.tipo_fila === 'FISICA' ? 'Fisica' : 'Digital'}</span></td>
                    <td>{[item.localizacao_nome, item.numero_caixa].filter(Boolean).join(' / ') || '-'}</td>
                    <td><span className={`tag ${item.prioridade === 'URGENT' ? 'tag-confidencial' : 'tag-publico'}`}>{item.prioridade || 'NORMAL'}</span></td>
                    <td>{item.estado}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" disabled={item.estado !== 'PENDENTE'} onClick={() => assumir(item.id)} style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Play size={10} fill="currentColor" /> Iniciar
                        </button>
                        <button className="btn btn-ghost" disabled={item.estado === 'CONCLUIDO'} onClick={() => openComplete(item)} style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Upload size={10} /> Concluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && fila.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Nenhum documento na fila de digitalizacao.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {scanModalOpen && (
        <div className="modal-overlay open" onClick={(e) => {
          if (e.target === e.currentTarget && !scanning) setScanModalOpen(false);
        }}>
          <div className="modal" style={{ maxWidth: 780 }}>
            <div className="modal-title">
              Digitalizar novo documento
              <X className="modal-close" onClick={() => !scanning && setScanModalOpen(false)} size={20} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Scanner / impressora</label>
                <div style={{ position: 'relative' }}>
                  <Network size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input className="form-input" value={form.scanner_ip} onFocus={loadScanners} onChange={e => setForm({ ...form, scanner_ip: e.target.value })} placeholder="IP ou nome: HP Smart Tank 580" style={{ paddingLeft: 36 }} />
                </div>
                {scanners.length > 0 && (
                  <select className="form-input" style={{ marginTop: 8 }} value="" onChange={e => setForm({ ...form, scanner_ip: e.target.value })}>
                    <option value="">Selecionar scanner detectado</option>
                    {scanners.map(scanner => (
                      <option key={scanner.id} value={scanner.name || scanner.id}>{scanner.name || scanner.id}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Titulo do documento</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Declaracao de servico" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="Oficio">Oficio</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Processo">Processo</option>
                  <option value="Despacho">Despacho</option>
                  <option value="Relatorio">Relatorio</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Suporte</label>
                <select className="form-input" value={form.support} onChange={e => setForm({ ...form, support: e.target.value as Support })}>
                  <option value="AMBOS">Fisico + Digitalizado</option>
                  <option value="DIGITAL">Apenas digital</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Classificacao</label>
                <select className="form-input" value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value })}>
                  <option value="PUBLICO">Publico</option>
                  <option value="RESTRITO">Restrito</option>
                  <option value="CONFIDENCIAL">Confidencial</option>
                  <option value="SECRETO">Secreto</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><FolderOpen size={12} /> Pasta digital</label>
                <select className="form-input" value={form.folder_id} onChange={e => setForm({ ...form, folder_id: e.target.value })}>
                  <option value="">Selecionar pasta</option>
                  {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label"><Archive size={12} /> Local fisico</label>
                <select className="form-input" value={form.localizacao_id} onChange={e => setForm({ ...form, localizacao_id: e.target.value })}>
                  <option value="">Selecionar localizacao fisica</option>
                  {locations.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Caixa</label>
                <input className="form-input" value={form.numero_caixa} onChange={e => setForm({ ...form, numero_caixa: e.target.value })} placeholder="Ex: CX-02" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data do documento</label>
                <input type="date" className="form-input" value={form.data_documento} onChange={e => setForm({ ...form, data_documento: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado fisico</label>
                <select className="form-input" value={form.condicao} onChange={e => setForm({ ...form, condicao: e.target.value })}>
                  <option value="GOOD">Bom</option>
                  <option value="FAIR">Razoavel</option>
                  <option value="DETERIORATED">Deteriorado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observacoes</label>
              <textarea className="form-input" rows={3} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setScanModalOpen(false)} disabled={scanning}>Cancelar</button>
              <button className="btn btn-primary" onClick={digitalizar} disabled={scanning}>
                {scanning ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} /> : <ScanLine size={14} style={{ marginRight: 8 }} />}
                Digitalizar no scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="modal-overlay open" onClick={(e) => {
          if (e.target === e.currentTarget) closeComplete();
        }}>
          <div className="modal">
            <div className="modal-title">
              Concluir Digitalizacao
              <X className="modal-close" onClick={closeComplete} size={20} />
            </div>

            <div className="form-group">
              <label className="form-label">Documento</label>
              <input className="form-input" value={selectedItem.documento_titulo} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">Ficheiro digitalizado</label>
              <input type="file" className="form-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff,.webp" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>

            <div className="form-group">
              <label className="form-label">Texto OCR</label>
              <textarea className="form-input" rows={6} value={ocrText} onChange={e => setOcrText(e.target.value)} placeholder="Cole aqui o texto reconhecido pelo OCR" />
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" onClick={closeComplete} disabled={completing}>Cancelar</button>
              <button className="btn btn-primary" onClick={concluir} disabled={completing}>
                {completing ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} /> : <CheckCircle size={14} style={{ marginRight: 8 }} />}
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-title">
              Documento duplicado encontrado
              <X className="modal-close" onClick={() => !resolvingDuplicate && setDuplicateWarning(null)} size={20} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="card" style={{ margin: 0 }}>
                <div className="card-title">Documento existente</div>
                <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                  <strong>{duplicateWarning.existing_document?.titulo || 'Sem titulo'}</strong>
                  <span>Tipo: {duplicateWarning.existing_document?.tipo || '-'}</span>
                  <span>Suporte: {duplicateWarning.existing_document?.suporte || '-'}</span>
                  <span>Classificacao: {duplicateWarning.existing_document?.classificacao || '-'}</span>
                  <span>Pasta: {duplicateWarning.existing_document?.pasta_nome || '-'}</span>
                  <span>Local: {[duplicateWarning.existing_document?.localizacao_nome, duplicateWarning.existing_document?.numero_caixa].filter(Boolean).join(' / ') || '-'}</span>
                </div>
              </div>

              <div className="card" style={{ margin: 0 }}>
                <div className="card-title">Nova digitalizacao</div>
                <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                  <strong>{duplicateWarning.scanned_document.title}</strong>
                  <span>Tipo: {duplicateWarning.scanned_document.type || '-'}</span>
                  <span>Suporte: {duplicateWarning.scanned_document.support || '-'}</span>
                  <span>Classificacao: {duplicateWarning.scanned_document.classification || '-'}</span>
                  <span>Palavras OCR: {duplicateWarning.scanned_document.wordCount}</span>
                  <span>Similaridade: {duplicateWarning.similarity}%</span>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-ghost" disabled={resolvingDuplicate} onClick={() => resolveDuplicate('IGNORE')}>
                Ignorar
              </button>
              <button className="btn btn-ghost" disabled={resolvingDuplicate} onClick={() => resolveDuplicate('KEEP')}>
                Manter novo
              </button>
              <button className="btn btn-primary" disabled={resolvingDuplicate} onClick={() => resolveDuplicate('SUBSTITUTE')}>
                {resolvingDuplicate ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} /> : null}
                Substituir existente
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { NewDocumentModal } from '../components/dashboard/NewDocumentModal';
import { NewFolderModal } from '../components/dashboard/NewFolderModal';
import { SecureDocumentViewer } from '../components/dashboard/SecureDocumentViewer';
import { EditDocumentModal } from '../components/dashboard/EditDocumentModal';
import { api } from '../services/api';
import {
  Home,
  Folder,
  Plus,
  FileText,
  Loader2,
  ChevronRight,
  FolderPlus,
  ArrowLeft,
  Eye,
  Pencil,
  Trash2,
  ScanText
} from 'lucide-react';
import { toast } from 'sonner';

export function ArquivoDigital() {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = async (folderId: number | null = null) => {
    setLoading(true);
    try {
      const folderParams = new URLSearchParams();
      if (folderId === null) folderParams.append('raiz', 'true');
      else folderParams.append('pasta_pai_id', folderId.toString());

      const fRes = await api.request<any[]>(`/folders?${folderParams.toString()}`);
      if (fRes.data) setFolders(fRes.data);

      const docParams = new URLSearchParams();
      if (folderId === null) docParams.append('somente_raiz', 'true');
      else docParams.append('pasta_id', folderId.toString());

      const dRes = await api.request<any[]>(`/documents?${docParams.toString()}`);
      if (dRes.data) setDocuments(dRes.data);

      if (folderId) {
        const currentRes = await api.request<any>(`/folders/${folderId}`);
        if (currentRes.data) setCurrentFolder(currentRes.data);
      } else {
        setCurrentFolder(null);
      }
    } catch {
      toast.error('Erro ao carregar arquivo digital');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(null);
  }, []);

  const enterFolder = (folder: any) => {
    setBreadcrumbs([...breadcrumbs, folder]);
    loadData(folder.id);
  };

  const goBack = () => {
    const newBreadcrumbs = [...breadcrumbs];
    newBreadcrumbs.pop();
    setBreadcrumbs(newBreadcrumbs);
    const parentId = newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1].id : null;
    loadData(parentId);
  };

  const goToRoot = () => {
    setBreadcrumbs([]);
    loadData(null);
  };

  const openDocument = (doc: any) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const editDocument = async (doc: any) => {
    const res = await api.getDocumento(doc.id);
    setSelectedDocument(res.data || doc);
    setEditOpen(true);
  };

  const deleteDocument = async (doc: any) => {
    if (!window.confirm(`Enviar "${doc.titulo}" para a reciclagem?`)) return;
    const res = await api.request(`/documents/${doc.id}`, { method: 'DELETE' });
    if (res.data) {
      toast.success('Documento enviado para a reciclagem');
      loadData(currentFolder?.id || null);
    } else {
      toast.error(res.error?.message || 'Erro ao apagar documento');
    }
  };

  const digitizeDocument = async (doc: any) => {
    const res = await api.raw(`/documents/${doc.id}/index`, { method: 'POST' });
    if (res.data) toast.success('Documento digitalizado/indexado com OCR');
    else toast.error(res.error?.message || 'Erro ao digitalizar documento');
  };

  return (
    <Layout title="Arquivo Digital" subtitle="Gestao de documentos e pastas">
      <div className="view active">
        <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <span
            onClick={goToRoot}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: breadcrumbs.length === 0 ? 'var(--accent)' : 'inherit' }}
          >
            <Home size={14} /> Raiz
          </span>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.id}>
              <ChevronRight size={12} color="var(--muted)" />
              <span
                style={{ cursor: i === breadcrumbs.length - 1 ? 'default' : 'pointer', color: i === breadcrumbs.length - 1 ? 'var(--accent)' : 'inherit' }}
                onClick={() => {
                  if (i < breadcrumbs.length - 1) {
                    const nextB = breadcrumbs.slice(0, i + 1);
                    setBreadcrumbs(nextB);
                    loadData(b.id);
                  }
                }}
              >
                {b.nome}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="folder-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="folder-card" style={{ borderStyle: 'dashed', opacity: 0.8, cursor: 'pointer', borderColor: 'var(--accent)' }} onClick={() => setIsFolderModalOpen(true)}>
            <div className="folder-icon" style={{ color: 'var(--accent)' }}><FolderPlus size={28} /></div>
            <div className="folder-name">Nova Pasta</div>
            <div className="folder-count">Organizar</div>
          </div>

          <div className="folder-card" style={{ borderStyle: 'dashed', opacity: 0.8, cursor: 'pointer', borderColor: 'var(--blue)' }} onClick={() => setIsDocModalOpen(true)}>
            <div className="folder-icon" style={{ color: 'var(--blue)' }}><Plus size={28} /></div>
            <div className="folder-name">Novo Documento</div>
            <div className="folder-count">Registrar</div>
          </div>

          {folders.map(folder => (
            <div key={folder.id} className="folder-card" onClick={() => enterFolder(folder)}>
              <div className="folder-icon"><Folder size={28} fill="currentColor" opacity={0.2} /></div>
              <div className="folder-name">{folder.nome}</div>
              <div className="folder-count">{folder.codigo || 'Sem codigo'}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              {currentFolder ? `Conteudo de: ${currentFolder.nome}` : 'Documentos na Raiz'}
            </div>
            {breadcrumbs.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} className="animate-spin" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Titulo</th>
                    <th>Tipo</th>
                    <th>Suporte</th>
                    <th>Classificacao</th>
                    <th>Data</th>
                    <th style={{ textAlign: 'right' }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc: any) => (
                    <tr key={doc.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} style={{ color: doc.suporte === 'DIGITAL' || doc.suporte === 'AMBOS' ? 'var(--blue)' : 'var(--muted)' }} />
                        {doc.titulo}
                      </td>
                      <td>{doc.tipo}</td>
                      <td><span className={`tag tag-${doc.suporte?.toLowerCase()}`}>{doc.suporte}</span></td>
                      <td><span className={`tag tag-${doc.classificacao?.toLowerCase()}`}>{doc.classificacao}</span></td>
                      <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" title="Abrir / ler" onClick={() => openDocument(doc)}><Eye size={15} /></button>
                          <button className="btn btn-ghost btn-sm" title="Editar / upload nova versao" onClick={() => editDocument(doc)}><Pencil size={15} /></button>
                          <button className="btn btn-ghost btn-sm" title="Digitalizar OCR" onClick={() => digitizeDocument(doc)}><ScanText size={15} /></button>
                          <button className="btn btn-ghost btn-sm" title="Apagar" onClick={() => deleteDocument(doc)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Esta pasta nao contem documentos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <NewDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        folderId={currentFolder?.id}
        onSuccess={() => loadData(currentFolder?.id || null)}
      />

      <NewFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        parentFolderId={currentFolder?.id}
        onSuccess={() => loadData(currentFolder?.id || null)}
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
        onSuccess={() => loadData(currentFolder?.id || null)}
      />
    </Layout>
  );
}

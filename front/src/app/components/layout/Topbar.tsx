import { Search, FilePlus, Upload } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onNewDocument: () => void;
  onUpload: () => void;
}

export function Topbar({ title, subtitle, onNewDocument, onUpload }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-title-area">
        <div className="page-title">{title}</div>
        <span className="page-sub">{subtitle || 'Visão geral do sistema · Atualizado agora'}</span>
      </div>
      <div className="topbar-actions">
        <div className="search-container">
          <Search size={14} className="search-icon" />
          <input className="search-bar" placeholder="Pesquisar documentos..." />
        </div>
        <div className="action-buttons">
          <button className="btn btn-ghost" onClick={onNewDocument}>
            <FilePlus size={14} className="btn-icon" />
            <span>Novo Documento</span>
          </button>
          <button className="btn btn-primary" onClick={onUpload}>
            <Upload size={14} className="btn-icon" />
            <span>Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
}

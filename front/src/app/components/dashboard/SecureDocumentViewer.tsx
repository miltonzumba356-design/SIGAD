import * as React from 'react';
import { X, Loader2, Shield, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface SecureDocumentViewerProps {
  document: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SecureDocumentViewer({ document, isOpen, onClose }: SecureDocumentViewerProps) {
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [fileType, setFileType] = React.useState('');
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !document) return;

    const preventDefault = (event: Event) => event.preventDefault();
    const preventKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['p', 's', 'c'].includes(key)) event.preventDefault();
      if (key === 'printscreen') event.preventDefault();
    };

    documentElement().addEventListener('contextmenu', preventDefault);
    documentElement().addEventListener('copy', preventDefault);
    window.addEventListener('keydown', preventKeys);

    setLoading(true);
    setText('');
    setFileUrl(null);
    setFileType('');

    Promise.all([
      api.blob(`/documents/${document.id}/file`),
      api.request<{ text: string }>(`/documents/${document.id}/text`)
    ]).then(([blobRes, textRes]) => {
      if (blobRes.data) {
        setFileType(blobRes.data.type);
        setFileUrl(URL.createObjectURL(blobRes.data));
      }
      if (textRes.data?.text) setText(textRes.data.text);
      if (blobRes.error && textRes.error) toast.error('Nao foi possivel abrir o documento');
    }).finally(() => setLoading(false));

    return () => {
      documentElement().removeEventListener('contextmenu', preventDefault);
      documentElement().removeEventListener('copy', preventDefault);
      window.removeEventListener('keydown', preventKeys);
      setFileUrl(current => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const fileName = document.ficheiros?.[0]?.nome_original || document.titulo || '';
  const isImage = fileType.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(fileName);
  const isPdf = fileType === 'application/pdf' || /\.pdf$/i.test(fileName);

  return (
    <div className="modal-overlay open secure-viewer-overlay" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="secure-viewer">
        <div className="secure-viewer-header">
          <div>
            <div className="secure-viewer-title"><Shield size={16} /> {document.titulo}</div>
            <div className="secure-viewer-meta">Visualizacao protegida - sem download, sem impressao, com marca de utilizador</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="secure-viewer-body">
          <div className="watermark-grid" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <span key={index}>{user.email || 'SIGAD'} - DOC {document.id}</span>
            ))}
          </div>

          {loading && <div className="secure-empty"><Loader2 className="animate-spin" size={24} /></div>}

          {!loading && fileUrl && isPdf && (
            <object
              className="secure-frame"
              data={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              type="application/pdf"
              aria-label={document.titulo}
            >
              <embed
                className="secure-frame"
                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                type="application/pdf"
              />
            </object>
          )}

          {!loading && fileUrl && isImage && (
            <img className="secure-image" src={fileUrl} alt={document.titulo} draggable={false} />
          )}

          {!loading && (!fileUrl || (!isPdf && !isImage)) && (
            <div className="secure-text">
              <FileText size={18} />
              <pre>{text || 'Sem texto extraido para leitura.'}</pre>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .secure-viewer-overlay { z-index: 80; }
        .secure-viewer {
          width: min(1120px, calc(100vw - 32px));
          height: min(820px, calc(100vh - 32px));
          background: #0b0b0d;
          border: 1px solid #27272a;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          user-select: none;
        }
        .secure-viewer-header {
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 1px solid #27272a;
          background: #121215;
        }
        .secure-viewer-title { display: flex; gap: 8px; align-items: center; font-weight: 700; }
        .secure-viewer-meta { color: var(--muted); font-size: 11px; margin-top: 4px; }
        .secure-viewer-body { position: relative; flex: 1; overflow: auto; background: #09090b; }
        .secure-frame { width: 100%; height: 100%; border: 0; background: white; display: block; }
        .secure-image { display: block; max-width: 100%; margin: 0 auto; pointer-events: none; }
        .secure-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted); }
        .secure-text { padding: 24px; color: #e4e4e7; }
        .secure-text pre { white-space: pre-wrap; line-height: 1.7; font-family: inherit; font-size: 14px; }
        .watermark-grid {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 42px;
          padding: 24px;
          opacity: 0.13;
          color: #f97316;
          transform: rotate(-18deg);
          font-size: 12px;
          font-weight: 700;
        }
        @media print {
          body * { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function documentElement() {
  return window.document;
}

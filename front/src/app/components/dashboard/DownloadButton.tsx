import * as React from 'react';
import { Download, ShieldQuestion } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface DownloadButtonProps {
  documentId: number;
  titulo: string;
  isAdmin: boolean;
  authorized: boolean;
}

export function DownloadButton({ documentId, titulo, isAdmin, authorized }: DownloadButtonProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const baixar = async (semMarcaDagua: boolean) => {
    setMenuOpen(false);
    setLoading(true);
    const res = await api.download(
      `/documents/${documentId}/download${semMarcaDagua ? '?watermark=false' : ''}`,
      titulo
    );
    setLoading(false);
    if (res.error) toast.error(res.error.message || 'Erro ao descarregar documento');
  };

  const solicitar = async () => {
    const res = await api.request(`/documents/${documentId}/download-request`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (res.data) toast.success('Pedido enviado. Aguarde aprovação do administrador.');
    else toast.error(res.error?.message || 'Erro ao solicitar autorização');
  };

  if (isAdmin) {
    return (
      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-sm" title="Baixar documento" disabled={loading} onClick={() => setMenuOpen(open => !open)}>
          <Download size={15} />
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 20,
              background: '#111827', border: '1px solid var(--border)', borderRadius: 8,
              padding: 6, minWidth: 200, boxShadow: '0 16px 32px rgba(0,0,0,0.35)'
            }}
          >
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => baixar(false)}>
              Com marca d'água
            </button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => baixar(true)}>
              Sem marca d'água
            </button>
          </div>
        )}
      </div>
    );
  }

  if (authorized) {
    return (
      <button className="btn btn-ghost btn-sm" title="Baixar sem marca d'água (autorizado)" disabled={loading} onClick={() => baixar(true)}>
        <Download size={15} />
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn btn-ghost btn-sm" title="Baixar (com marca d'água)" disabled={loading} onClick={() => baixar(false)}>
        <Download size={15} />
      </button>
      <button className="btn btn-ghost btn-sm" title="Solicitar download sem marca d'água" onClick={solicitar}>
        <ShieldQuestion size={15} />
      </button>
    </div>
  );
}

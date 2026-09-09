import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { api } from '../../services/api';
import { DownloadButton } from './DownloadButton';

interface Document {
  id: number;
  titulo: string;
  tipo?: string;
  created_at?: string;
  suporte?: string;
  classificacao?: string;
}

export function RecentDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [authorizedDownloads, setAuthorizedDownloads] = useState<Set<number>>(new Set());
  const currentUser = api.getCurrentUser();
  const isAdmin = currentUser?.role_id === 1 || currentUser?.role_id === 2;

  useEffect(() => {
    api.getDocumentos({ limit: 5 }).then(res => {
      if (res.data) setDocuments(res.data);
    });
    api.request<number[]>('/documents/authorized-downloads').then(res => {
      if (res.data) setAuthorizedDownloads(new Set(res.data));
    });
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Documentos Recentes</h2>
        <p className="text-sm text-muted-foreground">Últimos documentos adicionados ao sistema</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Código</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Título</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Data</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Suporte</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Classificação</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">DOC-{doc.id}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-foreground max-w-md truncate">{doc.titulo}</p>
                </td>
                <td className="px-6 py-4"><span className="text-sm text-muted-foreground">{doc.tipo || '-'}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-muted-foreground">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-muted-foreground">{doc.suporte || '-'}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-muted-foreground">{doc.classificacao || '-'}</span></td>
                <td className="px-6 py-4">
                  <DownloadButton documentId={doc.id} titulo={doc.titulo} isAdmin={isAdmin} authorized={authorizedDownloads.has(doc.id)} />
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhum documento cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

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

  useEffect(() => {
    api.getDocumentos({ limit: 5 }).then(res => {
      if (res.data) setDocuments(res.data);
    });
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Documentos Recentes</h2>
        <p className="text-sm text-muted-foreground">Ultimos documentos adicionados ao sistema</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Codigo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Titulo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Data</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Suporte</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Classificacao</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Acoes</th>
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
                  <button className="text-primary hover:text-primary/80 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
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

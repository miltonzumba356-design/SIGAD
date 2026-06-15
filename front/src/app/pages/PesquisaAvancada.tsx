import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { SecureDocumentViewer } from '../components/dashboard/SecureDocumentViewer';
import { api } from '../services/api';
import { Search, FileText, Loader2, Eye, ScanText, Shield, Filter } from 'lucide-react';
import { toast } from 'sonner';

type SearchFilter = 'all' | 'digital' | 'ocr' | 'hybrid';

interface SearchResult {
  docId: string;
  docName: string;
  docType: 'digital' | 'ocr' | 'hybrid';
  score: number;
  snippet: string;
  matchCount: number;
  pages: number;
}

interface Documento {
  id: number;
  titulo: string;
}

interface IndexResponse {
  success: boolean;
  docType: string;
  wordCount: number;
}

const filterLabels: Record<SearchFilter, string> = {
  all: 'Todos',
  digital: 'Texto digital',
  ocr: 'OCR',
  hybrid: 'Hibrido'
};

const typeColors: Record<SearchResult['docType'], string> = {
  digital: 'var(--blue)',
  ocr: 'var(--accent)',
  hybrid: 'var(--green)'
};

export function PesquisaAvancada() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const pesquisar = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const res = await api.raw<SearchResult[]>('/search', {
      method: 'POST',
      body: JSON.stringify({ query, filter })
    });
    setLoading(false);

    if (res.data) setResults(res.data);
    else toast.error(res.error?.message || 'Erro ao pesquisar no indice OCR');
  };

  useEffect(() => {
    if (query.trim()) pesquisar();
  }, [filter]);

  const limpar = () => {
    setQuery('');
    setFilter('all');
    setResults([]);
  };

  const indexarDocumentos = async () => {
    setIndexing(true);
    const docsRes = await api.getDocumentos({});
    if (!docsRes.data) {
      toast.error(docsRes.error?.message || 'Erro ao carregar documentos');
      setIndexing(false);
      return;
    }

    let ok = 0;
    let fail = 0;
    for (const doc of docsRes.data as Documento[]) {
      const res = await api.raw<IndexResponse>(`/documents/${doc.id}/index`, { method: 'POST' });
      if (res.data) ok += 1;
      else fail += 1;
    }

    setIndexing(false);
    toast.success(`Indexacao concluida: ${ok} documentos indexados${fail ? `, ${fail} sem ficheiro digital` : ''}`);
    if (query.trim()) pesquisar();
  };

  const abrirResultado = async (result: SearchResult) => {
    const res = await api.getDocumento(Number(result.docId));
    setSelectedDocument(res.data || { id: Number(result.docId), titulo: result.docName });
    setViewerOpen(true);
  };

  const renderSnippet = (snippet: string) => {
    const parts = snippet.split(/(\[\[MATCH\]\].*?\[\[\/MATCH\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[MATCH]]')) {
        return <mark key={index}>{part.replace('[[MATCH]]', '').replace('[[/MATCH]]', '')}</mark>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <Layout title="Pesquisa Avancada" subtitle="Pesquisa por texto digital e OCR em documentos indexados">
      <div className="view active">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title"><Search size={16} /> Motor de Pesquisa OCR</div>

          <div className="form-group">
            <label className="form-label">Texto / frase</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') pesquisar(); }}
                type="text"
                className="form-input"
                placeholder="Pesquisar em PDFs, imagens digitalizadas, DOCX e TXT"
                style={{ fontSize: 14, padding: '12px 12px 12px 38px' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fonte do texto</label>
              <select className="form-input" value={filter} onChange={event => setFilter(event.target.value as SearchFilter)}>
                <option value="all">Todos</option>
                <option value="digital">Texto digital</option>
                <option value="ocr">OCR</option>
                <option value="hybrid">Hibrido</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Seguranca</label>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
                <Shield size={14} /> Resultados abrem no visualizador protegido
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={pesquisar} disabled={loading || indexing}>
              {loading ? <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} /> : <Search size={16} style={{ marginRight: 8 }} />}
              Pesquisar
            </button>
            <button className="btn btn-ghost" onClick={indexarDocumentos} disabled={loading || indexing}>
              {indexing ? <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} /> : <ScanText size={16} style={{ marginRight: 8 }} />}
              Indexar documentos
            </button>
            <button className="btn btn-ghost" onClick={limpar}>Limpar</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Resultados - <span style={{ color: 'var(--accent)', fontSize: 13 }}>{results.length} ocorrencias</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Filter size={12} /> {filterLabels[filter]}</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={22} className="animate-spin" /></div>
          ) : results.length ? (
            <div className="search-results">
              {results.map(result => (
                <div className="search-result" key={result.docId}>
                  <div className="search-result-icon"><FileText size={18} /></div>
                  <div className="search-result-body">
                    <div className="search-result-title">
                      {result.docName}
                      <span style={{ color: typeColors[result.docType] }}>{result.docType.toUpperCase()}</span>
                    </div>
                    <div className="search-result-snippet">{renderSnippet(result.snippet || 'Sem excerto disponivel.')}</div>
                    <div className="search-result-meta">
                      Score {result.score}% - {result.matchCount} ocorrencias - {result.pages} pagina(s)
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" title="Abrir documento" onClick={() => abrirResultado(result)}>
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              {query ? 'Nenhum documento encontrado no indice.' : 'Digite uma palavra ou frase para pesquisar no OCR.'}
            </div>
          )}
        </div>
      </div>

      <SecureDocumentViewer
        isOpen={viewerOpen}
        document={selectedDocument}
        onClose={() => setViewerOpen(false)}
      />

      <style>{`
        .search-results { display: flex; flex-direction: column; gap: 10px; }
        .search-result {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
          padding: 14px;
          border: 1px solid #27272a;
          border-radius: 8px;
          background: #101014;
        }
        .search-result-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--blue);
          background: rgba(59, 130, 246, 0.08);
        }
        .search-result-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .search-result-title span { font-size: 10px; font-weight: 800; }
        .search-result-snippet {
          color: #d4d4d8;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }
        .search-result-snippet mark {
          background: rgba(249, 115, 22, 0.28);
          color: #fff7ed;
          padding: 0 2px;
          border-radius: 3px;
        }
        .search-result-meta {
          margin-top: 8px;
          color: var(--muted);
          font-size: 11px;
        }
      `}</style>
    </Layout>
  );
}

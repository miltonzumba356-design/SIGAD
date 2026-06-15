import { Layout } from '../components/layout/Layout';
import { Construction } from 'lucide-react';

interface EmConstrucaoProps {
  titulo: string;
  descricao: string;
}

export function EmConstrucao({ titulo, descricao }: EmConstrucaoProps) {
  return (
    <Layout title={titulo} subtitle={descricao} showActions={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Construction className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Pagina em Construcao</h2>
        <p className="text-muted-foreground max-w-md">
          Esta funcionalidade esta em desenvolvimento e estara disponivel em breve.
        </p>
      </div>
    </Layout>
  );
}

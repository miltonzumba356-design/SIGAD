import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { api } from '../../services/api';

export function Alerts() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.getDashboardStats().then(res => {
      if (res.data) setStats(res.data);
    });
  }, []);

  const alerts = [
    {
      id: 'loans',
      icon: AlertTriangle,
      title: 'Emprestimos atrasados',
      message: `${stats?.atrasados || 0} documentos com devolucao em atraso`,
      className: 'bg-destructive/10 border-destructive/20 text-destructive'
    },
    {
      id: 'digitization',
      icon: Info,
      title: 'Fila de digitalizacao',
      message: `${stats?.pendentes_dig || 0} documentos aguardando digitalizacao`,
      className: 'bg-info/10 border-info/20 text-info'
    },
    {
      id: 'active-loans',
      icon: Clock,
      title: 'Emprestimos ativos',
      message: `${stats?.emprestimos_ativos || 0} documentos emprestados`,
      className: 'bg-warning/10 border-warning/20 text-warning'
    }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Alertas Activos</h2>
        <p className="text-sm text-muted-foreground">Indicadores calculados pelos dados cadastrados</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div key={alert.id} className={`flex gap-3 p-4 rounded-lg border ${alert.className}`}>
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium">{alert.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

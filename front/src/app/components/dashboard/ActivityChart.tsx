import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';

export function ActivityChart() {
  const [data, setData] = useState<Array<{ tipo: string; total: number }>>([]);

  useEffect(() => {
    api.getDashboardStats().then(res => {
      if (res.data?.porTipo) {
        setData(res.data.porTipo.map((item: any) => ({ tipo: item.nome || 'Sem tipo', total: item.count })));
      }
    });
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Documentos por Tipo</h2>
        <p className="text-sm text-muted-foreground">Distribuicao baseada nos documentos cadastrados</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
          <XAxis dataKey="tipo" stroke="#a0a0b0" tick={{ fill: '#a0a0b0', fontSize: 12 }} />
          <YAxis stroke="#a0a0b0" tick={{ fill: '#a0a0b0', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#f5f5f5' }} />
          <Bar dataKey="total" fill="#d4af37" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

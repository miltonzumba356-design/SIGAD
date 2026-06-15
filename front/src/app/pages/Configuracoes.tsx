import { Layout } from '../components/layout/Layout';
import { Settings, Save } from 'lucide-react';

export function Configuracoes() {
  return (
    <Layout title="Configurações" subtitle="Configurações do sistema e perfil">
      <div className="view active">
        <div className="card">
          <div className="section-title"><Settings size={16} /> Configurações Gerais</div>
          <div className="form-group">
            <label className="form-label">Nome da Instituição</label>
            <input type="text" className="form-input" defaultValue="Ministério dos Transportes" />
          </div>
          <div className="form-group">
            <label className="form-label">Email de Contacto</label>
            <input type="email" className="form-input" defaultValue="contacto@mtrans.gov.ao" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Idioma</label>
              <select className="form-input">
                <option>Português</option>
                <option>English</option>
                <option>Français</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fuso Horário</label>
              <select className="form-input">
                <option>(GMT+01:00) Luanda</option>
                <option>(GMT+00:00) Lisboa</option>
              </select>
            </div>
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn btn-primary">
              <Save size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Guardar Alterações
            </button>
            <button className="btn btn-ghost">Restaurar Padrão</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  FolderOpen,
  Archive,
  ClipboardList,
  Search,
  Printer,
  BarChart3,
  Users,
  Building2,
  Settings,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

interface NavItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: { section: string; items: NavItemProps[] }[] = [
  {
    section: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/' },
      { id: 'arquivo', label: 'Arquivo Digital', icon: <FolderOpen size={18} />, path: '/arquivo-digital' },
      { id: 'fisico', label: 'Arquivo Fisico', icon: <Archive size={18} />, path: '/arquivo-fisico' },
    ]
  },
  {
    section: 'Operacoes',
    items: [
      { id: 'emprestimos', label: 'Emprestimos', icon: <ClipboardList size={18} />, path: '/emprestimos' },
      { id: 'pesquisa', label: 'Pesquisa Avancada', icon: <Search size={18} />, path: '/pesquisa' },
      { id: 'digitalizacao', label: 'Digitalizacao', icon: <Printer size={18} />, path: '/digitalizacao' },
    ]
  },
  {
    section: 'Gestao',
    items: [
      { id: 'relatorios', label: 'Relatorios', icon: <BarChart3 size={18} />, path: '/relatorios' },
      { id: 'utilizadores', label: 'Utilizadores', icon: <Users size={18} />, path: '/utilizadores' },
      { id: 'instituicoes', label: 'Instituicoes', icon: <Building2 size={18} />, path: '/instituicoes' },
      { id: 'configuracoes', label: 'Configuracoes', icon: <Settings size={18} />, path: '/configuracoes' },
    ]
  }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface Instituicao {
  id: number;
  nome: string;
  sigla?: string;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [user, setUser] = useState<any>(() => api.getCurrentUser());
  const [institutionMenuOpen, setInstitutionMenuOpen] = useState(false);
  const canSwitch = useMemo(() => {
    return user?.role_id === 1 || user?.role_id === 2 || user?.permissoes?.includes('sys.institutions');
  }, [user]);

  const loadInstitutions = () => {
    api.request<Instituicao[]>('/institutions').then(res => {
      if (res.data) setInstituicoes(res.data);
    });
  };

  useEffect(() => {
    setUser(api.getCurrentUser());
    if (!canSwitch) return;
    loadInstitutions();
  }, [canSwitch]);

  const currentInstitutionName = user?.instituicao_nome
    || instituicoes.find(inst => inst.id === user?.instituicao_id)?.nome
    || 'Instituicao atual';

  const switchInstitution = async (instituicaoId: number) => {
    if (!instituicaoId || instituicaoId === user?.instituicao_id) return;
    const res = await api.switchInstitution(instituicaoId);
    if (res.data) {
      const nextUser = api.getCurrentUser();
      setUser(nextUser);
      toast.success('Instituicao alterada');
      window.location.reload();
    } else {
      toast.error(res.error?.message || 'Erro ao trocar instituicao');
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="logo">
        <div className="logo-badge">SIGAD.ao</div>
        <h1>Gestao de Arquivos e Documentos</h1>
        <p>Plataforma Multi-Institucional</p>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="inst-selector"
          onClick={() => {
            if (!canSwitch) return;
            loadInstitutions();
            setInstitutionMenuOpen(open => !open);
          }}
          style={{ width: 'calc(100% - 24px)', textAlign: 'left' }}
        >
          <div className="inst-dot"></div>
          <span className="inst-name">{currentInstitutionName}</span>
          <ChevronDown size={14} className="inst-arrow" />
        </button>
        {canSwitch && institutionMenuOpen && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              top: 'calc(100% - 6px)',
              background: '#111827',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 6,
              zIndex: 30,
              boxShadow: '0 16px 32px rgba(0,0,0,0.35)'
            }}
          >
            {instituicoes.map(inst => (
              <button
                key={inst.id}
                type="button"
                onClick={() => switchInstitution(inst.id)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 0,
                  borderRadius: 6,
                  background: inst.id === user?.instituicao_id ? 'rgba(200,146,42,0.16)' : 'transparent',
                  color: inst.id === user?.instituicao_id ? 'var(--accent2)' : 'var(--text)',
                  textAlign: 'left',
                  cursor: inst.id === user?.instituicao_id ? 'default' : 'pointer',
                  fontSize: 11
                }}
              >
                {inst.sigla ? `${inst.sigla} - ${inst.nome}` : inst.nome}
              </button>
            ))}
            {instituicoes.length === 0 && (
              <div style={{ padding: 10, color: 'var(--muted)', fontSize: 11 }}>Nenhuma instituicao disponivel</div>
            )}
          </div>
        )}
      </div>

      {navItems.map((section) => (
        <div key={section.section}>
          <div className="nav-section">{section.section}</div>
          {section.items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="sidebar-footer" style={{ borderTop: '1px solid #27272a', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="avatar">SG</div>
          <div className="user-info">
            <div className="user-name">Sessao ativa</div>
            <div className="user-role">SIGAD</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', color: '#ef4444' }}
          onClick={() => api.logout()}
        >
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}

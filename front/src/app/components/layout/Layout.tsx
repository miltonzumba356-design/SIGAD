import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NewDocumentModal } from '../dashboard/NewDocumentModal';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function Layout({
  children,
  title,
  subtitle,
}: LayoutProps) {
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className="main">
        <Topbar
          title={title}
          subtitle={subtitle}
          onNewDocument={() => setIsNewDocModalOpen(true)}
          onUpload={() => setIsNewDocModalOpen(true)}
        />
        <div className="content">
          {children}
        </div>
      </main>

      <NewDocumentModal 
        isOpen={isNewDocModalOpen} 
        onClose={() => setIsNewDocModalOpen(false)} 
      />
    </div>
  );
}

import React from 'react';
import { Package, Search } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
}

const EmptyState = ({ title, description, icon: Icon = Package }: EmptyStateProps) => {
  return (
    <div style={{ 
      padding: '60px 20px', 
      textAlign: 'center', 
      background: '#fff', 
      borderRadius: '16px', 
      border: '2px dashed #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px'
    }}>
      <div style={{ 
        width: '64px', 
        height: '64px', 
        borderRadius: '50%', 
        background: '#f8fafc', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        <Icon size={32} />
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{title}</h3>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#64748b' }}>{description}</p>
      </div>
    </div>
  );
};

export default EmptyState;

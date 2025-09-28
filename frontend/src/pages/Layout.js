import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import Dashboard from './Dashboard';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-dark-900 text-white">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 p-6">
        <Dashboard />
      </div>
    </div>
  );
};

export default Layout;

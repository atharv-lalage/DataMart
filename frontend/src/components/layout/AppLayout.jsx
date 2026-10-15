import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Enterprise Application Shell Layout
 */
export default function AppLayout({
  children,
  currentUser,
  onLogout,
  onDropDataset,
  dropping = false,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar
        currentUser={currentUser}
        onLogout={onLogout}
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />

      <div className="main-content">
        <Header
          currentUser={currentUser}
          onToggleSidebar={() => setIsMobileOpen((prev) => !prev)}
          onDropDataset={onDropDataset}
          dropping={dropping}
        />

        <main className="main-content__body">
          {children}
        </main>
      </div>
    </div>
  );
}

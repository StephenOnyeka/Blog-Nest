import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import LeftSidebarNav from './LeftSidebarNav';

interface PageTemplateProps {
  children: ReactNode;
  showFooter?: boolean;
  /** Set to true to hide the left sidebar nav (e.g. WritePage, ArticlePage) */
  hideSidebar?: boolean;
}

export default function PageTemplate({
  children,
  showFooter = true,
  hideSidebar = false,
}: PageTemplateProps) {
  return (
    <>
      <Navbar />

      {hideSidebar ? (
        <main className="flex-1">
          {children}
        </main>
      ) : (
        <main className="flex-1">
          <div className="flex max-w-7xl mx-auto px-6 gap-0 pt-6 items-start">
            {/* Left sidebar nav */}
            <LeftSidebarNav />
            {/* Page content */}
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        </main>
      )}

      {showFooter && <Footer />}
    </>
  );
}

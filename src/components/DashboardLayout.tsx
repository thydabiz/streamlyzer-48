
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Tv, Film, Heart, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Handle TV remote navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          setFocusedIndex(prev => Math.min(2, prev + 1));
          break;
        case 'Enter':
          const buttons = document.querySelectorAll('[role="button"]');
          (buttons[focusedIndex] as HTMLElement)?.click();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="focus:ring-4 focus:ring-white/20 focus:outline-none"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold">Streamlyzer</h1>
        <Button 
          variant="ghost" 
          size="icon"
          className="focus:ring-4 focus:ring-white/20 focus:outline-none"
        >
          <User className="h-5 w-5" />
        </Button>
      </nav>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 glass transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-4">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-2xl font-semibold">Menu</h2>
          </div>
          {[
            { icon: Tv, label: 'Live TV', index: 0 },
            { icon: Film, label: 'Movies & Shows', index: 1 },
            { icon: Heart, label: 'Favorites', index: 2 },
          ].map(({ icon: Icon, label, index }) => (
            <Button
              key={label}
              variant="ghost"
              className={`w-full justify-start text-xl p-6 focus:ring-4 focus:ring-white/20 focus:outline-none ${
                focusedIndex === index ? 'bg-white/10 ring-4 ring-white/20' : ''
              }`}
              onFocus={() => setFocusedIndex(index)}
            >
              <Icon className="mr-4 h-6 w-6" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main
        className={`transition-all duration-200 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Tv, Film, Heart, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Streamlyzer</h1>
        <Button variant="ghost" size="icon">
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
            <h2 className="text-lg font-semibold">Menu</h2>
          </div>
          <Button variant="ghost" className="w-full justify-start">
            <Tv className="mr-2 h-4 w-4" /> Live TV
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Film className="mr-2 h-4 w-4" /> Movies & Shows
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Heart className="mr-2 h-4 w-4" /> Favorites
          </Button>
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


interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Streamlyzer</h1>
      </nav>

      {/* Main content */}
      <main>
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

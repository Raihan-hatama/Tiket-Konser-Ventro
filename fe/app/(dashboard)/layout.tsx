 import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />

      <div className="ml-64 flex flex-col min-h-screen">
        <Navbar />

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
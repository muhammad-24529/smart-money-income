
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-zinc-950">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="min-h-screen md:ml-64">
        <div className="min-h-screen px-4 pb-8 pt-20 sm:px-6 sm:pb-10 lg:px-8 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

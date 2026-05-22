import Link from "next/link";
import { Search, Bell, User, MessageSquareQuote } from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass-nav">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <MessageSquareQuote size={20} />
            </div>
            <span className="font-outfit font-bold text-xl tracking-tight">DeptGuest</span>
          </Link>

          <div className="flex items-center gap-1 md:gap-4">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors text-secondary-foreground">
              <Search size={22} />
            </button>
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors text-secondary-foreground relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white"></span>
            </button>
            <Link href="/profile" className="p-2 hover:bg-black/5 rounded-full transition-colors text-secondary-foreground">
              <User size={22} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="py-12 text-center text-secondary-foreground/60 text-sm">
        <p>© 2026 DeptGuest. All rights reserved.</p>
      </footer>
    </div>
  );
}

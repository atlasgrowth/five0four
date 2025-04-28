import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Server Pad', path: '/' },
    { name: 'Kitchen', path: '/kitchen' },
    { name: 'Bar', path: '/bar' },
    { name: 'Expo', path: '/expo' }
  ];
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location === '/';
    }
    return location.startsWith(path);
  };
  
  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-golf">
            <path d="M12 18v-6"></path>
            <path d="M8 10V4"></path>
            <path d="M16 18.01V18"></path>
            <path d="M12 12v.01"></path>
            <path d="M12 22a4 4 0 0 0 4-4"></path>
            <path d="M8 18a4 4 0 0 0 4 4"></path>
            <path d="M8 22h8"></path>
            <path d="m7 8 5 3 5-3"></path>
          </svg>
          <Link href="/">
            <h1 className="text-2xl font-bold font-sans cursor-pointer tracking-tight">504 GOLF</h1>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-8">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.path}
                  className={cn(
                    "hover:underline cursor-pointer text-lg px-3 py-2 transition-colors hover:bg-blue-800/60 rounded-md",
                    isActive(item.path) && "font-bold bg-blue-800/60"
                  )}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white focus:outline-none rounded-md p-2 hover:bg-blue-800/60" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu">
            <line x1="4" x2="20" y1="12" y2="12"></line>
            <line x1="4" x2="20" y1="6" y2="6"></line>
            <line x1="4" x2="20" y1="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-blue-900">
          <nav className="container mx-auto px-4 py-2">
            <ul className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.path}
                    className={cn(
                      "block py-3 hover:bg-blue-800/60 px-4 rounded-md transition-colors",
                      isActive(item.path) && "font-bold bg-blue-800/60"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

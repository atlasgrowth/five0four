import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Server Pad', path: '/' },
    { name: 'Menu', path: '/menu' },
    { name: 'Kitchen', path: '/kitchen' },
    { name: 'Bar', path: '/bar' }
  ];
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location === '/';
    }
    return location.startsWith(path);
  };
  
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="material-icons">sports_golf</span>
          <Link href="/">
            <h1 className="text-xl font-bold font-sans cursor-pointer">504 Golf</h1>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.path === '/menu' ? '#' : item.path === '/kitchen' ? '/kitchen/1' : item.path}
                  className={cn(
                    "hover:underline cursor-pointer",
                    isActive(item.path) && "font-bold"
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
          className="md:hidden text-white focus:outline-none" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-primary-dark">
          <nav className="container mx-auto px-4 py-2">
            <ul className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.path === '/menu' ? '#' : item.path === '/kitchen' ? '/kitchen/1' : item.path}
                    className={cn(
                      "block py-2 hover:bg-primary-light px-2 rounded",
                      isActive(item.path) && "font-bold bg-primary-light"
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

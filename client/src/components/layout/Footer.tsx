export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto px-4 text-center">
        <p>© {currentYear} 504 Golf - Food Ordering System</p>
      </div>
    </footer>
  );
}

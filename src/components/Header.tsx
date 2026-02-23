import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="border-b border-foreground">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-medium tracking-tight">
          STORE
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link to="/" className="hover:opacity-60 transition-opacity">Products</Link>
          <Link to="/orders" className="hover:opacity-60 transition-opacity">Orders</Link>
          <Link to="/how-to-buy" className="hover:opacity-60 transition-opacity">How to Buy</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;

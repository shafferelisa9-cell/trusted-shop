import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { useXmrRate } from '@/hooks/useXmrRate';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const Store = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');
  const { xmrToUsd } = useXmrRate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('products').select('*').order('created_at');
      if (data) setProducts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  // Extract all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      const c = (p as any).categories;
      if (Array.isArray(c)) c.forEach((cat: string) => cats.add(cat));
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = products;

    // Search by name or description
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => {
        const c = (p as any).categories;
        return Array.isArray(c) && c.includes(selectedCategory);
      });
    }

    // Sort
    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price_xmr - b.price_xmr);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price_xmr - a.price_xmr);
    }
    // 'newest' is default order from DB

    return result;
  }, [products, search, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-sm font-medium tracking-widest mb-6">PRODUCTS</h1>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 bg-transparent border border-foreground px-4 py-2 text-sm placeholder:opacity-40 focus:outline-none"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-background border border-foreground px-4 py-2 text-xs uppercase tracking-wider cursor-pointer focus:outline-none"
          >
            <option value="newest">NEWEST</option>
            <option value="price-asc">PRICE ↑</option>
            <option value="price-desc">PRICE ↓</option>
          </select>
        </div>

        {/* Category filters */}
        {allCategories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-[10px] border border-foreground px-3 py-1 uppercase tracking-wider transition-colors ${
                !selectedCategory ? 'bg-foreground text-background' : 'hover:bg-foreground hover:text-background'
              }`}
            >
              ALL
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`text-[10px] border border-foreground px-3 py-1 uppercase tracking-wider transition-colors ${
                  selectedCategory === cat ? 'bg-foreground text-background' : 'hover:bg-foreground hover:text-background'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <p className="text-sm opacity-40">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm opacity-40">
            {products.length === 0 ? 'No products available.' : 'No products match your search.'}
          </p>
        ) : (
          <>
            <p className="text-xs opacity-40 mb-4">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-foreground">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} xmrToUsd={xmrToUsd} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Store;

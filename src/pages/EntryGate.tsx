import { useState } from 'react';
import { setEntryCode } from '@/lib/cookies';
import bcrypt from 'bcryptjs';
import { ENTRY_CODE_HASH } from '@/lib/gate-hash';

const EntryGate = ({ onEnter }: { onEnter: () => void }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bcrypt.compareSync(code.trim(), ENTRY_CODE_HASH)) {
      setEntryCode(code.trim());
      onEnter();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
        <h1 className="text-sm font-medium mb-8 text-center tracking-widest">NAGSOM</h1>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-foreground bg-background px-4 py-3 text-sm text-center tracking-widest focus:outline-none"
          autoFocus
          placeholder="••••••••"
        />
        <button
          type="submit"
          disabled={!code.trim()}
          className="w-full border border-foreground mt-4 py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
        >
          ENTER
        </button>
      </form>
    </div>
  );
};

export default EntryGate;

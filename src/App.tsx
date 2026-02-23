import { useState } from 'react';
import { getEntryCode } from '@/lib/cookies';
import EntryGate from './pages/EntryGate';
import AppRoutes from './AppRoutes';

const App = () => {
  const [hasCode, setHasCode] = useState(!!getEntryCode());

  if (!hasCode) {
    return <EntryGate onEnter={() => setHasCode(true)} />;
  }

  return <AppRoutes />;
};

export default App;

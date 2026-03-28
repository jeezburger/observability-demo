import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import Nodes from './pages/Nodes';
import Logs from './pages/Logs';
import Alerts from './pages/Alerts';
import { useStatus } from './hooks/useStatus';

function App() {
  const { status, error, postEvent } = useStatus();

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary-fixed antialiased overflow-hidden">
        <Header status={status} error={error} />
        
        <main className="flex-grow pt-16 pb-12 px-6 overflow-hidden max-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard status={status} />} />
            <Route path="/nodes" element={<Nodes status={status} />} />
            <Route path="/logs" element={<Logs status={status} />} />
            <Route path="/alerts" element={<Alerts status={status} postEvent={postEvent} />} />
          </Routes>
        </main>

        <Footer status={status} error={error} />
      </div>
    </Router>
  );
}

export default App;

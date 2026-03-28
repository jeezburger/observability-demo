import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ status, error }) => {
  const location = useLocation();
  const [time, setTime] = React.useState(new Date().toLocaleTimeString('en-GB', { hour12: false }));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Nodes', path: '/nodes' },
    { name: 'Logs', path: '/logs' },
    { name: 'Alerts', path: '/alerts' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-[#181c22] border-none flex justify-between items-center px-6 py-3 max-w-none">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-xl font-black tracking-tighter text-[#1ce783] hover:opacity-80 transition-opacity">
          JAEGERBOMB
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs font-medium uppercase tracking-wider transition-colors pt-1 ${
                location.pathname === item.path
                  ? 'text-[#1ce783] border-b-2 border-[#1ce783] pb-1'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="font-mono text-secondary text-sm bg-surface-container-lowest px-3 py-1 rounded">
          {time}
        </div>
        <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${error ? 'bg-error' : status?.system_healthy === false ? 'bg-error' : 'bg-primary'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${error ? 'bg-error' : status?.system_healthy === false ? 'bg-error' : 'bg-primary'}`}></span>
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${error ? 'text-error' : status?.system_healthy === false ? 'text-error' : 'text-primary'}`}>
            {error ? 'OFFLINE' : status?.system_healthy === false ? 'ANOMALY' : 'SYSTEM_OK'}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="material-symbols-outlined text-slate-400 hover:bg-[#262a31] p-1 rounded transition-all">settings</button>
          <button className="material-symbols-outlined text-slate-400 hover:bg-[#262a31] p-1 rounded transition-all">account_circle</button>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React from 'react';

const Footer = ({ status, error }) => {
  return (
    <footer className="fixed bottom-0 left-0 w-full h-10 flex justify-start items-center px-6 gap-8 bg-[#181c22] border-none shadow-[0_-4px_12px_rgba(0,0,0,0.5)] z-50">
      <div className={`flex flex-row items-center gap-2 rounded-md px-3 py-1 ${
        error || status?.system_healthy === false 
          ? 'bg-error-container text-error' 
          : 'bg-[#262a31] text-[#1ce783]'
      }`}>
        <span className="material-symbols-outlined text-[14px]">
          {error || status?.system_healthy === false ? 'warning' : 'check_circle'}
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase">
          {error ? 'Connection Lost' : status?.system_healthy === false ? 'Anomaly Active' : 'System OK'}
        </span>
      </div>
      <div className="flex flex-row items-center gap-2 text-slate-500 px-3 py-1">
        <span className="material-symbols-outlined text-[14px]">speed</span>
        <span className="font-mono text-[10px] font-semibold uppercase">Latency: 24ms</span>
      </div>
      <div className="flex flex-row items-center gap-2 text-slate-500 px-3 py-1">
        <span className="material-symbols-outlined text-[14px]">dns</span>
        <span className="font-mono text-[10px] font-semibold uppercase">12 Node Cluster</span>
      </div>
      <div className="flex flex-row items-center gap-2 px-3 py-1" id="connection-status">
        <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-error animate-pulse' : 'bg-primary'}`}></span>
        <span className={`font-mono text-[10px] font-semibold uppercase ${error ? 'text-error' : 'text-primary'}`}>
          {error ? 'Link Fault' : 'Connected'}
        </span>
      </div>
    </footer>
  );
};

export default Footer;

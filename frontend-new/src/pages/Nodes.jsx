import React from 'react';
const Nodes = ({ status }) => {
  const isHealthy = status?.system_healthy !== false;

  const nodeData = [
    { id: 'node-8821-ax', cpu: '42.4%', mem: '8.2 GB / 16 GB', status: 'healthy', load: 42 },
    { id: 'node-1042-ql', cpu: '88.1%', mem: '14.1 GB / 16 GB', status: 'warning', load: 88 },
    { id: 'node-0912-zz', cpu: '12.0%', mem: '2.1 MB/s (I/O)', status: 'healthy', load: 12 },
    { id: 'node-4412-mx', cpu: '34.9%', mem: '4.4 GB / 16 GB', status: 'healthy', load: 35 },
    { id: 'node-2231-va', cpu: '08.2%', mem: '124 kb/s (Net)', status: 'healthy', load: 8 },
    { id: 'node-9901-tx', cpu: '56.1%', mem: '92% (Disk)', status: 'healthy', load: 56 },
    { id: 'node-5562-ca', cpu: '99.4%', mem: '240ms (Latency)', status: 'error', load: 99 },
    { id: 'node-1182-or', cpu: '22.0%', mem: '2.1 GB', status: 'healthy', load: 22 },
    { id: 'node-0032-wa', cpu: '15.4%', mem: '1.2 GB', status: 'healthy', load: 15 },
    { id: 'node-7712-fl', cpu: '44.8%', mem: '9.4 GB', status: 'healthy', load: 45 },
    { id: 'node-3321-ga', cpu: '12.9%', mem: '1.8 GB', status: 'healthy', load: 13 },
    { id: 'node-4491-nc', cpu: '31.2%', mem: '6.1 GB', status: 'healthy', load: 31 },
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Compute Nodes</h1>
          <p className="text-slate-500 text-sm font-mono">Cluster ID: us-east-production-04</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-primary shadow-[0_0_8px_#81ffac]' : 'bg-error shadow-[0_0_8px_#ffb4ab]'}`}></div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isHealthy ? 'text-primary' : 'text-error'}`}>
              {isHealthy ? 'System Healthy' : 'Anomaly Detected'}
            </span>
          </div>
          <button className="bg-surface-container-high hover:bg-surface-bright text-on-surface px-4 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all uppercase">
            MANAGE FLEET
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {nodeData.map((node) => (
          <div key={node.id} className={`bg-surface-container-low p-5 group hover:bg-surface-container-high transition-all duration-300 ${node.status === 'error' ? 'border-l-2 border-error' : ''}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Instance</span>
                <h3 className={`font-mono text-sm font-semibold ${node.status === 'error' ? 'text-error' : node.status === 'warning' ? 'text-secondary-fixed-dim' : 'text-primary'}`}>
                  {node.id}
                </h3>
              </div>
              <span className={`material-symbols-outlined text-lg ${node.status === 'error' ? 'text-error' : node.status === 'warning' ? 'text-secondary-fixed-dim' : 'text-primary'}`}>
                {node.status === 'error' ? 'error' : node.status === 'warning' ? 'warning' : 'check_circle'}
              </span>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase">CPU LOAD</span>
                  <span className={node.status === 'error' ? 'text-error' : node.status === 'warning' ? 'text-secondary-fixed-dim' : 'text-primary'}>{node.cpu}</span>
                </div>
                <div className="h-8 flex items-end gap-0.5">
                  <div className={`w-full ${node.status === 'error' ? 'bg-error' : node.status === 'warning' ? 'bg-secondary-fixed-dim' : 'bg-primary'} h-[${node.load}%] opacity-60`}></div>
                  {/* Visual flourish: fake history bars */}
                  <div className={`w-full ${node.status === 'error' ? 'bg-error' : node.status === 'warning' ? 'bg-secondary-fixed-dim' : 'bg-primary'} h-[${node.load * 0.8}%] opacity-30`}></div>
                  <div className={`w-full ${node.status === 'error' ? 'bg-error' : node.status === 'warning' ? 'bg-secondary-fixed-dim' : 'bg-primary'} h-[${node.load * 1.1}%] opacity-20`}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase">TELEMETRY</span>
                  <span className="text-on-surface-variant">{node.mem}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-lowest overflow-hidden">
                  <div 
                    className={`h-full ${node.status === 'error' ? 'bg-error' : node.status === 'warning' ? 'bg-secondary-fixed-dim' : 'bg-primary'}`} 
                    style={{ width: `${node.load}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Nodes;

import React from 'react';
const Dashboard = ({ status }) => {
  const rca = status?.last_rca_result || {};
  const rem = status?.last_remediation_result || {};
  const events = status?.recent_events || [];

  const confidence = rca.confidence ? (rca.confidence * 100).toFixed(1) : '—';
  const confidencePercent = rca.confidence ? rca.confidence * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 overflow-hidden h-full">
      {/* Section 1: Service Health */}
      <section className="bg-surface-container-low rounded-lg p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>monitor_heart</span>
            Service Health
          </h2>
          <span className="text-[10px] font-mono text-outline uppercase">Refresh: 2s</span>
        </div>
        <div className="space-y-4">
          {[
            { name: 'Payment Service', health: '99.9%', status: 'healthy' },
            { name: 'Cart Service', health: '98.4%', status: 'healthy' },
            { name: 'Recommendation Engine', health: '72.1%', status: 'anomaly' },
            { name: 'Kafka Cluster', health: 'Connected', status: 'healthy' },
          ].map((svc) => (
            <div key={svc.name} className={`flex justify-between items-center p-3 bg-surface-container-lowest rounded ${svc.status === 'anomaly' ? 'border-l-2 border-error' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${svc.status === 'anomaly' ? 'bg-error glow-red' : 'bg-primary glow-green'}`}></span>
                <span className="font-medium text-sm">{svc.name}</span>
              </div>
              <span className={`font-mono text-xs ${svc.status === 'anomaly' ? 'text-error' : 'text-primary'}`}>{svc.health}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Latest AI Insights */}
      <section className="bg-surface-container-low rounded-lg p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>psychology</span>
            Latest AI Insights
          </h2>
          <div className="px-2 py-0.5 bg-secondary-container/20 text-secondary text-[10px] font-bold rounded">LIVE_FEED</div>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-outline uppercase font-bold mb-1">Root Cause</p>
              <p className="text-sm font-semibold truncate">{rca.root_cause || 'Waiting for data…'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-outline uppercase font-bold mb-1">Affected Service</p>
              <p className="text-sm font-semibold truncate">{rca.affected_service || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-outline uppercase font-bold mb-1">Fault Type</p>
              <p className="text-sm font-mono text-secondary truncate">{rca.fault_type || rca.remediation_action || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-outline uppercase font-bold mb-1">Severity</p>
              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${rca.severity === 'critical' ? 'bg-error-container text-error' : 'bg-surface-container-highest text-slate-400'}`}>
                {rca.severity || '—'}
              </span>
            </div>
          </div>
          <div className="pt-4 border-t border-outline-variant/10">
            <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
              <span>AI Confidence</span>
              <span className="text-secondary">{confidence}%</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div className="h-full bg-cyber-gradient transition-all duration-500" style={{ width: `${confidencePercent}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Remediation Log */}
      <section className="bg-surface-container-low rounded-lg p-6 flex flex-col gap-4 overflow-hidden">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-outline" style={{ fontVariationSettings: '"FILL" 1' }}>terminal</span>
            Remediation Log
          </h2>
        </div>
        <div className="flex-grow overflow-y-auto font-mono text-[11px] space-y-2 bg-surface-container-lowest p-4 rounded border border-outline-variant/10 custom-scrollbar">
          {events.length === 0 ? (
            <div className="flex items-start gap-3 opacity-50">
              <span className="text-outline">--:--:--</span>
              <span className="animate-pulse">_</span>
              <span className="text-on-surface-variant">Waiting for events…</span>
            </div>
          ) : (
            events.map((e, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-outline">{new Date(e.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false })}</span>
                <span className="material-symbols-outlined text-[10px] pt-0.5">
                  {e.event_type === 'anomaly_detected' ? 'warning' : 'check_circle'}
                </span>
                <span className={e.event_type === 'anomaly_detected' ? 'text-error' : 'text-on-surface-variant'}>
                  {e.data?.root_cause || e.data?.action_taken || e.event_type}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Section 4: Recovery Metrics */}
      <section className="bg-surface-container-low rounded-lg p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>speed</span>
            Recovery Metrics
          </h2>
        </div>
        <div className="text-center py-4">
          <p className="text-[10px] text-outline uppercase font-bold tracking-widest mb-1">MTTR (Average)</p>
          <div className="text-6xl font-mono font-black transition-colors duration-500 text-primary">
            {rem.elapsed_seconds !== undefined ? Math.round(rem.elapsed_seconds) + 's' : '12s'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/10 pt-4">
          <div className="text-center">
            <p className="text-[10px] text-outline font-bold uppercase mb-1">99th Pctl</p>
            <p className="font-mono text-sm">{rem.elapsed_seconds ? Math.round(rem.elapsed_seconds * 2.5) + 's' : '24s'}</p>
          </div>
          <div className="text-center border-x border-outline-variant/10">
            <p className="text-[10px] text-outline font-bold uppercase mb-1">Auto-Fix</p>
            <p className="font-mono text-sm text-primary">{rem.recovered || rem.recovered === undefined ? '100%' : '0%'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-outline font-bold uppercase mb-1">Cost Saved</p>
            <p className="font-mono text-sm text-secondary">${rem.elapsed_seconds ? (rem.elapsed_seconds * 2.1).toFixed(0) : '1.2k'}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

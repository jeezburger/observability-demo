import React from 'react';
const Alerts = ({ status, postEvent }) => {
  const [fixing, setFixing] = React.useState(false);
  const [fixed, setFixed] = React.useState(false);

  const rca = status?.last_rca_result || {};
  const anomalies = (status?.recent_events || []).filter(e => e.event_type === 'anomaly_detected').slice(-3);

  const executeAutoFix = async () => {
    setFixing(true);
    const success = await postEvent('remediation_complete', {
      action_taken: 'auto_fix',
      service: rca.affected_service || 'prod-db-us-east',
      recovered: true,
      source: 'dashboard-react'
    });
    setFixing(false);
    if (success) setFixed(true);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 uppercase">Active Incidents</h1>
          <p className="text-slate-400 text-sm italic font-mono">12 Node Cluster | us-east-production-04</p>
        </div>
        <div className="bg-surface-container-low px-4 py-2 flex items-center gap-3 rounded border border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Feedback</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-40"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* Left Column: Incident List */}
        <div className="flex flex-col gap-4">
          {anomalies.length === 0 ? (
            <div className="bg-surface-container-low p-8 text-center rounded-lg border border-dashed border-outline-variant/30">
              <span className="material-symbols-outlined text-4xl text-outline/20 mb-2">verified_user</span>
              <p className="text-sm text-outline uppercase font-black tracking-widest">No Active Critical Incidents</p>
            </div>
          ) : (
            anomalies.map((a, i) => (
              <div key={i} className="bg-surface-container-low p-5 hover:bg-surface-container transition-all cursor-pointer border-l-4 border-error group relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-error-container text-error text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Critical</span>
                    <span className="font-mono text-xs text-slate-500">AI-RCA</span>
                  </div>
                  <span className="font-mono text-xs text-slate-400">{new Date(a.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false })}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{a.data?.root_cause || 'Unknown Anomaly'}</h3>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">Affected: <span className="text-primary-fixed-dim">{a.data?.affected_service || '—'}</span> | Severity: {a.data?.severity || '—'}</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">monitoring</span>
                    <span className="font-mono text-xs">deviation: {a.data?.deviation_factor || '—'}x</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Static Seed Alerts */}
          <div className="bg-surface-container-low p-5 border-l-4 border-secondary-container opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-secondary-container/20 text-secondary-container text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">Archive</span>
              <span className="font-mono text-xs text-slate-500">RESOLVED</span>
            </div>
            <h3 className="text-lg font-bold mb-2">Memory Exhaustion Warning: Auth-Service</h3>
            <p className="text-sm text-slate-400">Service 'auth-provider' memory usage is currently at 89%.</p>
          </div>
        </div>

        {/* Right Column: Detail Panel */}
        <div className="relative">
          <div className="sticky top-0 flex flex-col gap-6">
            <div className="bg-surface-container-high rounded-lg overflow-hidden border border-outline-variant/30 shadow-xl">
              <div className="p-6 bg-surface-container-highest/40 border-b border-outline-variant/20">
                <h2 className="font-bold text-xl mb-1 uppercase tracking-tight">Incident Detail</h2>
                <p className="font-mono text-xs text-primary">{rca.affected_service ? 'AI-IDENTIFIED • REMEDIATION READY' : 'NO ACTIVE INCIDENT'}</p>
              </div>
              <div className="p-6 space-y-8">
                {/* AI Recommendation */}
                <div className={`border p-5 rounded-md relative overflow-hidden transition-all ${rca.root_cause ? 'bg-primary/5 border-primary/20 scale-100' : 'bg-surface-container opacity-50 scale-95'}`}>
                  <div className="absolute top-0 right-0 p-2">
                    <span className="material-symbols-outlined text-primary/30 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                  </div>
                  <h4 className="text-primary font-bold text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    AutoPilot Recommendation
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-300 mb-6 font-medium">
                    {rca.root_cause ? (
                      <>
                        Root cause identified as <span className="font-mono text-primary">{rca.root_cause}</span> affecting service <span className="font-mono text-primary">{rca.affected_service || '—'}</span>. 
                        AI recommends: <span className="font-mono text-primary uppercase">{rca.remediation_action || 'restart_service'}</span>.
                        Confidence: <span className="text-primary">{rca.confidence ? (rca.confidence * 100).toFixed(1) + '%' : '—'}</span>
                      </>
                    ) : (
                      "Waiting for active incident detection..."
                    )}
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      disabled={!rca.root_cause || fixing}
                      onClick={executeAutoFix}
                      className={`w-full font-bold py-3 rounded-md flex items-center justify-center gap-2 active:scale-95 transition-all text-xs tracking-widest uppercase ${
                        fixed 
                          ? 'bg-green-700 text-white cursor-default' 
                          : 'bg-gradient-to-r from-primary to-primary-container text-on-primary-container hover:brightness-110 disabled:opacity-30 disabled:grayscale'
                      }`}
                    >
                      {fixing ? (
                        <> <span className="material-symbols-outlined animate-spin">progress_activity</span> EXECUTING... </>
                      ) : fixed ? (
                        <> <span className="material-symbols-outlined">check_circle</span> FIX DISPATCHED </>
                      ) : (
                        <> <span className="material-symbols-outlined">bolt</span> EXECUTE AUTO-FIX </>
                      )}
                    </button>
                    <button className="w-full bg-surface-container-highest text-slate-300 font-bold py-3 rounded-md border border-outline-variant/50 hover:bg-surface-bright transition-colors text-[10px] uppercase tracking-widest">
                      Dismiss Recommendation
                    </button>
                  </div>
                </div>

                {/* Logs Snippet */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-4">Telemetry Context</h4>
                  <div className="bg-surface-container-lowest p-3 rounded font-mono text-[10px] space-y-2 text-slate-400 overflow-x-auto whitespace-nowrap custom-scrollbar">
                    {(status?.recent_events || []).slice(-3).map((e, i) => (
                      <div key={i}>
                        [{new Date(e.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false })}] {' '}
                        <span className={e.event_type === 'anomaly_detected' ? 'text-error' : 'text-primary'}>
                          {e.event_type.toUpperCase()}
                        </span> {' '}
                        {e.data?.root_cause || e.data?.action_taken || e.event_type}
                      </div>
                    ))}
                    {(!status?.recent_events || status.recent_events.length === 0) && (
                      <div className="opacity-30 tracking-widest uppercase text-center py-2">NO RECENT TELEMETRY</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;

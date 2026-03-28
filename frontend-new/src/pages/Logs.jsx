import React from 'react';
const Logs = ({ status }) => {
  const lineNum = 1027;
  const events = status?.recent_events || [];
  
  // Static placeholder logs for "Rich Aesthetics"
  const staticLogs = [
    { id: 1021, time: '14:02:11', level: 'INFO', service: 'gateway-proxy', msg: 'event: "request_started" | trace_id: "4f2a92c1"' },
    { id: 1023, time: '14:02:15', level: 'ERROR', service: 'auth-db-cluster-01', msg: 'operation timed out after 5000ms', isError: true },
    { id: 1024, time: '14:02:18', level: 'WARN', service: 'worker-04', msg: 'memory_usage: 82% | action: "trigger_garbage_collection"' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-grow flex flex-col bg-surface-container-lowest overflow-hidden border border-outline-variant/10 rounded-lg">
        {/* Control Strip */}
        <div className="bg-surface-container-low px-6 py-3 flex items-center justify-between border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-surface-container-lowest rounded px-3 py-1.5 border border-outline-variant/20">
              <span className="material-symbols-outlined text-xs text-outline mr-2">filter_alt</span>
              <input className="bg-transparent border-none focus:ring-0 text-sm font-mono w-64 placeholder:text-outline/50 text-on-surface" placeholder='Filter stream...' type="text" />
            </div>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-error-container text-on-error-container">Error</button>
              <button className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-secondary-container text-on-secondary-container">Warn</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-outline uppercase tracking-tighter">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Live Streaming
            </div>
          </div>
        </div>

        {/* Terminal View */}
        <div className="flex-grow overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed p-6 selection:bg-primary/30">
          {staticLogs.map(log => (
            <div key={log.id} className={`flex group hover:bg-surface-container-low transition-colors py-1 px-2 rounded -mx-2 ${log.isError ? 'bg-error-container/5' : ''}`}>
              <span className="text-outline/40 w-12 shrink-0 select-none">{log.id}</span>
              <span className="text-secondary/60 w-32 shrink-0 select-none">{log.time}</span>
              <span className={`${log.isError ? 'text-error' : 'text-primary'} w-16 shrink-0 font-bold uppercase`}>{log.level}</span>
              <div className={`flex-grow ${log.isError ? 'text-error' : 'text-on-surface/90'}`}>
                {log.service ? <span className="text-primary-fixed-dim">{log.service}</span> : ''} {log.msg}
              </div>
            </div>
          ))}

          {/* Live events */}
          {events.map((e, i) => {
            const isErr = e.event_type === 'anomaly_detected';
            return (
              <div key={i} className={`flex group hover:bg-surface-container-low transition-colors py-1 px-2 rounded -mx-2 ${isErr ? 'bg-error-container/5' : ''}`}>
                <span className="text-outline/40 w-12 shrink-0 select-none">{lineNum + i}</span>
                <span className="text-secondary/60 w-32 shrink-0 select-none">{new Date(e.timestamp * 1000).toLocaleTimeString('en-GB', { hour12: false })}</span>
                <span className={`${isErr ? 'text-error' : 'text-primary'} w-16 shrink-0 font-bold`}>{isErr ? 'ERROR' : 'INFO'}</span>
                <div className={`flex-grow ${isErr ? 'text-error' : 'text-on-surface/90'}`}>
                  [status-api] {e.data?.root_cause || e.data?.action_taken || e.event_type}
                </div>
              </div>
            );
          })}
          
          <div className="mt-4 flex items-center gap-4 text-outline/30 select-none">
            <div className="h-px flex-grow bg-outline-variant/10"></div>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">New logs arriving...</span>
            <div className="h-px flex-grow bg-outline-variant/10"></div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-80 ml-6 hidden xl:flex flex-col gap-6">
        <div className="bg-surface-container-low/80 backdrop-blur-xl p-6 rounded-xl border border-outline-variant/10 shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-4">Anomalies Detected</h3>
          <div className="space-y-4">
            {events.filter(e => e.event_type === 'anomaly_detected').slice(-2).map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1 h-8 rounded bg-error shadow-[0_0_8px_#ffb4ab]"></div>
                <div>
                  <div className="text-xs font-bold text-on-surface">{a.data?.root_cause || 'Unknown Anomaly'}</div>
                  <div className="text-[10px] text-outline/80 font-mono mt-1">{a.data?.affected_service || '—'}</div>
                </div>
              </div>
            ))}
            {/* Seed anomaly if none present */}
            {events.filter(e => e.event_type === 'anomaly_detected').length === 0 && (
              <div className="flex items-start gap-3 opacity-40">
                <div className="w-1 h-8 rounded bg-secondary shadow-[0_0_8px_#6ed5e3]"></div>
                <div>
                  <div className="text-xs font-bold text-on-surface">No Active Anomalies</div>
                  <div className="text-[10px] text-outline/80 font-mono mt-1">System healthy</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-surface-container-low/80 backdrop-blur-xl p-6 rounded-xl border border-outline-variant/10 shadow-2xl flex-grow">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-4">Log Volume (15m)</h3>
          <div className="h-32 w-full flex items-end gap-1 px-1">
            {[30, 45, 25, 60, 80, 55, 95, 40, 30, 20, 45, 70].map((h, i) => (
              <div 
                key={i} 
                className={`w-2 rounded-t-sm ${h > 90 ? 'bg-error shadow-[0_0_10px_#ffb4ab]' : 'bg-primary/20'} ${i === 11 ? 'animate-pulse bg-primary/60' : ''}`} 
                style={{ height: `${h}%` }}
              ></div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Logs;

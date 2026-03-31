import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

export default function SimulationControls() {
  const [simStatus, setSimStatus] = useState('loading');

  useEffect(() => {
    apiFetch('/simulation/status')
      .then((data) => {
        setSimStatus(data.status || 'stopped');
      })
      .catch(() => {
        setSimStatus('stopped');
      });
  }, []);

  async function handleToggle() {
    const action = simStatus === 'running' ? 'stop' : 'start';
    try {
      setSimStatus('loading');
      const data = await apiFetch(`/simulation/${action}`, { method: 'POST' });
      setSimStatus(data.status || (action === 'start' ? 'running' : 'stopped'));
    } catch {
      // Revert to previous logical state on error
      setSimStatus(action === 'start' ? 'stopped' : 'running');
    }
  }

  const isRunning = simStatus === 'running';
  const isLoading = simStatus === 'loading';

  return (
    <div className="flex items-center gap-sm mt-sm">
      <span className="text-[11px] text-text-muted uppercase tracking-wider">
        {isRunning ? 'SIMULATION ACTIVE' : 'SIMULATION PAUSED'}
      </span>
      <button
        className="px-md py-sm h-11 bg-accent text-bg font-sans font-semibold text-xs uppercase tracking-wider border-none cursor-pointer transition-colors duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isRunning ? 'Stop simulation' : 'Start simulation'}
      >
        {isRunning ? 'STOP SIM' : 'START SIM'}
      </button>
    </div>
  );
}

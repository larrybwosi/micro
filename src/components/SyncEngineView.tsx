import React, { useState, useEffect } from 'react';
import {
  Server,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Copy,
  Check,
  Radio,
  ArrowLeftRight,
  Shield,
  Laptop
} from 'lucide-react';
import { SyncStatus } from '../types';
import { api } from '../services/api';

interface SyncEngineViewProps {
  onSyncComplete?: () => void;
}

export function SyncEngineView({ onSyncComplete }: SyncEngineViewProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [activeMode, setActiveMode] = useState<'HUB' | 'SPOKE'>('HUB');

  // Spoke Form State
  const [hubIp, setHubIp] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [deviceName, setDeviceName] = useState('Spoke-Device');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    try {
      const status = await api.getSyncStatus();
      setSyncStatus(status);
      if (status.hub_ip) setHubIp(status.hub_ip);
      if (status.mode === 'HUB' || status.mode === 'SPOKE') {
        setActiveMode(status.mode);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-poll sync status
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartHub = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const status = await api.startHub();
      setSyncStatus(status);
      setMessage({ type: 'success', text: 'Hub server started successfully. Devices on the local network can now pair using the code below.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start Hub server: ' + err });
    } finally {
      setLoading(false);
    }
  };

  const handlePairSpoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubIp || !pairingCode) {
      setMessage({ type: 'error', text: 'Please enter both the Hub IP Address and Pairing Code.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const status = await api.pairSpoke(hubIp, pairingCode, deviceName);
      setSyncStatus(status);
      setMessage({ type: 'success', text: 'Successfully authenticated and paired with Hub! Starting initial data sync...' });
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const status = await api.triggerSync();
      setSyncStatus(status);
      setMessage({ type: 'success', text: 'Data synchronized successfully with Hub!' });
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setMessage({ type: 'error', text: 'Sync failed: ' + err });
    } finally {
      setLoading(false);
    }
  };

  const copyPairingCode = () => {
    if (syncStatus?.pairing_code) {
      navigator.clipboard.writeText(syncStatus.pairing_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
            Multi-Device Network Sync Engine
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Connect multiple devices working in the same local network using Hub & Spoke synchronization.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xs shadow-sm flex items-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xs border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveMode('HUB')}
          className={`p-4 rounded-xs border text-left transition-all flex items-center justify-between ${
            activeMode === 'HUB'
              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xs ${activeMode === 'HUB' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm">Hub Mode (Central Server)</div>
              <div className={`text-xs mt-0.5 ${activeMode === 'HUB' ? 'text-indigo-200' : 'text-slate-500'}`}>
                Act as the master node and broadcast pairing code to spokes
              </div>
            </div>
          </div>
          {syncStatus?.mode === 'HUB' && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs">
              ACTIVE
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMode('SPOKE')}
          className={`p-4 rounded-xs border text-left transition-all flex items-center justify-between ${
            activeMode === 'SPOKE'
              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xs ${activeMode === 'SPOKE' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm">Spoke Mode (Client Node)</div>
              <div className={`text-xs mt-0.5 ${activeMode === 'SPOKE' ? 'text-indigo-200' : 'text-slate-500'}`}>
                Connect to an active Hub device using pairing code
              </div>
            </div>
          </div>
          {syncStatus?.mode === 'SPOKE' && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs">
              CONNECTED
            </span>
          )}
        </button>
      </div>

      {/* Mode Details Container */}
      {activeMode === 'HUB' && (
        <div className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Hub Network Status & Pairing Code
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Display this Pairing Code on screen. Spokes enter this code to authenticate and sync.
              </p>
            </div>

            <button
              onClick={handleStartHub}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Wifi className="w-4 h-4" />
              {syncStatus?.mode === 'HUB' ? 'Restart Hub Server' : 'Enable Hub Mode'}
            </button>
          </div>

          {/* Pairing Code Big Card */}
          <div className="bg-slate-900 text-white rounded-xs p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Hub Pairing Code
              </span>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-extrabold tracking-widest font-mono text-indigo-400 bg-slate-800 px-5 py-2.5 rounded-xs border border-slate-700">
                  {syncStatus?.pairing_code || '------'}
                </span>
                <button
                  onClick={copyPairingCode}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xs border border-slate-700 transition-colors"
                  title="Copy Pairing Code"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Valid on local area network (LAN / Wi-Fi). Code updates on Hub restart.
              </p>
            </div>

            {/* Network Specs */}
            <div className="bg-slate-800/80 p-4 rounded-xs border border-slate-700/60 w-full md:w-auto text-xs space-y-2 font-mono">
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Hub IP Address:</span>
                <span className="font-bold text-white">{syncStatus?.local_ip || '127.0.0.1'}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Sync Port:</span>
                <span className="font-bold text-white">{syncStatus?.port || 8765}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-slate-400">Connected Spokes:</span>
                <span className="font-bold text-emerald-400">{syncStatus?.paired_devices.length || 0} Devices</span>
              </div>
            </div>
          </div>

          {/* Paired Devices List */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3">Paired Spoke Devices ({syncStatus?.paired_devices.length || 0})</h4>
            {(!syncStatus?.paired_devices || syncStatus.paired_devices.length === 0) ? (
              <div className="border border-dashed border-slate-200 p-8 rounded-xs text-center text-slate-400 text-xs">
                No spoke devices paired yet. Share the pairing code above with devices on the same Wi-Fi or local network.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {syncStatus.paired_devices.map((device, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xs flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-slate-800">{device}</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-xs text-[10px]">
                      PAIRED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeMode === 'SPOKE' && (
        <div className="bg-white rounded-xs border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-600" />
              Pair with Hub Device
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter the IP Address and Pairing Code displayed on the Hub device screen.
            </p>
          </div>

          <form onSubmit={handlePairSpoke} className="max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hub IP Address</label>
              <input
                type="text"
                required
                placeholder="e.g. 192.168.1.50"
                value={hubIp}
                onChange={(e) => setHubIp(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pairing Code (6 digits)</label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. 849201"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-indigo-500/20 font-mono tracking-widest font-bold text-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name / Identifier</label>
              <input
                type="text"
                required
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {loading ? 'Authenticating with Hub...' : 'Authenticate & Pair Device'}
            </button>
          </form>

          {/* Connection Status Box */}
          {syncStatus?.mode === 'SPOKE' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xs p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.is_connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  Status: {syncStatus.is_connected ? 'Connected to Hub' : 'Disconnected'}
                </div>
                <div className="text-slate-500 mt-1">
                  Hub Target: <span className="font-mono text-slate-800">{syncStatus.hub_ip}</span> | Last Synced:{' '}
                  <span className="font-semibold text-slate-800">
                    {syncStatus.last_synced_at ? new Date(syncStatus.last_synced_at).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleManualSync}
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xs shadow-sm flex items-center gap-2 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Sync Data Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

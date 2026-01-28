import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { tauriApi, PortInfo } from '../../../../lib/tauri-api';
import styles from './PortsPanel.module.css';

export const PortsPanel = () => {
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    
    // Refs for optimization
    const portsRef = useRef<PortInfo[]>([]);
    const fetchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const lastFetchRef = useRef<number>(0);
    const isMountedRef = useRef(true);

    const fetchPorts = useCallback(async (force = false) => {
        // Debounce rapid calls
        const now = Date.now();
        if (!force && now - lastFetchRef.current < 1000) {
            return;
        }
        lastFetchRef.current = now;

        try {
            if (!isMountedRef.current) return;
            
            setError(null);
            
            // Use incremental updates if not forcing refresh
            let data: PortInfo[];
            if (!force && portsRef.current.length > 0) {
                try {
                    const changes = await tauriApi.getPortChanges();
                    // If we have changes, merge with existing data
                    if (changes.length > 0) {
                        const existingSet = new Set(
                            portsRef.current.map(p => `${p.port}-${p.protocol}`)
                        );
                        
                        // Remove ports that are no longer listening
                        const updatedPorts = portsRef.current.filter(p => 
                            changes.some(c => c.port === p.port && c.protocol === p.protocol) ||
                            p.state === 'LISTENING'
                        );
                        
                        // Add new/changed ports
                        const newPorts = changes.filter(c => 
                            !existingSet.has(`${c.port}-${c.protocol}`)
                        );
                        
                        data = [...updatedPorts, ...newPorts].sort((a, b) => a.port - b.port);
                    } else {
                        data = portsRef.current; // No changes
                    }
                } catch (e) {
                    // Fallback to full refresh if incremental fails
                    data = await tauriApi.getListeningPorts();
                }
            } else {
                data = await tauriApi.getListeningPorts();
            }
            
            if (!isMountedRef.current) return;
            
            // Only update if data actually changed
            if (JSON.stringify(data) !== JSON.stringify(portsRef.current)) {
                portsRef.current = data;
                setPorts(data);
            } else {
            }
        } catch (err) {
            if (!isMountedRef.current) return;
            // Only set error state for initial fetch or forced refresh
            if (force || portsRef.current.length === 0) {
                setError(err instanceof Error ? err.message : 'Failed to fetch ports');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        // Set mounted flag
        isMountedRef.current = true;
        
        // Initial fetch
        fetchPorts(true);
        
        // Set up polling with proper cleanup and error handling
        let interval = 3000;
        let intervalId: NodeJS.Timeout;
        
        const setupPolling = () => {
            intervalId = setInterval(() => {
                if (isMountedRef.current) {
                    fetchPorts().catch(() => {
                        // Don't update error state for polling errors, just log them
                    });
                }
            }, interval);
        };
        
        setupPolling();

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            isMountedRef.current = false;
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [fetchPorts]);

    // Memoized filtering for performance
    const filteredPorts = useMemo(() => {
        if (!filter) return ports;
        
        const searchLower = filter.toLowerCase();
        return ports.filter((port) => (
            port.port.toString().includes(filter) ||
            port.process_name?.toLowerCase().includes(searchLower) ||
            port.local_address.toLowerCase().includes(searchLower) ||
            port.protocol.toLowerCase().includes(searchLower)
        ));
    }, [ports, filter]);

    // Debounced filter input handler
    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        
        // Clear existing timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        
        // Debounce filter changes
        fetchTimeoutRef.current = setTimeout(() => {
            setFilter(value);
        }, 150);
    }, []);

    if (loading && ports.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading ports...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <span>{error}</span>
                    <button onClick={() => fetchPorts(true)} className={styles.retryButton}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.portColumn}>
                                <input
                                    type="text"
                                    placeholder="Port number or address"
                                    defaultValue={filter}
                                    onChange={handleFilterChange}
                                    className={styles.filterInput}
                                />
                            </th>
                            <th>Forwarded Address</th>
                            <th>Running Process</th>
                            <th>Origin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPorts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={styles.emptyRow}>
                                    {filter ? 'No matching ports found' : 'No listening ports detected'}
                                </td>
                            </tr>
                        ) : (
                            filteredPorts.map((port, index) => (
                                <tr key={`${port.port}-${port.protocol}-${index}`}>
                                    <td className={styles.portCell}>
                                        <span className={styles.portNumber}>{port.port}</span>
                                        <span className={styles.protocol}>{port.protocol}</span>
                                    </td>
                                    <td className={styles.addressCell}>
                                        {port.local_address}
                                    </td>
                                    <td className={styles.processCell}>
                                        {port.process_name || '-'}
                                        {port.pid && (
                                            <span className={styles.pid}>PID: {port.pid}</span>
                                        )}
                                    </td>
                                    <td className={styles.originCell}>
                                        {port.state}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

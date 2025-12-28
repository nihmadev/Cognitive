import { useState, useEffect, useCallback } from 'react';
import { tauriApi, PortInfo } from '../../../../lib/tauri-api';
import styles from './PortsPanel.module.css';

export const PortsPanel = () => {
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const fetchPorts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await tauriApi.getListeningPorts();
            setPorts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ports');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPorts();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchPorts, 5000);
        return () => clearInterval(interval);
    }, [fetchPorts]);

    const filteredPorts = ports.filter((port) => {
        if (!filter) return true;
        const searchLower = filter.toLowerCase();
        return (
            port.port.toString().includes(filter) ||
            port.process_name?.toLowerCase().includes(searchLower) ||
            port.local_address.toLowerCase().includes(searchLower) ||
            port.protocol.toLowerCase().includes(searchLower)
        );
    });

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
                    <button onClick={fetchPorts} className={styles.retryButton}>
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
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
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

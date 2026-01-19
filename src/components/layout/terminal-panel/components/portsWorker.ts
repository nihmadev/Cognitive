// Web Worker for background port data processing
interface PortInfo {
    port: number;
    protocol: string;
    pid: number | null;
    process_name: string | null;
    local_address: string;
    state: string;
}

interface WorkerMessage {
    type: string;
    data: any;
}

self.onmessage = function(e: MessageEvent<WorkerMessage>) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'FILTER_PORTS':
            const { ports, filter } = data;
            const filtered = filterPorts(ports as PortInfo[], filter as string);
            self.postMessage({ type: 'FILTERED_PORTS', data: filtered });
            break;
            
        case 'SORT_PORTS':
            const { ports: unsortedPorts, sortBy } = data;
            const sorted = sortPorts(unsortedPorts as PortInfo[], sortBy as string);
            self.postMessage({ type: 'SORTED_PORTS', data: sorted });
            break;
            
        case 'DETECT_CHANGES':
            const { oldPorts, newPorts } = data;
            const changes = detectPortChanges(oldPorts as PortInfo[], newPorts as PortInfo[]);
            self.postMessage({ type: 'PORT_CHANGES', data: changes });
            break;
    }
};

function filterPorts(ports: PortInfo[], filter: string) {
    if (!filter) return ports;
    
    const searchLower = filter.toLowerCase();
    return ports.filter((port: PortInfo) => (
        port.port.toString().includes(filter) ||
        port.process_name?.toLowerCase().includes(searchLower) ||
        port.local_address.toLowerCase().includes(searchLower) ||
        port.protocol.toLowerCase().includes(searchLower)
    ));
}

function sortPorts(ports: PortInfo[], sortBy: string) {
    const sorted = [...ports];
    switch (sortBy) {
        case 'port':
            return sorted.sort((a, b) => a.port - b.port);
        case 'protocol':
            return sorted.sort((a, b) => a.protocol.localeCompare(b.protocol));
        case 'process':
            return sorted.sort((a, b) => 
                (a.process_name || '').localeCompare(b.process_name || '')
            );
        case 'address':
            return sorted.sort((a, b) => a.local_address.localeCompare(b.local_address));
        default:
            return sorted;
    }
}

function detectPortChanges(oldPorts: PortInfo[], newPorts: PortInfo[]) {
    const oldMap = new Map(oldPorts.map(p => [`${p.port}-${p.protocol}`, p]));
    const newMap = new Map(newPorts.map(p => [`${p.port}-${p.protocol}`, p]));
    
    const added: PortInfo[] = [];
    const removed: PortInfo[] = [];
    const changed: PortInfo[] = [];
    
    // Find added ports
    for (const [key, port] of newMap) {
        if (!oldMap.has(key)) {
            added.push(port);
        } else if (JSON.stringify(port) !== JSON.stringify(oldMap.get(key))) {
            changed.push(port);
        }
    }
    
    // Find removed ports
    for (const [key, port] of oldMap) {
        if (!newMap.has(key)) {
            removed.push(port);
        }
    }
    
    return { added, removed, changed };
}

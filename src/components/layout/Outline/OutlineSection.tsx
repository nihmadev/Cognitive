import { useState, useCallback, ReactElement } from 'react';
import { ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useOutlineStore, OutlineSymbol, SymbolKind } from '../../../store/outlineStore';
import { useProjectStore } from '../../../store/projectStore';
import { useEditorStore } from '../../../store/editorStore';
import clsx from 'clsx';
import styles from './OutlineSection.module.css';

// SVG icons for better visual consistency
const SymbolIcon = ({ kind }: { kind: SymbolKind }) => {
    const colorMap: Record<SymbolKind, string> = {
        file: '#cccccc',
        module: '#c586c0',
        namespace: '#4ec9b0',
        package: '#c586c0',
        class: '#4ec9b0',
        method: '#dcdcaa',
        property: '#9cdcfe',
        field: '#9cdcfe',
        constructor: '#dcdcaa',
        enum: '#4ec9b0',
        interface: '#4ec9b0',
        function: '#dcdcaa',
        variable: '#9cdcfe',
        constant: '#4fc1ff',
        string: '#ce9178',
        number: '#b5cea8',
        boolean: '#569cd6',
        array: '#9cdcfe',
        object: '#9cdcfe',
        key: '#9cdcfe',
        null: '#569cd6',
        enumMember: '#4fc1ff',
        struct: '#4ec9b0',
        event: '#dcdcaa',
        operator: '#d4d4d4',
        typeParameter: '#4ec9b0',
    };

    const iconMap: Record<SymbolKind, ReactElement> = {
        class: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.class} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.class} fontSize="8" fontWeight="bold">C</text>
            </svg>
        ),
        interface: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke={colorMap.interface} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.interface} fontSize="8" fontWeight="bold">I</text>
            </svg>
        ),
        function: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.function} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.function} fontSize="8" fontWeight="bold">f</text>
            </svg>
        ),
        method: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.method} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.method} fontSize="8" fontWeight="bold">m</text>
            </svg>
        ),
        variable: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.variable} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.variable} fontSize="8" fontWeight="bold">v</text>
            </svg>
        ),
        constant: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.constant} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.constant} fontSize="8" fontWeight="bold">c</text>
            </svg>
        ),
        property: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.property} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.property} fontSize="8" fontWeight="bold">p</text>
            </svg>
        ),
        field: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.field} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.field} fontSize="8" fontWeight="bold">f</text>
            </svg>
        ),
        enum: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.enum} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.enum} fontSize="8" fontWeight="bold">E</text>
            </svg>
        ),
        enumMember: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="4" fill={colorMap.enumMember} />
            </svg>
        ),
        constructor: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="8,2 14,14 2,14" stroke={colorMap.constructor} strokeWidth="1.5" fill="none" />
            </svg>
        ),
        module: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.module} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.module} fontSize="8" fontWeight="bold">M</text>
            </svg>
        ),
        namespace: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.namespace} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.namespace} fontSize="8" fontWeight="bold">N</text>
            </svg>
        ),
        typeParameter: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke={colorMap.typeParameter} strokeWidth="1.5" fill="none" />
                <text x="8" y="11" textAnchor="middle" fill={colorMap.typeParameter} fontSize="8" fontWeight="bold">T</text>
            </svg>
        ),
        file: <span style={{ color: colorMap.file }}>📄</span>,
        package: <span style={{ color: colorMap.package }}>📦</span>,
        string: <span style={{ color: colorMap.string }}>""</span>,
        number: <span style={{ color: colorMap.number }}>#</span>,
        boolean: <span style={{ color: colorMap.boolean }}>✓</span>,
        array: <span style={{ color: colorMap.array }}>[]</span>,
        object: <span style={{ color: colorMap.object }}>{'{}'}</span>,
        key: <span style={{ color: colorMap.key }}>🔑</span>,
        null: <span style={{ color: colorMap.null }}>∅</span>,
        struct: <span style={{ color: colorMap.struct }}>🏗️</span>,
        event: <span style={{ color: colorMap.event }}>⚡</span>,
        operator: <span style={{ color: colorMap.operator }}>+</span>,
    };

    return (
        <span className={styles.symbolIcon}>
            {iconMap[kind] || <span style={{ color: '#cccccc' }}>•</span>}
        </span>
    );
};

interface SymbolItemProps {
    symbol: OutlineSymbol;
    depth: number;
    onNavigate: (line: number, column: number) => void;
}

const SymbolItem = ({ symbol, depth, onNavigate }: SymbolItemProps) => {
    const { activeSymbol, expandedSymbols, toggleExpanded, setActiveSymbol } = useOutlineStore();
    const hasChildren = symbol.children && symbol.children.length > 0;
    const isExpanded = expandedSymbols.has(symbol.name);
    const isActive = activeSymbol === symbol.name;

    const handleClick = () => {
        setActiveSymbol(symbol.name);
        onNavigate(symbol.selectionRange.startLine, symbol.selectionRange.startColumn);
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            toggleExpanded(symbol.name);
        }
    };

    return (
        <div className={styles.symbolItemWrap}>
            <div
                className={clsx(styles.symbolRow, isActive && styles.symbolRowActive)}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
            >
                <span className={styles.chevronSlot} onClick={handleToggle}>
                    {hasChildren ? (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <span className={styles.chevronPlaceholder} />
                    )}
                </span>
                <SymbolIcon kind={symbol.kind} />
                <span className={styles.symbolName} title={symbol.detail || symbol.name}>
                    {symbol.name}
                </span>
                {symbol.detail && (
                    <span className={styles.symbolDetail}>{symbol.detail}</span>
                )}
            </div>
            {hasChildren && isExpanded && (
                <div className={styles.symbolChildren}>
                    {symbol.children!.map((child, idx) => (
                        <SymbolItem
                            key={`${child.name}-${idx}`}
                            symbol={child}
                            depth={depth + 1}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface OutlineSectionProps {
    // No props needed - uses global store
}

export const OutlineSection = ({}: OutlineSectionProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const { symbols, isLoading, expandAll, collapseAll } = useOutlineStore();
    const { activeFile } = useProjectStore();
    const { editorInstance } = useEditorStore();

    const handleNavigate = useCallback((line: number, column: number) => {
        if (editorInstance) {
            editorInstance.revealLineInCenter(line);
            editorInstance.setPosition({ lineNumber: line, column });
            editorInstance.focus();
        }
    }, [editorInstance]);

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
                <div className={styles.sectionTitle}>
                    <span className={styles.chev}>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span>Outline</span>
                </div>
                {isOpen && symbols.length > 0 && (
                    <div className={styles.sectionActions} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.actionBtn}
                            title="Collapse All"
                            onClick={collapseAll}
                        >
                            <ChevronsDownUp size={14} />
                        </button>
                        <button
                            className={styles.actionBtn}
                            title="Expand All"
                            onClick={expandAll}
                        >
                            <ChevronsUpDown size={14} />
                        </button>
                    </div>
                )}
            </div>
            {isOpen && (
                <div className={styles.sectionBody}>
                    {isLoading ? (
                        <div className={styles.loading}>Loading symbols...</div>
                    ) : symbols.length === 0 ? (
                        <div className={styles.empty}>
                            {activeFile ? 'No symbols found' : 'No file open'}
                        </div>
                    ) : (
                        <div className={styles.symbolList}>
                            {symbols.map((symbol, idx) => (
                                <SymbolItem
                                    key={`${symbol.name}-${idx}`}
                                    symbol={symbol}
                                    depth={0}
                                    onNavigate={handleNavigate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

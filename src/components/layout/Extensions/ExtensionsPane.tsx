import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import styles from './ExtensionsPane.module.css';
import { useExtensionStore } from '../../../store/extensionStore';

export const ExtensionsPane = () => {
    const { extensions, installExtension } = useExtensionStore();
    const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);
    const [sectionsExpanded, setSectionsExpanded] = useState({
        installed: true,
        popular: true
    });

    const selectedExtension = extensions.find(ext => ext.id === selectedExtensionId);

    const installedExtensions = extensions.filter(ext => ext.installed);
    const popularExtensions = extensions.filter(ext => !ext.installed);

    if (selectedExtension) {
        return (
            <div className={styles.detailPage}>
                <div className={styles.backButton} onClick={() => setSelectedExtensionId(null)}>
                    <ArrowLeft size={16} />
                    <span>Back to Extensions</span>
                </div>
                
                <div className={styles.detailHeader}>
                    <div className={styles.detailIcon}>
                        <img src={`/icons/symbols/files/${selectedExtension.icon}.svg`} alt={selectedExtension.name} />
                    </div>
                    <div className={styles.detailMainInfo}>
                        <div className={styles.detailName}>{selectedExtension.name}</div>
                        <div className={styles.detailPublisher}>{selectedExtension.publisher}</div>
                        <button 
                            className={`${styles.installButton} ${selectedExtension.installed ? styles.installed : ''}`}
                            onClick={() => !selectedExtension.installed && installExtension(selectedExtension.id)}
                        >
                            {selectedExtension.installed ? 'Installed' : 'Install'}
                        </button>
                    </div>
                </div>

                <div className={styles.detailTabs}>
                    <div className={`${styles.detailTab} ${styles.active}`}>Details</div>
                </div>

                <div className={styles.detailContent}>
                    {selectedExtension.description}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.extensionsPane}>
            <div className={styles.header}>Extensions</div>
            <div className={styles.searchContainer}>
                <input 
                    type="text" 
                    placeholder="Search Extensions in Marketplace" 
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.sections}>
                <div className={styles.section}>
                    <div 
                        className={styles.sectionHeader}
                        onClick={() => setSectionsExpanded(prev => ({ ...prev, installed: !prev.installed }))}
                    >
                        {sectionsExpanded.installed ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>Installed</span>
                        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{installedExtensions.length}</span>
                    </div>
                    {sectionsExpanded.installed && (
                        <div className={styles.extensionList}>
                            {installedExtensions.map(ext => (
                                <div 
                                    key={ext.id} 
                                    className={styles.extensionItem}
                                    onClick={() => setSelectedExtensionId(ext.id)}
                                >
                                    <div className={styles.extensionIcon}>
                                        <img src={`/icons/symbols/files/${ext.icon}.svg`} alt={ext.name} />
                                    </div>
                                    <div className={styles.extensionInfo}>
                                        <div className={styles.extensionName}>{ext.name}</div>
                                        <div className={styles.extensionPublisher}>{ext.publisher}</div>
                                        <div className={styles.extensionDescription}>{ext.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.section}>
                    <div 
                        className={styles.sectionHeader}
                        onClick={() => setSectionsExpanded(prev => ({ ...prev, popular: !prev.popular }))}
                    >
                        {sectionsExpanded.popular ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>Popular</span>
                    </div>
                    {sectionsExpanded.popular && (
                        <div className={styles.extensionList}>
                            {popularExtensions.map(ext => (
                                <div 
                                    key={ext.id} 
                                    className={styles.extensionItem}
                                    onClick={() => setSelectedExtensionId(ext.id)}
                                >
                                    <div className={styles.extensionIcon}>
                                        <img src={`/icons/symbols/files/${ext.icon}.svg`} alt={ext.name} />
                                    </div>
                                    <div className={styles.extensionInfo}>
                                        <div className={styles.extensionName}>{ext.name}</div>
                                        <div className={styles.extensionPublisher}>{ext.publisher}</div>
                                        <div className={styles.extensionDescription}>{ext.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

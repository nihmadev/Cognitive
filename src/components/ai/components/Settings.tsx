import { useState } from 'react';
import { ArrowLeft, X, Save, History } from 'lucide-react';
import { useAIStore } from '../../../store/aiStore';

interface AISettingsProps {
  onBack: () => void;
  onClose: () => void;
  setIsHistoryModalOpen: (open: boolean) => void;
  fromView: 'home' | 'chat';
  styles: any;
}

export const AISettings: React.FC<AISettingsProps> = ({ onBack, onClose, setIsHistoryModalOpen, fromView, styles }) => {
  const { apiKeys, setApiKeys, refreshOllamaModels, ollamaLocalModels, availableModels } = useAIStore();
  const [showKeys, setShowKeys] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleApiKeyChange = (provider: keyof typeof apiKeys, value: string) => {
    setApiKeys({ [provider]: value });
  };

  const handleRefreshModels = async () => {
    setIsRefreshing(true);
    try {
      await refreshOllamaModels();
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  const providers = [
    { id: 'openai' as const, name: 'OpenAI', description: '' },
    { id: 'google' as const, name: 'Google', description: '' },
    { id: 'ollama' as const, name: 'Ollama URL', description: 'Default: http://localhost:11434' },
  ];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcons} style={{ marginLeft: 'auto' }}>
          <button onClick={() => setIsHistoryModalOpen(true)} title="History">
            <History size={18} />
          </button>
          <button onClick={onBack} title="Back">
            <ArrowLeft size={18} />
          </button>
          <button onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.settingsMainContent}>
        <div className={styles.settingsSections}>
          <div className={styles.settingsSection}>
            <h3>API Keys</h3>
            {providers.map(provider => (
              <div key={provider.id} className={styles.apiKeyItem}>
                <div className={styles.providerInfo}>
                  <div className={styles.providerName}>{provider.name}</div>
                  <div className={styles.providerDescription}>{provider.description}</div>
                </div>
                <div className={styles.apiKeyInput}>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder={`Enter ${provider.name} API key`}
                    value={apiKeys[provider.id as keyof typeof apiKeys]}
                    onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            ))}
            
            <div className={styles.settingsActions}>
              <button 
                className={styles.toggleVisibilityBtn}
                onClick={() => setShowKeys(!showKeys)}
              >
                {showKeys ? 'Hide' : 'Show'} API Keys
              </button>
              <button className={styles.saveBtn}>
                <Save size={14} />
                Save Settings
              </button>
            </div>
          </div>
          
          <div className={styles.settingsSection}>
            <h3>Ollama Models</h3>
            <p className={styles.settingsDescription}>
              Manage your local Ollama models. Make sure Ollama is installed and running.
            </p>
            
            <div className={styles.settingItem}>
              <button 
                className={styles.refreshBtn}
                onClick={handleRefreshModels}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Local Models'}
              </button>
            </div>

            {ollamaLocalModels.length > 0 && (
              <div className={styles.settingItem}>
                <h4>Downloaded Models:</h4>
                <div className={styles.modelsList}>
                  {ollamaLocalModels.map((model, index) => (
                    <div key={index} className={styles.modelItem}>
                      <span className={styles.modelName}>{model.name}</span>
                      <span className={styles.modelSize}>{formatSize(model.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ollamaLocalModels.length === 0 && (
              <div className={styles.settingItem}>
                <p className={styles.noModels}>No local models found. Make sure Ollama is running and you have downloaded some models.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

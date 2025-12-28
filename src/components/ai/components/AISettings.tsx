import { useState } from 'react';
import { ArrowLeft, X, Save } from 'lucide-react';
import { useAIStore } from '../../../store/aiStore';

interface AISettingsProps {
  onBack: () => void;
  onClose: () => void;
  styles: any;
}

export const AISettings: React.FC<AISettingsProps> = ({ onBack, onClose, styles }) => {
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
      console.error('Failed to refresh models:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const providers = [
    { id: 'openai' as const, name: 'OpenAI', description: 'GPT-4, GPT-3.5 Turbo models' },
    { id: 'anthropic' as const, name: 'Anthropic', description: 'Claude models' },
    { id: 'google' as const, name: 'Google AI', description: 'Gemini models' },
    { id: 'xai' as const, name: 'xAI', description: 'Grok models' },
    { id: 'zhipu' as const, name: 'Zhipu AI', description: 'GLM models' },
    { id: 'yandex' as const, name: 'Yandex', description: 'YandexGPT models' },
    { id: 'gigachat' as const, name: 'GigaChat', description: 'GigaChat models' },
    { id: 'agentrouter' as const, name: 'AgentRouter', description: 'Unified API for multiple models' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcons}>
          <button onClick={onBack} title="Back">
            <ArrowLeft size={18} />
          </button>
          <button onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.settingsMainContent}>
        <div className={styles.settingsTitle}>
          <h2>AI Assistant Settings</h2>
          <p>Configure API keys and model settings</p>
        </div>

        <div className={styles.settingsSections}>
          <div className={styles.settingsSection}>
            <h3>API Keys</h3>
            <p className={styles.settingsDescription}>
              Configure API keys for different AI providers. Keys are stored locally.
            </p>
            
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
                      <span className={styles.modelSize}>{model.size}</span>
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
          
          <div className={styles.settingsSection}>
            <h3>Model Settings</h3>
            <div className={styles.settingItem}>
              <label>Default Model</label>
              <select className={styles.select}>
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.settingItem}>
              <label>Temperature (0-1)</label>
              <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className={styles.slider} />
            </div>
            <div className={styles.settingItem}>
              <label>Max Tokens</label>
              <input type="number" defaultValue="2048" className={styles.input} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

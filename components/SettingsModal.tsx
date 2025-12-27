
import React, { useState } from 'react';
import { Modal, Input, Label, Textarea, Button, Select } from './UI';
import { AppSettings, AVAILABLE_VOICES, AVAILABLE_MODELS, DEFAULT_SYSTEM_PROMPT } from '../types';
import { Check, Cloud, Database, Key, LogIn } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isCustomModel, setIsCustomModel] = useState(!AVAILABLE_MODELS.some(m => m.id === settings.model));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleModelChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomModel(true);
      setFormData(prev => ({ ...prev, model: '' }));
    } else {
      setIsCustomModel(false);
      setFormData(prev => ({ ...prev, model: value }));
    }
  };

  const handleSave = () => {

    // Auto-enable supabase flag if keys are present
    const hasSupabaseCreds = !!(formData.supabaseUrl && formData.supabaseKey);
    const finalSettings = {
      ...formData,
      useSupabase: hasSupabaseCreds // Force true if keys exist, false if not
    };

    onSave(finalSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to GT Assistant">
      <div className="space-y-8">

        {/* Error Banner */}
        {/* Error Banner - Removed as API key validation is removed */}
        {/* {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-300">
                {error}
            </div>
        )} */}

        {/* Removed 1. Mandatory Engine Config */}

        {/* 1. Optional Cloud Login */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200/50 dark:border-white/10">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-bold shadow-sm ring-1 blue-500/20">1</span>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Cloud Database (Optional)
              </h4>
              <p className="text-[10px] text-gray-500">Connect Supabase to sync chat history across devices.</p>
            </div>
          </div>

          <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-white/5 space-y-4">
            <div className="space-y-2">
              <Label>Supabase Project URL</Label>
              <Input
                size="sm"
                value={formData.supabaseUrl || ''}
                onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                placeholder="https://your-project.supabase.co"
              />
            </div>
            <div className="space-y-2">
              <Label>Supabase Anon Key</Label>
              <Input
                size="sm"
                type="password"
                value={formData.supabaseKey || ''}
                onChange={(e) => handleChange('supabaseKey', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
              />
            </div>
          </div>
        </section>

        {/* 3. Customization */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors py-2">
            <span>Advanced Customization (Model, Voice, Search)</span>
            <div className="h-px bg-gray-200 dark:bg-white/10 flex-1 ml-2"></div>
          </summary>

          <div className="space-y-6 pt-4 animate-in slide-in-from-top-2">
            {/* Web Search Config */}
            <div className="space-y-3">
              <Label>Web Search Provider</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Select
                    value={formData.searchProvider || 'tavily'}
                    onChange={(e) => handleChange('searchProvider', e.target.value)}
                  >
                    <option value="tavily">Tavily</option>
                    <option value="brave">Brave Search</option>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    type="password"
                    value={formData.searchProvider === 'brave' ? (formData.braveApiKey || '') : (formData.tavilyApiKey || '')}
                    onChange={(e) => {
                      const key = formData.searchProvider === 'brave' ? 'braveApiKey' : 'tavilyApiKey';
                      handleChange(key, e.target.value);
                    }}
                    placeholder={`${formData.searchProvider === 'brave' ? 'Brave' : 'Tavily'} API Key`}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label>Default Model</Label>
              <Select
                value={isCustomModel ? 'custom' : formData.model}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
                <option value="custom">Custom Model ID...</option>
              </Select>
              {isCustomModel && (
                <Input
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="e.g. user/model-name"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>System Persona</Label>
              <Textarea
                value={formData.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                placeholder={DEFAULT_SYSTEM_PROMPT}
                className="h-20 text-sm"
              />
            </div>

            {/* Voice */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TTS Voice</Label>
                <Select
                  value={formData.ttsVoice}
                  onChange={(e) => handleChange('ttsVoice', e.target.value)}
                >
                  {AVAILABLE_VOICES.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Speed ({formData.ttsSpeed}x)</Label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={formData.ttsSpeed}
                  onChange={(e) => handleChange('ttsSpeed', parseFloat(e.target.value))}
                  className="w-full mt-3 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        </details>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200/50 dark:border-white/10">
          <Button onClick={handleSave} className="px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 h-12 text-base">
            {formData.supabaseUrl && formData.supabaseKey ? (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Save & Connect
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Start Assistant
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;

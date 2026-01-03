import React, { useState } from 'react';
import { Modal, Input, Label, Textarea, Button, Select } from './UI';
import { AppSettings, AVAILABLE_VOICES, AVAILABLE_MODELS, DEFAULT_SYSTEM_PROMPT } from '../types';
import {
    User,
    Settings,
    Zap,
    Key,
    Cloud,
    Database,
    Cpu,
    Volume2,
    Globe,
    ShieldCheck,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { useCredits } from '../context/CreditContext';
import { useUser } from '@clerk/clerk-react';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
}

type SettingsTab = 'general' | 'ai' | 'tts' | 'cloud' | 'api';

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const { user } = useUser();
    const { subscriptionTier, dailyCredits, credits } = useCredits();
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
    const [formData, setFormData] = useState<AppSettings>(settings);
    const [isCustomModel, setIsCustomModel] = useState(!AVAILABLE_MODELS.some(m => m.id === settings.model));
    const [error, setError] = useState<string | null>(null);

    const isPro = subscriptionTier === 'pro';
    const isPlus = subscriptionTier === 'plus' || isPro;

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
        onSave(formData);
        onClose();
    };

    const tabs = [
        { id: 'ai', label: 'AI Configuration', icon: Cpu, pro: false },
        { id: 'general', label: 'Profile & Details', icon: User, pro: false },
        { id: 'tts', label: 'Voice & TTS', icon: Volume2, pro: false },
        { id: 'cloud', label: 'Cloud Sync', icon: Database, pro: true },
        { id: 'api', label: 'API Keys', icon: Key, pro: true },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Account Settings"
            size="xl"
            showCloseButton={true}
        >
            <div className="flex flex-col md:flex-row h-[600px] -m-6 divide-x divide-gray-100 dark:divide-white/5">

                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 bg-gray-50/50 dark:bg-slate-900/30 p-4 shrink-0 overflow-y-auto">
                    <div className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isLocked = tab.pro && !isPlus;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => !isLocked && setActiveTab(tab.id as SettingsTab)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5'
                                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                                        <span>{tab.label}</span>
                                    </div>
                                    {isLocked && <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-primary fill-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Member Status</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 dark:text-white uppercase mb-4">{subscriptionTier} TIER</p>

                        <div className="space-y-3 pt-3 border-t border-primary/10">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Daily Allowance</span>
                                <span className="text-sm font-black text-primary">{dailyCredits}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Permanent Credits</span>
                                <span className="text-sm font-black text-gray-700 dark:text-gray-300">{credits}</span>
                            </div>
                        </div>

                        {!isPro && (
                            <button
                                onClick={() => {
                                    onClose();
                                    const event = new CustomEvent('open-view', { detail: 'pricing' });
                                    window.dispatchEvent(event);
                                }}
                                className="mt-4 w-full py-2 rounded-xl bg-primary text-[9px] font-bold text-white uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1">
                                Upgrade Plan <ChevronRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-950/50">

                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">Profile Details</h3>
                                <p className="text-sm text-gray-500">Manage your account information and security.</p>
                            </div>

                            <div className="flex items-center gap-6 p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary/10" alt="Profile" />
                                ) : (
                                    <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-black text-primary border border-primary/20">
                                        {user?.firstName?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{user?.fullName || 'Anonymous User'}</h4>
                                    <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest px-0 h-auto hover:bg-transparent">Update profile</Button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            size="sm"
                                            value={user?.fullName || ''}
                                            readOnly
                                            className="bg-gray-50/30 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 cursor-not-allowed opacity-80"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <Input
                                            size="sm"
                                            value={user?.username || user?.firstName?.toLowerCase() || ''}
                                            readOnly
                                            className="bg-gray-50/30 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 cursor-not-allowed opacity-80"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email addresses</Label>
                                        <div className="p-3 rounded-xl bg-gray-50/30 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{user?.primaryEmailAddress?.emailAddress}</span>
                                            <span className="text-[9px] font-black px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 uppercase tracking-widest">Primary</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Identity Status</Label>
                                        <div className="p-3 rounded-xl bg-gray-50/30 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Verified Member</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Security & Preferences</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Button variant="secondary" className="justify-between px-4 h-12 rounded-2xl group">
                                            <span className="text-sm font-bold">Change Password</span>
                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </Button>
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/30 dark:bg-slate-900/30 border border-gray-100 dark:border-white/5">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs">Default Start View</Label>
                                                <p className="text-[10px] text-gray-500 font-medium">Toggle where you begin</p>
                                            </div>
                                            <Select
                                                className="w-24 text-[10px] h-8 font-black uppercase"
                                                value={formData.welcomeView || 'chat'}
                                                onChange={(e) => handleChange('welcomeView', e.target.value)}
                                            >
                                                <option value="chat">Chat</option>
                                                <option value="media">Studio</option>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">AI Configuration</h3>
                                <p className="text-sm text-gray-500">Fine-tune the reasoning engine.</p>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="space-y-2">
                                    <Label>Preferred Model</Label>
                                    <Select
                                        value={isCustomModel ? 'custom' : formData.model}
                                        onChange={(e) => handleModelChange(e.target.value)}
                                    >
                                        {AVAILABLE_MODELS.map(model => (
                                            <option key={model.id} value={model.id}>{model.name}</option>
                                        ))}
                                        <option value="custom">Custom Endpoint...</option>
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
                                    <div className="flex items-center justify-between">
                                        <Label>System Persona</Label>
                                        <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">Customizable</span>
                                    </div>
                                    <Textarea
                                        value={formData.systemPrompt}
                                        onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                        placeholder={DEFAULT_SYSTEM_PROMPT}
                                        className="h-32 text-sm italic"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tts' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">Voice & Lexicon</h3>
                                <p className="text-sm text-gray-500">Configure how the assistant speaks to you.</p>
                            </div>

                            <div className="space-y-8 pt-4">
                                <div className="space-y-4">
                                    <Label>Speaker Profile</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {AVAILABLE_VOICES.map(voice => (
                                            <button
                                                key={voice}
                                                onClick={() => handleChange('ttsVoice', voice)}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${formData.ttsVoice === voice
                                                    ? 'bg-primary/10 border-primary text-primary shadow-inner'
                                                    : 'bg-transparent border-gray-100 dark:border-white/5 text-gray-500 hover:border-gray-200'
                                                    }`}
                                            >
                                                {formData.ttsVoice === voice && <Sparkles className="w-3.5 h-3.5 fill-current" />}
                                                {voice}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Speech Speed</Label>
                                        <span className="text-xs font-black text-primary">{formData.ttsSpeed}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={formData.ttsSpeed}
                                        onChange={(e) => handleChange('ttsSpeed', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                        <span>Slow</span>
                                        <span>Normal</span>
                                        <span>Fast</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cloud' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white uppercase tracking-tighter">Cloud Persistence</h3>
                                    <div className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-widest">PLUS+</div>
                                </div>
                                <p className="text-sm text-gray-500">Sync history across all browsers and devices.</p>
                            </div>

                            <div className="space-y-4 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                                <div className="space-y-2">
                                    <Label>Supabase Instance URL</Label>
                                    <Input
                                        size="sm"
                                        value={formData.supabaseUrl || ''}
                                        onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                                        placeholder="https://abc.supabase.co"
                                        className="bg-white/50 dark:bg-slate-900/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Supabase Public Key</Label>
                                    <Input
                                        size="sm"
                                        type="password"
                                        value={formData.supabaseKey || ''}
                                        onChange={(e) => handleChange('supabaseKey', e.target.value)}
                                        className="bg-white/50 dark:bg-slate-900/50"
                                    />
                                </div>
                                <p className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold uppercase tracking-wide mt-2">
                                    <ShieldCheck className="w-3 h-3" />
                                    Encrypted end-to-end sync active
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white uppercase tracking-tighter">Advanced Gateways</h3>
                                    <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">PRO</div>
                                </div>
                                <p className="text-sm text-gray-500">Manage third-party search and intelligence providers.</p>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="space-y-3">
                                    <Label>Search Abstraction</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Select
                                            value={formData.searchProvider || 'tavily'}
                                            onChange={(e) => handleChange('searchProvider', e.target.value)}
                                        >
                                            <option value="tavily">Tavily Engine</option>
                                            <option value="brave">Brave AI Search</option>
                                        </Select>
                                        <Input
                                            type="password"
                                            value={formData.searchProvider === 'brave' ? (formData.braveApiKey || '') : (formData.tavilyApiKey || '')}
                                            onChange={(e) => {
                                                const key = formData.searchProvider === 'brave' ? 'braveApiKey' : 'tavilyApiKey';
                                                handleChange(key, e.target.value);
                                            }}
                                            placeholder="API Access Key"
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                    <p className="text-[10px] text-gray-400 font-medium">As a Pro member, you can also bring your own keys for custom LLM endpoints in the AI Configuration tab.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-slate-900/10">
                <Button variant="glass" onClick={onClose} className="px-6 rounded-xl font-bold text-xs uppercase tracking-widest">
                    Discard
                </Button>
                <Button onClick={handleSave} className="px-6 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                    Save Changes
                </Button>
            </div>
        </Modal>
    );
};

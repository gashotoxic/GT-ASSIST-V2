import React, { useState } from 'react';
import { Modal, Button } from './UI';
import { AVAILABLE_MODELS } from '../types';
import { Cpu, Check } from 'lucide-react';

interface BranchModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (modelId: string) => void;
    currentModel: string;
}

export const BranchModelModal: React.FC<BranchModelModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentModel
}) => {
    const [selectedModel, setSelectedModel] = useState(currentModel);

    const handleConfirm = () => {
        onConfirm(selectedModel);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Branch Conversation" size="md">
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose a model to power this new branch. All previous messages will be copied.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {AVAILABLE_MODELS.map((model) => (
                        <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left ${selectedModel === model.id
                                    ? 'bg-primary/10 border-primary shadow-sm shadow-primary/10'
                                    : 'border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedModel === model.id
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                                    }`}>
                                    <Cpu className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className={`font-semibold text-sm ${selectedModel === model.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {model.name}
                                    </div>
                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[180px]">
                                        {model.id}
                                    </div>
                                </div>
                            </div>
                            {selectedModel === model.id && (
                                <Check className="w-5 h-5 text-primary" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} className="px-8 shadow-primary/20">
                        Start Branch
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

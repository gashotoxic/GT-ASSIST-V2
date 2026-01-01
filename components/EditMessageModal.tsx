import React, { useState, useEffect } from 'react';
import { Modal, Textarea, Button } from './UI';
import { Message } from '../types';

interface EditMessageModalProps {
    message: Message;
    isOpen: boolean;
    onClose: () => void;
    onSave: (content: string) => void;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
    message,
    isOpen,
    onClose,
    onSave
}) => {
    const [content, setContent] = useState('');

    // Update content when message changes or modal opens
    useEffect(() => {
        if (typeof message.content === 'string') {
            setContent(message.content);
        } else if (Array.isArray(message.content)) {
            // Handle array content (e.g. text + image), extract text part
            const textPart = message.content.find(p => p.type === 'text');
            setContent(textPart?.text || '');
        }
    }, [message, isOpen]);

    const handleSave = () => {
        if (content.trim()) {
            onSave(content);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Message" size="md">
            <div className="space-y-4">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="resize-none text-base"
                    placeholder="Edit your message..."
                    autoFocus
                />
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!content.trim()}>
                        Save & Resend
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

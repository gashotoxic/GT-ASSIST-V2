
export function summarizePrompt(prompt: string, maxLength: number = 30): string {
    if (!prompt) return 'New Conversation';

    // Remove common starting phrases and fillers
    let clean = prompt.replace(/^(please|can you|could you|i want to|draw me|generate|create|make|an image of|a picture of|a video of|show me|tell me about)\s+/i, '');

    // Truncate to first line or reasonable length
    clean = clean.split('\n')[0];

    // If it's still too long, take the first 4-5 words
    if (clean.length > maxLength) {
        const words = clean.split(/\s+/).slice(0, 5);
        clean = words.join(' ');
    }

    // Capitalize first letter
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    // Add ellipsis if needed but keep it short
    if (clean.length > maxLength) {
        clean = clean.slice(0, maxLength - 3) + '...';
    }

    return clean;
}

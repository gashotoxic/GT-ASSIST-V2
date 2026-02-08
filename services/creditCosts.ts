/**
 * Centralized Credit Costs Configuration
 * All credit costs are defined here to avoid inconsistencies
 */

// All actions cost 1 credit
export const CREDIT_COSTS = {
  chat: {
    'zai-org/GLM-4.6': 1,
    'moonshotai/Kimi-K2-Thinking': 1,
    'moonshotai/Kimi-K2.5': 1,
    'deepseek-ai/DeepSeek-R1-0528': 1,
    // Default cost for unknown models
    default: 1
  },
  image: {
    hunyuan: 1,
    'qwen-image': 1,
    'z-image-turbo': 1,
    hidream: 1,
    'juggernaut-xl': 1,
    'flux-schnell': 1,
    default: 1
  },
  video: {
    'wan-2.2-i2v': 1,
    'wan-2.1-t2v': 1,
    'ltx-2-i2v': 1,
    'ltx-2-t2v': 1,
    musetalk: 1,
    default: 1
  },
  edit: {
    'qwen-image-edit': 1,
    default: 1
  },
  // Media studio operations
  media: {
    image: 1,
    edit: 1,
    video: 1
  }
};

// Helper function to get credit cost for an action and model
export function getCreditCost(action: keyof typeof CREDIT_COSTS, model?: string): number {
  if (action === 'media') {
    return CREDIT_COSTS.media[model as keyof typeof CREDIT_COSTS.media] || 1;
  }
  
  const actionCosts = CREDIT_COSTS[action];
  if (!actionCosts) return 1;
  
  if (typeof actionCosts === 'object' && 'default' in actionCosts) {
    return (model && model in actionCosts) 
      ? (actionCosts as Record<string, number>)[model] 
      : (actionCosts as { default: number }).default;
  }
  
  return 1;
}

// Default credit balance for new users
export const DEFAULT_CREDITS = 10;

// Guest credits (for unauthenticated users)
export const GUEST_CREDITS = 10;

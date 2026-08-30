/**
 * Centralized Credit Costs Configuration
 * All credit costs are defined here to avoid inconsistencies
 */

// All actions cost 1 credit
export const CREDIT_COSTS = {
  chat: {
    'Nemotron-3-Nano-Omni-30B-TEE': 1,
    'deepseek-ai/DeepSeek-V3.2-TEE': 1,
    'deepseek-ai/DeepSeek-V4-Flash-0731-TEE': 1,
    'moonshotai/Kimi-K2.6-TEE': 1,
    'moonshotai/Kimi-K3-TEE': 1,
    'google/gemma-4-31B-turbo-TEE': 1,
    'Qwen/Qwen3.6-27B-TEE': 1,
    'Qwen/Qwen3.8-27B-TEE': 1,
    'Qwen/Qwen3.5-397B-A17B-TEE': 1,
    'Qwen/Qwen3-32B-TEE': 1,
    'Qwen/Qwen3-235B-A22B-Thinking-2507-TEE': 1,
    'zai-org/GLM-5.1-TEE': 1,
    'zai-org/GLM-5.2-TEE': 1,
    'unsloth/Mistral-Nemo-Instruct-2407-TEE': 1,
    // Default cost for unknown models
    default: 1
  },
  image: {
    'qwen-image-2512': 1,
    'z-image-turbo': 1,
    'flux': 1,
    'dreamshaper': 1,
    'ilustmix': 1,
    'juggernaut': 1,
    default: 1
  },
  video: {
    'wan-2.2-i2v': 1,
    'wan-2.1-t2v': 1,
    'ltx-25-i2v': 1,
    'ltx-25-t2v': 1,
    musetalk: 1,
    default: 1
  },
  edit: {
    'qwen-image-edit': 1,
    'remove_bg': 1,
    'upscale': 2,
    'style_transfer': 1,
    default: 1
  },
  // Media studio operations
  media: {
    image: 1,
    edit: 1,
    video: 1
  },
  // Photoshop Corner AI operations
  photoshop_ai: {
    generate: 5,
    edit: 3,
    remove_bg: 2,
    upscale_2x: 3,
    upscale_4x: 4,
    smart_fill: 3,
    style_transfer: 3,
    default: 3
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

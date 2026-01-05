/**
 * Paystack Configuration and Pricing Plans
 * Standardized for the Kenyan Market (KES)
 */

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx';

export interface PricingPlan {
    id: string; // Paystack Plan Code
    name: string;
    tier: 'basic' | 'plus' | 'pro';
    price: number; // KES
    dailyCredits: number;
    features: string[];
    popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'PLN_x6kcyeqtmwqbeca', // Basic Plan Code
        name: 'Basic',
        tier: 'basic',
        price: 1000,
        dailyCredits: 300,
        features: [
            'All chat models',
            'Image generation',
            'Basic editing',
            '300 credits/day',
        ],
    },
    {
        id: 'PLN_qc1j9mcx0vv3hbf', // Plus Plan Code
        name: 'Plus',
        tier: 'plus',
        price: 2000,
        dailyCredits: 500,
        features: [
            'Everything in Basic',
            'Video generation',
            'Bring your own keys',
            '500 credits/day',
        ],
        popular: true,
    },
    {
        id: 'PLN_krcucsvyw6hucdo', // Pro Plan Code
        name: 'Pro',
        tier: 'pro',
        price: 3000,
        dailyCredits: 999999,
        features: [
            'Everything in Plus',
            'Unlimited credits',
            'Priority support',
            'Early access features',
        ],
    },
];

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number; // KES
}

export const CREDIT_PACKAGES: CreditPackage[] = [
    { id: 'credits_50', name: 'Starter', credits: 50, price: 100 },
    { id: 'credits_150', name: 'Popular', credits: 150, price: 200 },
    { id: 'credits_500', name: 'Power User', credits: 500, price: 500 },
];

/**
 * Paystack Metadata structure
 */
export interface PaystackMetadata {
    userId: string;
    type: 'payment' | 'subscription';
    packageId?: string;
    planId?: string;
}

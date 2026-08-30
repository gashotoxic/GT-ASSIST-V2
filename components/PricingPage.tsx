import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Zap, Crown, ArrowLeft, CreditCard, Star, ShieldCheck, Flame } from 'lucide-react';
import { Button } from './UI';
import { useAuthContext } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';
import { usePaystackPayment } from 'react-paystack';
import { PRICING_PLANS, CREDIT_PACKAGES, PAYSTACK_PUBLIC_KEY, PaystackMetadata } from '../lib/paystack';

interface PricingPageProps {
    onBack: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack }) => {
    const { userId, isSignedIn, user } = useAuthContext();
    const { credits, subscriptionTier, refetch } = useCredits();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const initializePayment = usePaystackPayment(config);

    const handlePaystackSuccess = (reference: Record<string, unknown>) => {
        console.log('Payment successful:', reference);
        setLoading(null);
        setShowSuccess(true);
        setError(null);

        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);

        // Refresh credits after a delay to allow webhook to process
        setTimeout(() => {
            refetch();
        }, 2000);
        // Also refetch again a bit later just in case
        setTimeout(() => {
            refetch();
        }, 5000);
    };

    const handlePaystackClose = () => {
        console.log('Payment closed');
        setLoading(null);
    };

    const handleSubscribe = async (planId: string, price: number) => {
        if (!isSignedIn || !userId || !user?.primaryEmailAddress?.emailAddress) {
            setError('Please sign in first');
            return;
        }
        setLoading(planId);
        setError(null);

        const paystackConfig = {
            reference: (new Date()).getTime().toString(),
            email: user.primaryEmailAddress.emailAddress,
            amount: price * 100, // Paystack expects amount in cents/kobo
            publicKey: PAYSTACK_PUBLIC_KEY,
            currency: 'KES',
            metadata: {
                userId,
                type: 'subscription',
                planId
            } as PaystackMetadata,
            plan: planId // Paystack automatic subscription handles this via plan code
        };

        setConfig(paystackConfig);
    };

    const handleBuyCredits = async (packageId: string, price: number) => {
        if (!isSignedIn || !userId || !user?.primaryEmailAddress?.emailAddress) {
            setError('Please sign in first');
            return;
        }
        setLoading(packageId);
        setError(null);

        const paystackConfig = {
            reference: (new Date()).getTime().toString(),
            email: user.primaryEmailAddress.emailAddress,
            amount: price * 100,
            publicKey: PAYSTACK_PUBLIC_KEY,
            currency: 'KES',
            metadata: {
                userId,
                type: 'payment',
                packageId
            } as PaystackMetadata
        };

        setConfig(paystackConfig);
    };

    // Effect to trigger Paystack when config is set
    useEffect(() => {
        if (config) {
            initializePayment({ onSuccess: handlePaystackSuccess, onClose: handlePaystackClose });
            setConfig(null); // Reset after initialization
        }
    }, [config, initializePayment]);

    const tierIcons = {
        basic: Zap,
        plus: Flame,
        pro: Crown,
    };

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-primary/30">
            <div className="max-w-6xl mx-auto px-6 py-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="space-y-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Chat
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Choose Your <span className="text-primary italic">Plan</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm">
                            Fuel your creativity with additional credits or unlock the full power of GT Assistant with a monthly subscription.
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl w-full md:min-w-[320px] flex flex-col items-center shadow-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                            <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Your Balance</span>

                        <div className="grid grid-cols-2 gap-4 w-full mt-2">
                            <div className="flex flex-col items-center border-r border-slate-200 dark:border-slate-800">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Daily</span>
                                <span className="text-2xl font-bold">{useCredits().dailyCredits}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Permanent</span>
                                <span className="text-2xl font-bold">{credits}</span>
                            </div>
                        </div>

                        <div className="mt-4 px-3 py-1 bg-primary/10 rounded-full text-[9px] font-bold uppercase tracking-wider text-primary">
                            {subscriptionTier} tier
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/20 text-red-600 dark:text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {showSuccess && (
                    <div className="mb-8 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/20 text-emerald-600 dark:text-emerald-400 text-sm text-center font-bold animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        Payment successful! Your credits will be updated shortly.
                    </div>
                )}

                {/* Section 1: One-Time Credit Packs */}
                <section className="mb-16">
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-lg font-bold">Credit Packs</h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {CREDIT_PACKAGES.map((pkg) => (
                            <div
                                key={pkg.id}
                                className="group relative p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                            >
                                <h3 className="text-base font-bold mb-1">{pkg.name} Pack</h3>
                                <div className="flex items-baseline gap-1 mt-3">
                                    <span className="text-3xl font-bold">{pkg.credits}</span>
                                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Credits</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-xl font-bold mb-4">KES {pkg.price}</div>
                                    <Button
                                        variant="primary"
                                        className="w-full rounded-xl py-3 text-sm font-bold"
                                        disabled={!isSignedIn || loading === pkg.id}
                                        onClick={() => handleBuyCredits(pkg.id, pkg.price)}
                                    >
                                        {loading === pkg.id ? 'Processing...' : 'Purchase Pack'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 2: Monthly Subscriptions */}
                <section className="mb-16">
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-lg font-bold">Subscription Plans</h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PRICING_PLANS.map((plan) => {
                            const Icon = tierIcons[plan.tier as keyof typeof tierIcons] || Zap;
                            const isCurrentPlan = subscriptionTier === plan.tier;
                            const isPremium = plan.popular;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col p-6 rounded-3xl transition-all border
                                        ${isPremium
                                            ? 'bg-white dark:bg-slate-900 border-primary ring-4 ring-primary/10 shadow-xl z-10 md:scale-105'
                                            : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-sm'}`}
                                >
                                    {isPremium && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                                            Recommended
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPremium ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold uppercase tracking-tight">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1 mt-0.5">
                                                <span className="text-sm font-bold text-slate-400">KES</span>
                                                <span className="text-2xl font-bold text-slate-800 dark:text-white">{plan.price.toLocaleString()}</span>
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">/ mo</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 mb-10">
                                        {plan.features.map((feature) => (
                                            <div key={feature} className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                                                </div>
                                                <span className="text-sm text-slate-600 dark:text-slate-400 leading-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        onClick={() => handleSubscribe(plan.id, plan.price)}
                                        disabled={!isSignedIn || isCurrentPlan || loading === plan.id}
                                        className={`w-full rounded-2xl py-6 font-bold transition-all
                                            ${isCurrentPlan
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                                                : isPremium
                                                    ? 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20'
                                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        {loading === plan.id ? 'Processing...' : isCurrentPlan ? 'Current Plan' : `Join ${plan.name}`}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Trust Signatures */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 mt-12 border-t border-slate-200 dark:border-slate-800 opacity-60">
                    {[
                        { icon: ShieldCheck, label: 'Secure Billing' },
                        { icon: Sparkles, label: 'Cloud Access' },
                        { icon: Star, label: 'Pro Models' },
                        { icon: Zap, label: 'Instant Delivery' }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 text-center text-slate-500">
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>

                {!isSignedIn && (
                    <div className="mt-8 text-center">
                        <p className="text-primary text-sm font-bold animate-pulse">
                            Please sign in to access these plans
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PricingPage;

import React from 'react';

interface Plan {
  id: string;
  name: string;
  price: string;
  billingPeriod: string;
  description: string;
  features: string[];
  popular?: boolean;
  checkoutUrl: string;
}

export function SubscriptionPlans() {
  const plans: Plan[] = [
    {
      id: 'monthly',
      name: 'KIVORA Plus',
      price: '9,99 €',
      billingPeriod: 'pro Monat',
      description: 'Perfekt für regelmäßige Nutzer, die exklusive Creator-Features freischalten möchten.',
      features: [
        'HD-Streaming & Story-Uploads',
        'Erweiterter Privatsphäre- & Datenschutz',
        'Keine Werbeunterbrechungen',
        'Exklusives Profil-Badge',
      ],
      checkoutUrl: 'https://checkout.stripe.com/pay/dein-monats-link',
    },
    {
      id: 'yearly',
      name: 'KIVORA Creator VIP',
      price: '89,99 €',
      billingPeriod: 'pro Jahr (25% Rabatt)',
      description: 'Für professionelle Creator mit maximalen Sicherheits-Tools und Priority-Support.',
      features: [
        'Alle Funktionen von KIVORA Plus',
        'Unbegrenzter Datentresor-Speicher',
        'Priorisierter Support & Verifizierung',
        'Zugang zu exklusiven Monetarisierungs-Tools',
      ],
      popular: true,
      checkoutUrl: 'https://checkout.stripe.com/pay/dein-jahres-link',
    },
  ];

  const handleSubscribe = (url: string) => {
    // Weiterleitung zu Stripe Checkout
    window.location.href = url;
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          Wähle dein KIVORA Abo
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Schalte Premium-Funktionen frei und unterstütze ein sicheres, verlässliches Netzwerk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl p-8 border transition-all ${
              plan.popular
                ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10'
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 right-8 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Beliebt
              </span>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">{plan.price}</span>
              <span className="text-sm font-medium text-slate-400 ml-2">{plan.billingPeriod}</span>
            </div>

            <ul className="mb-8 space-y-4 flex-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-slate-300">
                  <svg
                    className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.checkoutUrl)}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition text-center ${
                plan.popular
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              Jetzt abonnieren
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
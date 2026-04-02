import { Zap } from 'lucide-react'

export default function HeroHeader() {
  return (
    <header className="text-center mb-12">
      {/* Logo mark */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
        bg-accent/10 border border-accent/30 mb-6 mx-auto">
        <Zap size={26} className="text-accent" fill="currentColor" />
      </div>

      {/* Title */}
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-text-primary glow-text mb-3 tracking-tight">
        SmartBuy <span className="text-accent">AI</span>
      </h1>

      {/* Tagline */}
      <p className="text-text-secondary text-base sm:text-lg max-w-lg mx-auto font-body font-light">
        Live product comparison powered by{' '}
        <span className="text-accent-glow">Google Shopping search</span> &{' '}
        <span className="text-gold">AI decision-making</span>
      </p>

      {/* Pipeline pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {['Query Parser', 'Google Shopping', 'Fallback Catalog', 'Matcher', 'AI Decision Engine'].map((step) => (
          <span
            key={step}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full
              bg-void border border-border text-text-muted font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
            {step}
          </span>
        ))}
      </div>
    </header>
  )
}

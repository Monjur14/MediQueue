import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { ProblemSection } from './ProblemSection';
import { HowItWorks } from './HowItWorks';
import { Features } from './Features';
import { TaglineReveal } from './TaglineReveal';
import { TrustStrip } from './TrustStrip';
import { Pricing } from './Pricing';
import { ContactSection } from './ContactSection';
import { FinalCta } from './FinalCta';
import { Footer } from './Footer';
import { HomeTracker } from './HomeTracker';

export function HomePage() {
  return (
    <div className="min-h-screen bg-mq-ground text-mq-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-mq-ink focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <HomeTracker />
      <Navbar />
      <main id="main">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <Features />
        <TrustStrip />
        <TaglineReveal />
        <Pricing />
        <ContactSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

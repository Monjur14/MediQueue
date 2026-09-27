import type { Metadata } from 'next';
import { Navbar } from '@/components/home/Navbar';
import { Footer } from '@/components/home/Footer';
import { FinalCta } from '@/components/home/FinalCta';
import { DemoPage } from '@/components/demo/DemoPage';

export const metadata: Metadata = {
  title: 'Live demo · MediQueue',
  description: 'Give a token, run the queue as the doctor and watch the patient’s phone update. An interactive MediQueue demo.',
};

export default function Demo() {
  return (
    <div className="min-h-screen bg-mq-ground text-mq-ink">
      <Navbar />
      <main id="main">
        <DemoPage />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

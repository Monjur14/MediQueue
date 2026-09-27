import { PatientHeader } from '@/components/patient/PatientHeader';
import { Footer } from '@/components/shared/Footer';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-mq-ground">
      <PatientHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-8 md:px-8 md:pt-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}

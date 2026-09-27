'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from '@/components/shared/primitives';
import { InstallModal, type InstallPlatform } from './InstallModal';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const STANDALONE = '(display-mode: standalone)';

function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

type InstallButtonProps = {
  className?: string;
  /** Classes for the text label, e.g. `hidden sm:inline` to go icon-only on small screens. */
  labelClassName?: string;
};

/** "Install app" trigger. Hides itself once MediQueue runs as an installed app. */
export function InstallButton({ className, labelClassName }: InstallButtonProps) {
  const standalone = useSyncExternalStore(subscribeStandalone, () => window.matchMedia(STANDALONE).matches, () => false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('desktop');
  const [canPrompt, setCanPrompt] = useState(false);
  const [open, setOpen] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPrompt.current = null;
    setCanPrompt(false);
    if (outcome === 'accepted') setOpen(false);
  };

  if (standalone || installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPlatform(detectPlatform());
          setOpen(true);
        }}
        aria-label="Install MediQueue app"
        className={cn(
          'flex items-center gap-2 text-sm text-mq-muted transition-colors duration-500 hover:text-mq-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mq-accent',
          EASE,
          className,
        )}
      >
        <Download className="h-4 w-4" strokeWidth={1.5} />
        <span className={labelClassName}>Install app</span>
      </button>

      <InstallModal
        open={open}
        onOpenChange={setOpen}
        platform={platform}
        canPrompt={canPrompt}
        onInstall={() => void handleInstall()}
      />
    </>
  );
}

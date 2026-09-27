export function Footer({ wide = false }: { wide?: boolean }) {
  return (
    <footer className="border-t border-mq-line bg-white py-6">
      <div className={`mx-auto flex w-full items-center justify-between px-4 md:px-8 ${wide ? 'max-w-[1200px]' : 'max-w-5xl'}`}>
        <p className="text-xs text-mq-muted">
          © {new Date().getFullYear()} MediQueue · Smart hospital queue management
        </p>
        <p className="text-xs text-mq-subtle">Bangladesh</p>
      </div>
    </footer>
  );
}

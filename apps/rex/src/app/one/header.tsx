// import { SparklesIcon } from 'lucide-react';
import { ChevronLeftIcon } from 'lucide-react';

export const Header = () => {
  return (
    <header className="z-[10] flex h-[50px] w-full items-center justify-between px-4 text-neutral-50 shadow-lg border-b bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-900">
      <ChevronLeftIcon className="size-4 dark:stroke-neutral-400" />
    </header>
  );
};

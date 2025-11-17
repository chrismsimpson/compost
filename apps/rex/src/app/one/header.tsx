// import { SparklesIcon } from 'lucide-react';
import { ChevronLeftIcon } from 'lucide-react';

export const Header = () => {
  return (
    <header className="z-[10] flex h-[50px] w-full items-center justify-between px-4 text-chrome-50 shadow-md border-b bg-chrome-50 dark:bg-chrome-937 border-chrome-200 dark:border-chrome-950">
      <ChevronLeftIcon className="size-4 dark:stroke-chrome-500" />
    </header>
  );
};

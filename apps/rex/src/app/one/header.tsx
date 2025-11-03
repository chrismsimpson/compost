// import { SparklesIcon } from 'lucide-react';
import { ChevronLeftIcon } from 'lucide-react';

export const Header = () => {
  return (
    <header className="z-[10] flex h-[50px] w-full items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-4 text-white shadow-lg border-b border-gray-200">
      <ChevronLeftIcon className="size-4 dark:stroke-neutral-100" />
    </header>
  );
};

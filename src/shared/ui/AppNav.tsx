import Image from "next/image";

export function AppNav() {
  return (
    <header className="safe-top shrink-0 z-40">
      <div className="mx-auto flex max-w-md items-center justify-center px-4 py-1.5">
        <div
          className="relative size-7 shrink-0 overflow-hidden rounded-full"
          aria-hidden
        >
          <Image
            src="/fifa-logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="28px"
            priority
          />
        </div>
      </div>
    </header>
  );
}

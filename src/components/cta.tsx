import Link from 'next/link';

export default function CTA() {
  return (
    <Link
      href="/chat"
      className="inline-block bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 touch-manipulation text-lg sm:text-xl"
    >
      Börja chatta nu
    </Link>
  );
}

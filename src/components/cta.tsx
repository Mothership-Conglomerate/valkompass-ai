import Link from 'next/link';

export default function CTA() {
  return (
    <Link
      href="/chat"
      className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105"
    >
      Börja chatta nu
    </Link>
  );
}

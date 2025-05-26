import Link from "next/link";

interface NavBarProps {
  activePage: string;
}

export default function NavBar({ activePage }: NavBarProps) {
  return (
    <nav className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center sm:justify-between h-16">
          <div className="hidden sm:flex items-center">
            <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700">
              Valkompass.ai
            </Link>
          </div>
          <div className="flex space-x-4 sm:absolute sm:left-1/2 sm:top-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:space-x-8">
            <Link
              href="/"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-lg font-medium ${
                activePage === "Hem"
                  ? "border-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Hem
            </Link>
            <Link
              href="/chat"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-lg font-medium ${
                activePage === "Chatt"
                  ? "border-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Chatt
            </Link>
          </div>
          <div className="hidden sm:flex items-center">
            {/* Placeholder for potential right-aligned items like login/profile button */}
          </div>
        </div>
      </div>
    </nav>
  );
}

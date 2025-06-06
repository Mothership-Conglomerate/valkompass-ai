import Link from "next/link";
import Image from "next/image";

interface NavBarProps {
  activePage: string;
}

export default function NavBar({ activePage }: NavBarProps) {
  return (
    <nav className="w-full bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center sm:justify-between h-16">
          {/* Mobile logo */}
          <div className="flex sm:hidden items-center pr-8">
            <Link href="/">
              <Image 
                src="/valkompass_transparent_no_text.avif" 
                alt="Valkompass" 
                width={40} 
                height={40}
                className="object-contain"
              />
            </Link>
          </div>
          <div className="hidden sm:flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image 
                src={"/valkompass_transparent_no_text.avif"} 
                alt="Valkompass" 
                width={50} 
                height={50}
                className="object-contain"
              />
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700">
                Valkompass.ai
              </span>
            </Link>
          </div>
          <div className="flex space-x-4 sm:absolute sm:left-1/2 sm:top-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 sm:space-x-8">
            <Link
              href="/"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-lg font-medium touch-manipulation ${
                activePage === "Hem"
                  ? "border-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Hem
            </Link>
            <Link
              href="/chat"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-lg font-medium touch-manipulation ${
                activePage === "Chatt"
                  ? "border-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Chatt
            </Link>
            <Link
              href="/get-involved"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-lg font-medium touch-manipulation ${
                activePage === "Engagera dig"
                  ? "border-blue-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Engagera dig
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

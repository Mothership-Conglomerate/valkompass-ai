import Link from "next/link";

export default function HomePage() {
  const activePage = "Hem"; // This is the home page, so "Hem" is active

  return (
    <div className="min-h-screen flex flex-col">
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
                href="/chat" // Assuming /chat is the route for your chat page
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

      <main className="flex-grow bg-gradient-to-br from-blue-100 via-indigo-50 to-white flex flex-col items-center justify-center p-8 text-gray-800">
        <div className="w-full max-w-3xl mx-auto text-center space-y-16">
          {/* Hero Section */}
          <section className="py-12">
            <h1 className="text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 pb-4">
              Valkompass.ai
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mt-6 max-w-2xl mx-auto">
              Välkommen till Valkompass.ai – din moderna guide i det politiska landskapet. Vi använder avancerad AI för att ge dig en klar och nyanserad bild av var partierna står i de frågor som är viktiga för dig. Snabbt, enkelt och helt anpassat efter dina intressen. Upptäck framtidens väljarstöd!
            </p>
          </section>

          {/* How it Works Section */}
          <section className="py-12">
            <h2 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-8">
              Hur det funkar
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Valkompass.ai är ett projekt byggt på öppen källkod, vilket innebär fullständig transparens i hur vi matchar dig med politiska åsikter. Vi strävar efter att vara helt opartiska och fria från bias, så att du kan lita på att resultaten är rättvisa och representativa. Vårt mål är att stärka demokratin genom att tillhandahålla ett verktyg som är tillgängligt och förståeligt för alla.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

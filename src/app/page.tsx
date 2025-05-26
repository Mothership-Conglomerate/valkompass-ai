import Link from "next/link";
import NavBar from "@/components/nav-bar";

export default function HomePage() {
  const activePage: string = "Hem"; // This is the home page, so "Hem" is active

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar activePage={activePage} />

      <main className="flex-grow bg-gradient-to-br from-blue-100 via-indigo-50 to-white flex flex-col items-center justify-center p-8 text-gray-800">
        <div className="w-full max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <section>
            <h1 className="text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 pb-4">
              Valkompass.ai
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mt-6 max-w-2xl mx-auto">
              Vi samlar partiernas åsikter och handlingar och låter dig ställa frågor och konversera med dem. 
            </p>
          </section>

          {/* How it Works Section */}
          <section className="py-12">
            <h2 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-8">
              Hur det funkar
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Valkompass.ai samlar in partiernas officiella dokument (partiprogram, valmanifest, voteringshistorik, utlåtanden i riksdagen, arbetsgrupper och andra officiella sammanhang med offentliga protokoll).
            </p>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto pt-6">
              Dokumenten används av en AI-modell (Gemini 2.5 flash) med datan och låter dig ställa frågor och konversera med dem.
              Allt vi gör är open source. För kod och mer information, se <a href="https://github.com/valkompassai" className="text-blue-500 hover:text-blue-600">vårt GitHub-repo</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

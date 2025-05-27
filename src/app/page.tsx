import NavBar from "@/components/nav-bar";
import CTA from "@/components/cta";

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
            <p className="text-xl md:text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-900 mt-6 max-w-2xl mx-auto">
              Vi samlar partiernas åsikter och beslut – du ställer frågorna!
            </p>
          </section>

          {/* How it Works Section */}
          <section className="py-12">
            <h2 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-8">
              Hur det funkar
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Valkompass.ai samlar in partiernas officiella dokument, som partiprogram, valmanifest, voteringshistorik, riksdagsutlåtanden, arbetsgruppsrapporter och andra protokoll från offentliga sammanhang.
            </p>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto pt-6">
            Dessa dokument används av en AI-modell (Gemini 2.5 Flash) som analyserar innehållet och gör det möjligt för dig att ställa frågor och föra samtal med partiernas ståndpunkter som grund.
<br></br><br></br>
            Allt vi gör är open source. <br></br>För kod och mer information, <a href="https://github.com/valkompass-ai/valkompass-ai" className="text-blue-500 hover:text-blue-600" target="_blank">besök vårt GitHub-repo</a>.
            </p>
          </section>
          <CTA />
        </div>
      </main>
    </div>
  );
}

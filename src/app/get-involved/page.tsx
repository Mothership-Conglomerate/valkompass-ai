import NavBar from "@/components/nav-bar";

export default function GetInvolvedPage() {
  const activePage: string = "Get involved";

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar activePage={activePage} />

      <main className="flex-grow bg-gradient-to-br from-blue-100 via-indigo-50 to-white flex flex-col items-center justify-center p-8 text-gray-800">
        <section className="w-full max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600 pb-4">
            Engagera dig
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Valkompass.ai byggs och drivs av engagerade volontärer. Vi söker alltid fler som vill bidra – vare sig du brinner för politik, data, design eller bara tycker att transparens i demokratin är viktigt.
          </p>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Ditt engagemang gör skillnad!
          </p>
          <p className="text-lg text-blue-600">
            <a href="mailto:valkompass@proton.me" className="underline">
              valkompass@proton.me
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}

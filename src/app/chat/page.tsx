import NavBar from "@/components/nav-bar";
import ChatArea from "@/features/chat/components/chat-area";

export default function ChatPage() {
  const activePage: string = "Chatt";

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar activePage={activePage} />
      <main className="flex-grow bg-gradient-to-br from-blue-100 via-indigo-50 to-white flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)] sm:h-[calc(100vh-10rem)]">
          <ChatArea />
        </div>
      </main>
    </div>
  );
} 
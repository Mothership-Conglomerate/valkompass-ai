import NavBar from "@/components/nav-bar";
import ChatArea from "@/features/chat/components/chat-area";

export default function ChatPage() {
  const activePage: string = "Chatt";

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar activePage={activePage} />
      <main className="flex-grow flex flex-col p-4 sm:p-8">
        <div className="w-full sm:w-3/4 mx-auto flex flex-col flex-grow shadow-2xl">
          <ChatArea />
        </div>
      </main>
    </div>
  );
} 
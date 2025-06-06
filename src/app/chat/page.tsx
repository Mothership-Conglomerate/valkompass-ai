import NavBar from "@/components/nav-bar";
import ChatArea from "@/features/chat/components/chat-area";

export default function ChatPage() {
  const activePage: string = "Chatt";

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden chat-page">
      <NavBar activePage={activePage} />
      <main className="flex-1 flex flex-col p-2 sm:p-8 min-h-0 overflow-hidden">
        <div className="w-full sm:w-3/4 mx-auto flex flex-col flex-1 shadow-2xl min-h-0 overflow-hidden">
          <ChatArea />
        </div>
      </main>
    </div>
  );
} 
import MessengerApp from "@/components/messenger/MessengerApp";

export default function Messages() {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--surna-base)", color: "var(--surna-text)" }}
    >
      <div className="mx-auto w-full max-w-[480px] min-h-screen">
        <MessengerApp isPage={true} />
      </div>
    </div>
  );
}

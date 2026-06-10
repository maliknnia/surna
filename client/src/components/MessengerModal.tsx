import MessengerApp from "@/components/messenger/MessengerApp";

interface MessengerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MessengerModal({ isOpen, onClose }: MessengerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background bg-opacity-60 z-50" data-testid="messenger-modal" onClick={onClose}>
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-transparent border border-border transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <MessengerApp onClose={onClose} />
      </div>
    </div>
  );
}

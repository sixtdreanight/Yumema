import type { ChatMessage } from "../../hooks/useChat";
import Avatar from "../ui/Avatar";

export default function MessageBubble({
  message, showAvatar,
}: {
  message: ChatMessage;
  showAvatar: boolean;
}) {
  const isPartner = message.role === "partner";

  return (
    <div
      className={`flex items-start gap-3 pt-2 pb-0.5 slide-in-${isPartner ? "left" : "right"} ${
        isPartner ? "" : "flex-row-reverse"
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {showAvatar ? (
          <Avatar emoji={isPartner ? "💕" : "😊"} size="sm" gradient={isPartner} />
        ) : (
          <div className="w-7" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col max-w-[72%] ${isPartner ? "" : "items-end"}`}>
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
            isPartner
              ? "bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm rounded-2xl"
              : "bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-2xl"
          }`}
          style={
            isPartner
              ? showAvatar
                ? { borderBottomLeftRadius: "6px" }
                : {}
              : showAvatar
                ? { borderBottomRightRadius: "6px" }
                : {}
          }
        >
          {message.content}
        </div>

        {showAvatar && (
          <time className="text-[10px] mt-1 px-1 font-mono text-zinc-400 dark:text-zinc-500">
            {message.time}
          </time>
        )}
      </div>
    </div>
  );
}

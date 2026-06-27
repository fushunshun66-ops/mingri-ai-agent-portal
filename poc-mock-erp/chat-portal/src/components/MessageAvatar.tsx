import mrjtLogo from "../assets/mrjt-logo.png";
import { IconUser } from "./icons";

type MessageRole = "user" | "assistant" | "system";

const AVATAR_LABEL: Record<Exclude<MessageRole, "system">, string> = {
  user: "我",
  assistant: "智能助手",
};

export function MessageAvatar({ role }: { role: MessageRole }) {
  if (role === "system") return null;

  const isUser = role === "user";

  return (
    <div className={`message-avatar message-avatar--${role}`} aria-hidden="true" title={AVATAR_LABEL[role]}>
      {isUser ? (
        <IconUser />
      ) : (
        <img src={mrjtLogo} alt="" className="message-avatar-logo" draggable={false} />
      )}
    </div>
  );
}

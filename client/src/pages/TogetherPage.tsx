/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TogetherPage
   Divine Noir: Listen Together with rooms, live chat, synced playback
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { usePlayer, DEMO_ROOMS } from "@/contexts/PlayerContext";
import { Plus, Send, Copy, LogOut } from "lucide-react";
import { toast } from "sonner";

const TOGETHER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-together-gRoXCXo5eZDSDZx7TS8pVW.webp";

const CHAT_NAMES = ["Nova", "Kai", "Mia", "Alex"];
const CHAT_REPLIES = ["🔥🔥🔥", "facts!!", "lowkey slaps", "this is the one fr", "vibe is immaculate", "divine energy 🙏"];
const COLORS = [
  "linear-gradient(135deg,#60a5fa,#a78bfa)",
  "linear-gradient(135deg,#f472b6,#fb923c)",
  "linear-gradient(135deg,#34d399,#60a5fa)",
  "linear-gradient(135deg,#a78bfa,#f472b6)",
];

interface ChatMsg { user: string; text: string; isOwn?: boolean; }

export default function TogetherPage() {
  const { state, setRoom } = usePlayer();
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoom({ code, name: "My Sanctuary", listeners: ["You"] });
    setMessages([]);
    toast.success(`🎧 Room created! Share code: ${code}`);
  };

  const joinRoom = (code?: string) => {
    const c = (code || joinCode).trim().toUpperCase();
    if (c.length < 4) { toast.error("Enter a valid room code"); return; }
    const demo = DEMO_ROOMS.find(r => r.code === c);
    const names = demo ? ["You", "Nova", "Kai", "Mia"].slice(0, demo.listeners) : ["You"];
    setRoom({ code: c, name: demo?.name || "Music Sanctuary", listeners: names });
    setJoinCode("");
    setMessages([]);
    toast.success(`✅ Joined room ${c}`);
    setTimeout(() => addMsg("Nova", "anyone know this track? 🔥"), 1200);
    setTimeout(() => addMsg("Kai", "yesss absolute banger 🙌"), 3000);
  };

  const leaveRoom = () => {
    setRoom(null);
    setMessages([]);
    toast("Left the room");
  };

  const addMsg = (user: string, text: string) => {
    setMessages(m => [...m, { user, text }]);
  };

  const sendChat = () => {
    const val = chatInput.trim();
    if (!val) return;
    setMessages(m => [...m, { user: "You", text: val, isOwn: true }]);
    setChatInput("");
    if (Math.random() > 0.4) {
      const delay = 800 + Math.random() * 1500;
      setTimeout(() => {
        addMsg(
          CHAT_NAMES[Math.floor(Math.random() * 3)],
          CHAT_REPLIES[Math.floor(Math.random() * CHAT_REPLIES.length)]
        );
      }, delay);
    }
  };

  const copyCode = () => {
    if (state.room) navigator.clipboard.writeText(state.room.code).catch(() => {});
    toast.success(`📋 Code copied: ${state.room?.code}`);
  };

  return (
    <div className="animate-fade-up">
      {/* Header image */}
      <div className="relative h-[200px] overflow-hidden">
        <img src={TOGETHER_IMG} alt="Listen Together" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-[oklch(0.08_0.01_280)/40] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h1 className="font-heading text-2xl text-white/90 tracking-wider">Listen Together</h1>
          <p className="text-[12px] text-white/40 font-body mt-1">
            Create a sanctuary and vibe with souls in real-time
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* ── Room creation / join ── */}
        {!state.room && (
          <div className="rounded-2xl p-6 mb-6 border"
            style={{
              background: "linear-gradient(135deg, oklch(0.14 0.013 280), oklch(0.11 0.012 280))",
              borderColor: "oklch(0.55 0.22 295 / 30%)",
            }}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={createRoom}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[13px] font-medium
                  text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.3)]"
                style={{ background: "linear-gradient(135deg, #E8C547, #C9A84C)" }}
              >
                <Plus size={14} />
                Create Sanctuary
              </button>

              <div className="flex rounded-xl overflow-hidden border border-white/[0.1]">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                  placeholder="Enter room code…"
                  maxLength={6}
                  className="bg-[oklch(0.14_0.013_280)] border-none px-4 py-2.5 text-[13px] font-body
                    text-white/80 outline-none w-44 tracking-widest placeholder:tracking-normal placeholder:text-white/20"
                />
                <button
                  onClick={() => joinRoom()}
                  className="px-4 bg-[#A78BFA] text-white text-[13px] font-medium font-body hover:bg-[#7C3AED] transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Active room ── */}
        {state.room && (
          <div className="rounded-2xl p-5 mb-6 border border-white/[0.1]"
            style={{ background: "oklch(0.14 0.013 280)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="pulse-dot" />
                <span className="font-heading text-[15px] text-white/90 tracking-wide">{state.room.name}</span>
                <span className="text-[11px] font-bold tracking-widest text-[#A78BFA] px-2 py-0.5 rounded
                  bg-[#A78BFA]/10 border border-[#A78BFA]/30">
                  {state.room.code}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                    text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all border border-white/[0.08]">
                  <Copy size={11} /> Copy Code
                </button>
                <button onClick={leaveRoom}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                    text-red-400/70 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all border border-red-500/10">
                  <LogOut size={11} /> Leave
                </button>
              </div>
            </div>

            {/* Listeners */}
            <div className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/25 mb-2">Listeners</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {state.room.listeners.map((l, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-body text-white/70"
                  style={{ background: "oklch(0.18 0.014 280)" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: COLORS[i % COLORS.length] }}>
                    {l.charAt(0)}
                  </div>
                  {l}
                </div>
              ))}
            </div>

            {/* Chat */}
            <div ref={chatRef}
              className="rounded-xl p-4 max-h-[200px] overflow-y-auto flex flex-col gap-2 mb-3"
              style={{ background: "oklch(0.11 0.012 280)" }}>
              {messages.length === 0 && (
                <div className="text-[12px] text-white/20 text-center font-body py-4">
                  The sanctuary awaits… say something 🎵
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-2 text-[13px]">
                  <span className={`font-medium flex-shrink-0 ${msg.isOwn ? "text-[#E8C547]" : "text-[#A78BFA]"}`}>
                    {msg.user}
                  </span>
                  <span className="text-white/50 font-body">{msg.text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Say something…"
                className="flex-1 bg-[oklch(0.11_0.012_280)] border border-white/[0.08] rounded-lg
                  px-3.5 py-2 text-[13px] font-body text-white/80 outline-none
                  focus:border-[#A78BFA]/40 transition-colors placeholder:text-white/20"
              />
              <button onClick={sendChat}
                className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08]
                  text-white/60 hover:text-white transition-all">
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Active rooms ── */}
        <div className="font-heading text-[15px] tracking-wider text-white/70 mb-4">Active Sanctuaries</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_ROOMS.map(room => (
            <div
              key={room.code}
              onClick={() => joinRoom(room.code)}
              className="rounded-xl overflow-hidden border border-white/[0.07] cursor-pointer
                hover:border-[#A78BFA]/30 hover:-translate-y-1 transition-all group"
              style={{ background: "oklch(0.14 0.013 280)" }}
            >
              <div className="aspect-video relative flex items-center justify-center text-5xl"
                style={{ background: "linear-gradient(135deg,#1a0a3e,#0a1a3e)" }}>
                {room.emoji}
                <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
                  bg-[oklch(0.65_0.18_160)/90] text-black font-heading tracking-wider">
                  LIVE
                </div>
              </div>
              <div className="p-3">
                <div className="text-[13px] font-heading text-white/80 tracking-wide mb-1">{room.name}</div>
                <div className="text-[11px] text-white/35 font-body">
                  {room.listeners} listening · {room.track}
                </div>
                <div className="mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-body tracking-widest">
                    {room.code}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

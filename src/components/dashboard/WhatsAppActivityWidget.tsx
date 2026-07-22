import { MessageSquare, Bot, ArrowUpRight, CheckCircle2 } from "lucide-react";

export function WhatsAppActivityWidget() {
  const dummyLogs = [
    {
      id: "1",
      sender: "+1 (555) 019-2834",
      message: "Please review the Q3 marketing budget deck by Friday 5 PM.",
      taskTitle: "Review Q3 marketing budget deck",
      confidence: "98%",
      time: "10 mins ago",
    },
    {
      id: "2",
      sender: "+1 (555) 012-9981",
      message: "Can someone fix the auth login bug reported on staging?",
      taskTitle: "Fix auth login bug on staging",
      confidence: "94%",
      time: "45 mins ago",
    },
  ];

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-white">WhatsApp & Gemini Extraction Feed</h3>
        </div>
        <span className="text-xs text-indigo-400 hover:underline cursor-pointer">
          Webhook Logs
        </span>
      </div>

      <div className="space-y-3">
        {dummyLogs.map((log) => (
          <div
            key={log.id}
            className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">{log.sender}</span>
              <span className="text-slate-500">{log.time}</span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono bg-slate-950/60 p-2 rounded border border-slate-800">
              "{log.message}"
            </p>
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center space-x-1.5 text-indigo-400">
                <Bot className="h-3.5 w-3.5" />
                <span className="font-medium">Auto-Extracted Task: {log.taskTitle}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                {log.confidence} Match
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

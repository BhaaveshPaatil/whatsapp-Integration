"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle2, Copy, Send, Sparkles, AlertCircle, Loader2 } from "lucide-react";

export default function WhatsAppPage() {
  const [phone, setPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = "https://your-domain.com/api/whatsapp/webhook";
  const verifyToken = "taskflow_verify_token_secret";

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !testMessage) return;

    try {
      setIsSending(true);
      setResult(null);
      await new Promise((res) => setTimeout(res, 1000));
      setResult(`Simulated Task Extraction from "${testMessage}": Task title extracted cleanly!`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <MessageSquare className="h-6 w-6 text-emerald-400" />
          <span>WhatsApp Business Hub</span>
        </h1>
        <p className="text-xs text-slate-400">
          Configure real-time message webhooks, test AI extraction, and monitor communication status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Configuration Card */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Webhook Configuration</CardTitle>
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Endpoint Active</span>
              </span>
            </div>
            <CardDescription>
              Copy this Callback URL into your Meta Business Cloud API developer dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Callback URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-300 font-mono"
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? "Copied" : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Verify Token</label>
              <input
                type="text"
                readOnly
                value={verifyToken}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-indigo-400 font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Extraction Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Test WhatsApp Task Parsing</CardTitle>
            <CardDescription>
              Simulate an incoming WhatsApp message payload to preview Gemini NLP extraction.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {result && (
              <div className="p-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>{result}</span>
              </div>
            )}

            <form onSubmit={handleSendTestMessage} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Sender Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Message Text</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please deploy the database hotfix before tomorrow 3 PM and assign to Alex."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <Button type="submit" disabled={isSending} className="w-full space-x-2">
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Run Simulated Extraction</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

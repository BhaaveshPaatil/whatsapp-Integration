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

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/webhook`
      : "/api/whatsapp/webhook";
  const verifyToken = "taskflow_verify_token_secret";

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage) return;

    try {
      setIsSending(true);
      setResult(null);
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testMessage, sender: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Extraction failed");
        return;
      }
      const ex = data.extraction;
      setResult(
        `intent=${ex.intent || "create_task"} · "${ex.title}" · ${ex.priority} · confidence ${Math.round((ex.confidenceScore || 0) * 100)}%`
      );
    } catch {
      setResult("Failed to reach extraction API");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
          <MessageSquare className="h-6 w-6 text-emerald-300" />
          <span>WhatsApp Business Hub</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Configure real-time message webhooks, test AI extraction, and monitor communication status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Webhook Configuration</CardTitle>
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-harbor-success/10 text-emerald-300 border border-harbor-success/25">
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
              <label className="text-xs font-medium text-harbor-secondary">Callback URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="harbor-input w-full font-mono"
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? "Copied" : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Verify Token</label>
              <input
                type="text"
                readOnly
                value={verifyToken}
                className="harbor-input w-full text-primary font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Extraction Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test WhatsApp Task Parsing</CardTitle>
            <CardDescription>
              Simulate an incoming WhatsApp message payload to preview Gemini NLP extraction.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {result && (
              <div className="p-3 text-xs text-emerald-300 bg-harbor-success/10 border border-harbor-success/25 rounded-xl flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>{result}</span>
              </div>
            )}

            <form onSubmit={handleSendTestMessage} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-harbor-secondary">Sender Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="harbor-input w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-harbor-secondary">Message Text</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please deploy the database hotfix before tomorrow 3 PM and assign to Alex."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="harbor-input w-full"
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

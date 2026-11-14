"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { auth } from "@/lib/firebase";
import {
  subscribeToWhatsAppMessages,
  subscribeToAiExtractions,
} from "@/lib/services/pipelineClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare, CheckCircle2, Copy, Send, Sparkles,
  Loader2, Wifi, WifiOff, Bot, Clock, Phone, Building2,
} from "lucide-react";
import type { InboundMessage, AiExtractionRecord } from "@/types";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WhatsAppPage() {
  const { user, organization } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Live data
  const [pipelineStatus, setPipelineStatus] = useState<{
    ok: boolean;
    blockers: string[];
  } | null>(null);
  const [isPipelineTesting, setIsPipelineTesting] = useState(false);
  const [pipelineTestResult, setPipelineTestResult] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [extractions, setExtractions] = useState<AiExtractionRecord[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [extractionsError, setExtractionsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((data) => setPipelineStatus({ ok: data.ok, blockers: data.blockers || [] }))
      .catch(() => setPipelineStatus(null));
  }, []);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/webhook`
      : "/api/whatsapp/webhook";
  const verifyToken = "taskflow_verify_token_secret";

  const isConfigured = organization?.whatsappConfigured || false;
  const phoneNumberId = organization?.whatsappPhoneNumberId || "—";
  const businessAccountId = organization?.whatsappBusinessAccountId || "—";

  useEffect(() => {
    if (!user?.orgId) return;
    setMessagesError(null);
    setExtractionsError(null);
    const unsubMsg = subscribeToWhatsAppMessages(
      user.orgId,
      (rows) => {
        setMessagesError(null);
        setMessages(rows);
      },
      (err) => {
        console.error("[whatsapp] message listener error:", err);
        setMessagesError(err.message || "Unable to load WhatsApp messages");
        // Keep previously loaded messages visible so transient errors don't blank the UI
      }
    );
    const unsubAi = subscribeToAiExtractions(
      user.orgId,
      (rows) => {
        setExtractionsError(null);
        setExtractions(rows);
      },
      (err) => {
        console.error("[whatsapp] extractions listener error:", err);
        setExtractionsError(err.message || "Unable to load AI extractions");
      },
      20
    );
    return () => { unsubMsg(); unsubAi(); };
  }, [user?.orgId]);

  const lastMessage = messages[0] || null;
  const lastExtraction = extractions[0] || null;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!organization?.id) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) {
        setTestResult("Authentication error. Please log in again.");
        return;
      }
      // We test by re-validating the config endpoint (it verifies the Meta token)
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organization.id,
          whatsappPhoneNumberId: organization.whatsappPhoneNumberId || "",
          whatsappBusinessAccountId: organization?.whatsappBusinessAccountId || "",
          // verifyOnly reuses the stored token and never overwrites it.
          verifyOnly: true,
          orgName: organization.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(`✅ Connection verified. Phone: ${data.displayPhoneNumber || "OK"}`);
      } else {
        setTestResult(`❌ ${data.error || "Connection test failed"}`);
      }
    } catch (err: unknown) {
      setTestResult(`❌ ${err instanceof Error ? err.message : "Connection test failed"}`);
    } finally {
      setIsTesting(false);
    }
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

  const handleRunPipelineTest = async () => {
    if (!organization?.id || !testMessage.trim()) return;
    setIsPipelineTesting(true);
    setPipelineTestResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setPipelineTestResult("Please sign in again.");
        return;
      }
      const res = await fetch("/api/whatsapp/simulate-inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organization.id,
          text: testMessage,
          sender: phone || "919545556045",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPipelineTestResult(`❌ ${data.error || "Pipeline test failed"}`);
        return;
      }
      setPipelineTestResult(
        `✅ Message saved (${data.messageId})${data.worker ? " · AI worker ran · check Tasks" : data.isDuplicate ? " · duplicate skipped" : ""}`
      );
    } catch (err: unknown) {
      setPipelineTestResult(`❌ ${err instanceof Error ? err.message : "Pipeline test failed"}`);
    } finally {
      setIsPipelineTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
          <MessageSquare className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          <span>WhatsApp Business Hub</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Configure real-time message webhooks, test AI extraction, and monitor communication status.
        </p>
      </div>

      {pipelineStatus && !pipelineStatus.ok && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Pipeline not ready — inbound WhatsApp messages will not create tasks
          </p>
          <ul className="text-xs text-amber-800 dark:text-amber-200/90 list-disc pl-4 space-y-1">
            {pipelineStatus.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            {isConfigured ? (
              <Wifi className="h-5 w-5 text-emerald-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-semibold ${isConfigured ? "text-emerald-500" : "text-muted-foreground"}`}>
                {isConfigured ? "Connected" : "Not Connected"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Phone Number ID</p>
              <p className="text-sm font-mono font-semibold text-foreground truncate max-w-[140px]">
                {phoneNumberId}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Business Account</p>
              <p className="text-sm font-mono font-semibold text-foreground truncate max-w-[140px]">
                {businessAccountId}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Last Message</p>
              <p className="text-sm font-semibold text-foreground">
                {lastMessage ? timeAgo(lastMessage.createdAt) : "None"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Connection */}
      {isConfigured && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Test WhatsApp Connection</span>
              {testResult && (
                <span className="text-xs text-muted-foreground ml-2">{testResult}</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test Connection"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Last Incoming Message & Last AI Extraction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              <span>Last Incoming Message</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messagesError && (
              <div className="mb-3 p-2.5 text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg">
                <p className="font-semibold">Listener error: {messagesError}</p>
                <p className="mt-1 text-[11px] opacity-90">
                  This usually means Firestore rules blocked the read. Make sure the logged-in user&apos;s <code className="font-mono">orgId</code> matches the <code className="font-mono">orgId</code> stored on the <code className="font-mono">whatsappMessages</code> documents.
                </p>
              </div>
            )}
            {lastMessage ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground flex-wrap gap-2">
                  <span className="font-medium text-foreground">{lastMessage.senderName || lastMessage.sender}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium border border-border">
                      {lastMessage.status.replace(/_/g, " ")}
                    </span>
                    <span>{timeAgo(lastMessage.createdAt)}</span>
                  </div>
                </div>
                <p className="text-xs font-mono bg-muted p-2.5 rounded-lg border border-border italic text-foreground">
                  &quot;{lastMessage.text || "[non-text message]"}&quot;
                </p>
                {lastMessage.status === "failed" && lastMessage.error && (
                  <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
                    Failed: {lastMessage.error}
                  </p>
                )}
                {messages.length > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    + {messages.length - 1} more message{messages.length > 2 ? "s" : ""} in this org.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">No messages received yet.</p>
                {!messagesError && (
                  <ol className="text-[11px] text-muted-foreground list-decimal pl-4 space-y-0.5">
                    <li>Set <code className="font-mono">FIREBASE_SERVICE_ACCOUNT_JSON</code> in <code className="font-mono">.env.local</code>.</li>
                    <li>Save WhatsApp settings on the Settings page (maps Phone Number ID → org).</li>
                    <li>Register a public URL (ngrok / deployment) with Meta; paste the Callback URL and verify token above.</li>
                    <li>Or use the &quot;Test Full Pipeline&quot; button to create a simulated message right now.</li>
                  </ol>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Bot className="h-4 w-4 text-primary" />
              <span>Last AI Extraction</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extractionsError && (
              <div className="mb-3 p-2.5 text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg">
                <p className="font-semibold">Listener error: {extractionsError}</p>
              </div>
            )}
            {lastExtraction ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground flex-wrap gap-2">
                  <span className="font-semibold text-primary capitalize">
                    {lastExtraction.action?.classification ? `${lastExtraction.action.classification.replace(/_/g, " ")} (${lastExtraction.action?.intent?.replace(/_/g, " ")})` : lastExtraction.action?.intent?.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium border border-border capitalize">
                      {lastExtraction.outcome.replace(/_/g, " ")}
                    </span>
                    <span>{timeAgo(lastExtraction.createdAt)}</span>
                  </div>
                </div>
                <p className="text-xs text-foreground font-medium">{lastExtraction.action?.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-semibold border border-primary/20">
                    {Math.round((lastExtraction.action?.confidenceScore || 0) * 100)}% confidence
                  </span>
                  <span className="capitalize">Priority: <strong className="text-foreground">{lastExtraction.action?.priority}</strong></span>
                  {lastExtraction.action?.dueDate && (
                    <span>Due: <strong className="text-foreground">{lastExtraction.action.dueDate}</strong></span>
                  )}
                  {lastExtraction.action?.assigneeName && (
                    <span>Assignee: <strong className="text-foreground">{lastExtraction.action.assigneeName}</strong></span>
                  )}
                  {lastExtraction.taskId && (
                    <a
                      href="/dashboard/tasks"
                      className="text-primary hover:underline font-semibold ml-auto"
                    >
                      View Created Task →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No AI extractions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Webhook Configuration</CardTitle>
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border border-harbor-success/25">
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
              <div className="p-3 text-xs text-emerald-700 dark:text-emerald-300 bg-harbor-success/10 border border-harbor-success/25 rounded-xl flex items-center space-x-2">
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

              <Button
                type="button"
                variant="outline"
                disabled={isPipelineTesting || !testMessage.trim()}
                onClick={handleRunPipelineTest}
                className="w-full space-x-2"
              >
                {isPipelineTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Test Full Pipeline → Create Task</span>
                  </>
                )}
              </Button>

              {pipelineTestResult && (
                <p className="text-xs text-muted-foreground">{pipelineTestResult}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

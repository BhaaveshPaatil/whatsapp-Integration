"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { canManageOrganization } from "@/lib/rbac";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings, Building, Bot, MessageSquare, Save,
  CheckCircle2, ShieldAlert, Loader2, Wifi, WifiOff,
  Globe,
} from "lucide-react";

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";

export default function SettingsPage() {
  const { user, organization, setOrganization } = useAuthStore();
  const [orgName, setOrgName] = useState(organization?.name || "");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(organization?.whatsappPhoneNumberId || "");
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState(
    (organization as any)?.whatsappBusinessAccountId || ""
  );
  const [whatsappToken, setWhatsappToken] = useState("");
  const [geminiKey, setGeminiKey] = useState(organization?.geminiApiKey || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    organization?.whatsappConfigured ? "connected" : "idle"
  );
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);

  const isAdmin = canManageOrganization(user, organization?.id);

  useEffect(() => {
    if (!organization) return;
    setOrgName(organization.name || "");
    setWhatsappPhoneId(organization.whatsappPhoneNumberId || "");
    setWhatsappBusinessAccountId((organization as any)?.whatsappBusinessAccountId || "");
    setGeminiKey(organization.geminiApiKey || "");
    setConnectionStatus(organization.whatsappConfigured ? "connected" : "idle");
    // Don't populate the token field — it's encrypted server-side
    setWhatsappToken("");
  }, [organization]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !isAdmin) {
      setError("Only organization admins can update settings.");
      return;
    }

    if (!whatsappPhoneId || !whatsappBusinessAccountId || !whatsappToken) {
      setError("Phone Number ID, Business Account ID, and Access Token are all required.");
      return;
    }

    try {
      setError(null);
      setMessage(null);
      setIsSaving(true);
      setConnectionStatus("testing");

      // Get Firebase ID token for server auth
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Authentication error. Please log in again.");
        setIsSaving(false);
        setConnectionStatus("failed");
        return;
      }

      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orgId: organization.id,
          whatsappPhoneNumberId: whatsappPhoneId,
          whatsappBusinessAccountId,
          whatsappAccessToken: whatsappToken,
          geminiApiKey: geminiKey,
          orgName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save configuration.");
        setConnectionStatus("failed");
        return;
      }

      setConnectionStatus("connected");
      setDisplayPhone(data.displayPhoneNumber || null);
      setOrganization({
        ...organization,
        name: orgName,
        whatsappPhoneNumberId: whatsappPhoneId,
        whatsappConfigured: true,
        geminiApiKey: geminiKey,
        aiConfigured: Boolean(geminiKey),
        updatedAt: new Date().toISOString(),
      });
      setMessage("Configuration saved and Meta token verified successfully!");
      setWhatsappToken(""); // Clear token from UI after save
      setTimeout(() => setMessage(null), 5000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
      setConnectionStatus("failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-400" />
        <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Organization settings are restricted to Admin accounts only. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
          <Settings className="h-6 w-6 text-primary" />
          <span>Organization &amp; API Settings</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Configure WhatsApp Business API credentials, Gemini AI model keys, and general settings.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-harbor-danger/10 border border-harbor-danger/25 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Organization Profile</CardTitle>
            </div>
            <CardDescription>General workspace parameters and naming</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="harbor-input w-full max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-base">WhatsApp Business API Settings</CardTitle>
              </div>
              {/* Connection Status Badge */}
              <span
                className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  connectionStatus === "connected"
                    ? "bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border-harbor-success/25"
                    : connectionStatus === "testing"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25"
                    : connectionStatus === "failed"
                    ? "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {connectionStatus === "connected" ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : connectionStatus === "testing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : connectionStatus === "failed" ? (
                  <WifiOff className="h-3.5 w-3.5" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                <span>
                  {connectionStatus === "connected"
                    ? "Connected"
                    : connectionStatus === "testing"
                    ? "Verifying..."
                    : connectionStatus === "failed"
                    ? "Failed"
                    : "Not Connected"}
                </span>
              </span>
            </div>
            <CardDescription>
              Meta Cloud API Phone Number ID, Business Account, and Access Tokens.
              {displayPhone && (
                <span className="ml-1 text-emerald-500 font-medium">{displayPhone}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Phone Number ID</label>
              <input
                type="text"
                placeholder="109823471029348"
                value={whatsappPhoneId}
                onChange={(e) => setWhatsappPhoneId(e.target.value)}
                className="harbor-input w-full max-w-md font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Business Account ID</label>
              <input
                type="text"
                placeholder="1370124431755460"
                value={whatsappBusinessAccountId}
                onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                className="harbor-input w-full max-w-md font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">
                Permanent Access Token
                {organization?.whatsappConfigured && (
                  <span className="ml-2 text-emerald-500 text-[10px]">(token saved &amp; encrypted — enter new token to update)</span>
                )}
              </label>
              <input
                type="password"
                placeholder="EAAG..."
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                className="harbor-input w-full max-w-md font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gemini AI Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Gemini AI Key &amp; Model Config</CardTitle>
            </div>
            <CardDescription>Google Gemini API Key for Task Extraction NLP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-harbor-secondary">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="harbor-input w-full max-w-md font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="space-x-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

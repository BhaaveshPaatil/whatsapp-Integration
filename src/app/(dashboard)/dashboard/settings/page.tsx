"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { updateOrganization } from "@/lib/services/organization";
import { canManageOrganization } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Bot, MessageSquare, Save, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user, organization, setOrganization } = useAuthStore();
  const [orgName, setOrgName] = useState(organization?.name || "");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(organization?.whatsappPhoneNumberId || "");
  const [whatsappToken, setWhatsappToken] = useState(organization?.whatsappAccessToken || "");
  const [geminiKey, setGeminiKey] = useState(organization?.geminiApiKey || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = canManageOrganization(user, organization?.id);

  useEffect(() => {
    if (!organization) return;
    setOrgName(organization.name || "");
    setWhatsappPhoneId(organization.whatsappPhoneNumberId || "");
    setWhatsappToken(organization.whatsappAccessToken || "");
    setGeminiKey(organization.geminiApiKey || "");
  }, [organization]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !isAdmin) {
      setError("Only organization admins can update settings.");
      return;
    }

    try {
      setError(null);
      setMessage(null);
      setIsSaving(true);
      const updates = {
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        whatsappPhoneNumberId: whatsappPhoneId,
        whatsappAccessToken: whatsappToken,
        geminiApiKey: geminiKey,
        whatsappConfigured: Boolean(whatsappPhoneId && whatsappToken),
        aiConfigured: Boolean(geminiKey),
      };

      await updateOrganization(organization.id, updates);
      setOrganization({ ...organization, ...updates, updatedAt: new Date().toISOString() });
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
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
          <span>Organization & API Settings</span>
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
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base">WhatsApp Business API Settings</CardTitle>
            </div>
            <CardDescription>Meta Cloud API Phone Number ID and Access Tokens</CardDescription>
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
              <label className="text-xs font-medium text-harbor-secondary">Permanent Access Token</label>
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
              <CardTitle className="text-base">Gemini AI Key & Model Config</CardTitle>
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

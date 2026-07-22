"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Bot, MessageSquare, Save, CheckCircle2, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const { user, organization, setOrganization } = useAuthStore();
  const [orgName, setOrgName] = useState(organization?.name || "Acme Corp");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || ""
  );
  const [whatsappToken, setWhatsappToken] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (organization) {
      setOrganization({ ...organization, name: orgName });
    }
    setMessage("Settings saved successfully!");
    setTimeout(() => setMessage(null), 3000);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-400" />
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Organization settings are restricted to Admin accounts only. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings className="h-6 w-6 text-indigo-400" />
          <span>Organization & API Settings</span>
        </h1>
        <p className="text-xs text-slate-400">
          Configure WhatsApp Business API credentials, Gemini AI model keys, and general settings.
        </p>
      </div>

      {message && (
        <div className="p-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Organization Info */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-base">Organization Profile</CardTitle>
            </div>
            <CardDescription>General workspace parameters and naming</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full max-w-md rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base">WhatsApp Business API Settings</CardTitle>
            </div>
            <CardDescription>Meta Cloud API Phone Number ID and Access Tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Phone Number ID</label>
              <input
                type="text"
                placeholder="109823471029348"
                value={whatsappPhoneId}
                onChange={(e) => setWhatsappPhoneId(e.target.value)}
                className="w-full max-w-md rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Permanent Access Token</label>
              <input
                type="password"
                placeholder="EAAG..."
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                className="w-full max-w-md rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gemini AI Settings */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-base">Gemini AI Key & Model Config</CardTitle>
            </div>
            <CardDescription>Google Gemini API Key for Task Extraction NLP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full max-w-md rounded-lg bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

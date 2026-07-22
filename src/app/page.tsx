import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  MessageSquare,
  Zap,
  CheckCircle2,
  Users,
  Shield,
  ArrowRight,
  Bot,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12 md:px-24">
      {/* Header / Navbar */}
      <header className="w-full max-w-7xl flex items-center justify-between py-4 border-b border-slate-800/80 mb-12">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            TaskFlow <span className="gradient-text">AI</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center space-y-8 my-8">
        <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 backdrop-blur-md">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Gemini AI & WhatsApp Business Cloud API</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Turn WhatsApp Messages Into <br />
          <span className="gradient-text">Actionable Team Tasks</span> Automatically
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          TaskFlow AI extracts tasks, due dates, priorities, and assignees directly from your
          conversations. Streamline organization workflow without breaking focus.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto space-x-2">
              <span>Start Free Trial</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              View Demo Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="w-full max-w-6xl my-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-indigo-500/40">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
              <MessageSquare className="h-6 w-6" />
            </div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>
              Capture tasks directly from incoming WhatsApp messages via real-time webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              No manual entry needed—your WhatsApp chat becomes a smart task inbox.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-500/40">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
              <Bot className="h-6 w-6" />
            </div>
            <CardTitle>Gemini Intelligence</CardTitle>
            <CardDescription>
              Extract priorities, deadlines, and automatically detect assignees with NLP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              Contextual AI parsing designed with modular fallback capabilities.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/40">
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
              <Users className="h-6 w-6" />
            </div>
            <CardTitle>Multi-Tenant SaaS</CardTitle>
            <CardDescription>
              Granular Admin & Team Member role management with Firebase auth & Firestore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              Secure access controls tailored for teams and organizations of any scale.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl border-t border-slate-800/80 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>TaskFlow AI &copy; 2026. Enterprise-Grade Security.</span>
        </div>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-400 cursor-pointer">API Status</span>
        </div>
      </footer>
    </div>
  );
}

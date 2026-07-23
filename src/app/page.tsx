import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  Zap,
  Users,
  Shield,
  ArrowRight,
  Bot,
} from "lucide-react";

export default function Home() {
  return (
    <div className="tf-atmosphere flex min-h-screen flex-col items-center px-6 py-10 md:px-16 lg:px-24">
      <header className="w-full max-w-7xl flex items-center justify-between py-5 mb-10 md:mb-16">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            TaskFlow <span className="gradient-text">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button variant="harbor">Get Started</Button>
          </Link>
        </div>
      </header>

      <section className="w-full max-w-3xl text-center space-y-6 my-auto py-8">
        <p className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
          TaskFlow <span className="gradient-text">AI</span>
        </p>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground/90 max-w-xl mx-auto">
          Turn WhatsApp messages into actionable team tasks
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Extract priorities, due dates, and assignees from conversations—so your team stays
          focused without leaving chat.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/register">
            <Button size="lg" variant="harbor" className="w-full sm:w-auto gap-2">
              <span>Start Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Open Dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="w-full max-w-6xl mt-16 mb-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border bg-card/90 hover:border-primary/35 transition-colors">
          <CardHeader>
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <MessageSquare className="h-5 w-5" />
            </div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>
              Capture tasks from inbound WhatsApp messages via real-time webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Your chat becomes a smart task inbox—without manual copy-paste.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/90 hover:border-primary/35 transition-colors">
          <CardHeader>
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Bot className="h-5 w-5" />
            </div>
            <CardTitle>Gemini Intelligence</CardTitle>
            <CardDescription>
              Structured intents, confidence routing, and assignee hints from natural language.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Async pipeline with fallbacks when AI is uncertain—built for reliability.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/90 hover:border-primary/35 transition-colors">
          <CardHeader>
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Users className="h-5 w-5" />
            </div>
            <CardTitle>Multi-Tenant Teams</CardTitle>
            <CardDescription>
              Admin and member roles with org-scoped Firebase auth and Firestore data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Secure access controls sized for startups that grow into larger orgs.
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="w-full max-w-7xl border-t border-border pt-8 mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground pb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>TaskFlow AI &copy; 2026</span>
        </div>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Status</span>
        </div>
      </footer>
    </div>
  );
}

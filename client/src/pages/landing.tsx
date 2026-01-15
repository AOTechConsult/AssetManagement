import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Shield,
  Package,
  FileSpreadsheet,
  Users,
  FileText,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Complete Asset Tracking",
    description:
      "Track hardware, software, and equipment with detailed records including purchase info, warranties, and locations.",
  },
  {
    icon: FileSpreadsheet,
    title: "Smart Import",
    description:
      "Upload spreadsheets and our system automatically maps columns to fields, making bulk imports effortless.",
  },
  {
    icon: Users,
    title: "Active Directory Integration",
    description:
      "Link assets to users synced from Active Directory for complete ownership tracking.",
  },
  {
    icon: FileText,
    title: "Comprehensive Auditing",
    description:
      "Every change is logged with who, what, when, and why. Full audit trail for compliance.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Dashboard insights show asset distribution, maintenance needs, and lifecycle status.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Role-based access control, secure authentication, and data encryption at rest.",
  },
];

const benefits = [
  "Reduce asset loss by up to 40%",
  "Eliminate spreadsheet chaos",
  "Pass compliance audits easily",
  "Track warranties automatically",
  "Assign assets to users instantly",
];

export default function LandingPage() {
  const { toast } = useToast();
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email: loginEmail, password: loginPassword });
      toast({ title: "Welcome back!" });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName || undefined,
      });
      toast({ title: "Account created successfully!" });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">AssetVault</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button asChild data-testid="button-get-started">
              <a href="#auth">Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                  Enterprise IT Asset Management{" "}
                  <span className="text-primary">Made Simple</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Track, manage, and audit all your IT assets in one powerful platform.
                  A complete KACE alternative built for modern teams.
                </p>
              </div>

              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild data-testid="button-hero-cta">
                  <a href="#auth">
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">Learn More</a>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Self-hosted. Your data stays with you.
              </p>
            </div>

            <div id="auth" className="scroll-mt-24">
              <Card className="shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle>Welcome to AssetVault</CardTitle>
                  <CardDescription>
                    Sign in to your account or create a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="login" data-testid="tab-login">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="register" data-testid="tab-register">
                        Register
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@company.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            data-testid="input-login-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            data-testid="input-login-password"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoggingIn}
                          data-testid="button-login"
                        >
                          {isLoggingIn ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="register">
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="register-firstname">First Name</Label>
                            <Input
                              id="register-firstname"
                              placeholder="John"
                              value={registerFirstName}
                              onChange={(e) => setRegisterFirstName(e.target.value)}
                              required
                              data-testid="input-register-firstname"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="register-lastname">Last Name</Label>
                            <Input
                              id="register-lastname"
                              placeholder="Smith"
                              value={registerLastName}
                              onChange={(e) => setRegisterLastName(e.target.value)}
                              data-testid="input-register-lastname"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-email">Email</Label>
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="you@company.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            required
                            data-testid="input-register-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Password</Label>
                          <Input
                            id="register-password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            required
                            minLength={6}
                            data-testid="input-register-password"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isRegistering}
                          data-testid="button-register"
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-muted/30 scroll-mt-20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything You Need to Manage IT Assets
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From laptops to servers, software licenses to warranties - track it all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Take Control?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Deploy on your own infrastructure and own your data
          </p>
          <Button size="lg" asChild data-testid="button-footer-cta">
            <a href="#auth">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="border-t py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AssetVault</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Self-Hosted Enterprise IT Asset Management Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

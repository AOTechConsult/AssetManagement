import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Package,
  FileSpreadsheet,
  Users,
  FileText,
  BarChart3,
  CheckCircle,
  ArrowRight,
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
      "Upload spreadsheets and our AI automatically maps columns to fields, making bulk imports effortless.",
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
            <Button variant="ghost" className="hidden sm:inline-flex">
              Features
            </Button>
            <Button asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
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
                  <a href="/api/login">
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline">
                  Watch Demo
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Free to use. No credit card required.
              </p>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <Card className="col-span-2">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Total Assets</p>
                        <p className="text-2xl font-bold">2,847</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-xl font-bold text-green-500">2,103</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Maintenance</p>
                      <p className="text-xl font-bold text-yellow-500">156</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/30">
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
            Join teams who have transformed their IT asset management
          </p>
          <Button size="lg" asChild data-testid="button-footer-cta">
            <a href="/api/login">
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
              Enterprise IT Asset Management Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

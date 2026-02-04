import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Upload, FolderOpen, Share2, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Upload,
      title: t('featureUpload'),
      description: t('featureUploadDesc')
    },
    {
      icon: FolderOpen,
      title: t('folders'),
      description: t('featureUploadDesc')
    },
    {
      icon: Share2,
      title: t('featureShare'),
      description: t('featureShareDesc')
    },
    {
      icon: Shield,
      title: t('featureSecure'),
      description: t('featureSecureDesc')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            MEDO STORAGE
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="flex flex-col gap-4 max-w-4xl mx-auto mb-12 w-full">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow w-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        {!user && (
          <div className="mt-8 flex gap-4">
            <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="gap-2">
              {t('getStarted')}
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Home;

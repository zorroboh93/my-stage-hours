import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Calendar, LogIn, UserPlus } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Se l'utente è già loggato, reindirizza alla home
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve avere almeno 6 caratteri",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Errore di accesso",
              description: "Email o password non corretti",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Errore",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Accesso effettuato",
            description: "Benvenuto!",
          });
          navigate("/");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Errore",
              description: "Questo indirizzo email è già registrato",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Errore",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Registrazione completata",
            description: "Account creato con successo! Ora puoi accedere.",
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore imprevisto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow mb-4">
            <Calendar className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Monitoraggio Presenze Stage</h1>
          <p className="text-muted-foreground">
            Gestisci le tue ore di alternanza scuola-lavoro
          </p>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>{isLogin ? "Accedi" : "Registrati"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Inserisci le tue credenziali per accedere"
                : "Crea un nuovo account per iniziare"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Almeno 6 caratteri
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  "Caricamento..."
                ) : isLogin ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Accedi
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Registrati
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                {isLogin
                  ? "Non hai un account? Registrati"
                  : "Hai già un account? Accedi"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

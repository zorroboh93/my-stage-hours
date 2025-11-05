import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, TrendingUp, AlertTriangle, Plus, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import type { User } from "@supabase/supabase-js";

interface AttendanceEntry {
  id: string;
  date: string;
  hours: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [newHours, setNewHours] = useState("");
  const [theoreticalHoursPerDay] = useState(8);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");
  const [pendingEntry, setPendingEntry] = useState<{ date: string; hours: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Giorni speciali senza ore indicate (festivi, chiusure, ecc.)
  // Basato sul calendario PDF fornito
  const specialDays = useMemo(() => {
    const days = new Set([
      // Novembre 2024
      "2024-11-01", // Tutti i Santi
      // Dicembre 2024
      "2024-12-08", "2024-12-23", "2024-12-24", "2024-12-25", "2024-12-26", "2024-12-27", 
      "2024-12-28", "2024-12-29", "2024-12-30", "2024-12-31",
      // Gennaio 2025
      "2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05", "2025-01-06",
      // Aprile 2025 (Pasqua)
      "2025-04-17", "2025-04-18", "2025-04-19", "2025-04-20", "2025-04-21", "2025-04-22",
      "2025-04-23", "2025-04-24", "2025-04-25",
      // Maggio 2025
      "2025-05-01", "2025-05-02",
      // Giugno 2025
      "2025-06-02",
    ]);
    
    // Aggiungi tutti i sabati e domeniche del periodo dello stage
    const start = new Date(2024, 9, 29); // 29 ottobre 2024
    const end = new Date(2025, 5, 30); // 30 giugno 2025
    let current = new Date(start);
    
    while (current <= end) {
      const day = current.getDay();
      // Aggiungi sabati (6) e domeniche (0)
      if (day === 0 || day === 6) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const dayStr = String(current.getDate()).padStart(2, '0');
        days.add(`${year}-${month}-${dayStr}`);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, []);

  useEffect(() => {
    // Controlla lo stato di autenticazione
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    // Listener per cambiamenti nell'autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Imposta la data odierna di default
    setNewDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    // Carica le presenze dal database
    if (user) {
      loadEntries();
    }
  }, [user]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_entries")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      setEntries(
        data.map((entry) => ({
          id: entry.id,
          date: entry.date,
          hours: Number(entry.hours),
        }))
      );
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Ore totali previste per lo stage (da PDF)
  const totalStageHours = 495;

  const calculateTheoreticalHours = useMemo(() => {
    const stageStartDate = new Date("2024-10-29");
    const stageEndDate = new Date("2025-06-30");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = today < stageEndDate ? today : stageEndDate;
    
    if (endDate < stageStartDate) return 0;
    
    let current = new Date(stageStartDate);
    let workDays = 0;

    while (current <= endDate) {
      const day = current.getDay();
      const dateString = current.toISOString().split("T")[0];
      
      // Conta solo giorni lavorativi (lun-ven) non festivi
      if (day !== 0 && day !== 6 && !specialDays.has(dateString)) {
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workDays * theoreticalHoursPerDay;
  }, [theoreticalHoursPerDay, specialDays]);

  const totalActualHours = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.hours, 0),
    [entries]
  );

  const threshold = useMemo(() => {
    return ((1 - totalActualHours / totalStageHours) * 100);
  }, [totalActualHours]);

  const isCritical = threshold > 25;

  const needsConfirmation = (dateString: string): boolean => {
    // Crea la data senza timezone per evitare offset
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // I venerdì non richiedono MAI conferma (anche se sono festivi o senza ore nel calendario)
    if (dayOfWeek === 5) return false;
    
    // Giorni speciali (festivi, weekend, etc.) richiedono conferma
    return specialDays.has(dateString);
  };

  const validateEntry = () => {
    if (!newDate || !newHours) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive",
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Crea la data selezionata senza timezone
    const [year, month, day] = newDate.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      toast({
        title: "Errore",
        description: "Non puoi registrare ore per date future",
        variant: "destructive",
      });
      return;
    }

    const existingEntry = entries.find(e => e.date === newDate);
    if (existingEntry) {
      toast({
        title: "Errore",
        description: "Hai già registrato le ore per questa data",
        variant: "destructive",
      });
      return;
    }

    const hours = Number(newHours);
    if (isNaN(hours) || hours < 0 || hours > 8) {
      toast({
        title: "Errore",
        description: "Inserisci un numero di ore valido (0-8)",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const addEntry = async () => {
    if (!validateEntry()) return;

    const hours = Number(newHours);

    // Controlla se serve conferma
    if (needsConfirmation(newDate)) {
      // Crea la data senza timezone per evitare offset
      const [year, month, day] = newDate.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const dayName = date.toLocaleDateString("it-IT", { weekday: "long" });
      const dayNumber = day;
      
      setConfirmDialogMessage(
        `Sei sicuro di voler confermare la presenza per ${dayName} ${dayNumber}?`
      );
      setPendingEntry({ date: newDate, hours });
      setShowConfirmDialog(true);
      return;
    }

    // Aggiungi direttamente senza conferma
    await saveEntry(newDate, hours);
  };

  const saveEntry = async (date: string, hours: number) => {
    try {
      const { error } = await supabase
        .from("attendance_entries")
        .insert({
          user_id: user!.id,
          date: date,
          hours: hours,
        });

      if (error) throw error;

      await loadEntries();
      
      const todayStr = new Date().toISOString().split("T")[0];
      setNewDate(todayStr);
      setNewHours("");

      toast({
        title: hours === 0 ? "Assenza registrata" : "Presenza registrata",
        description: `${hours} ore registrate per il ${(() => {
          const [year, month, day] = date.split("-").map(Number);
          const d = new Date(year, month - 1, day);
          return d.toLocaleDateString("it-IT");
        })()}`,
      });

      const hoursInput = document.getElementById("hours") as HTMLInputElement | null;
      hoursInput?.focus();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile salvare: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setEntryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    try {
      const { error } = await supabase
        .from("attendance_entries")
        .delete()
        .eq("id", entryToDelete);

      if (error) throw error;

      await loadEntries();
      toast({
        title: "Presenza eliminata",
        description: "La presenza è stata rimossa",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare: " + error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleConfirmEntry = async () => {
    if (!pendingEntry) return;
    
    const [year, month, day] = pendingEntry.date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString("it-IT", { weekday: "long" });
    
    setShowConfirmDialog(false);
    await saveEntry(pendingEntry.date, pendingEntry.hours);
    setPendingEntry(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header con logout */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Monitoraggio Presenze Stage
            </h1>
            <p className="text-muted-foreground">
              Traccia le tue ore di alternanza scuola-lavoro
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="ml-4"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>

        {/* Alert soglia critica */}
        {isCritical && entries.length > 0 && (
          <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Attenzione! Soglia critica superata</AlertTitle>
            <AlertDescription>
              La tua percentuale di assenza è del {threshold.toFixed(1)}% e ha superato il limite del 25%.
              È necessario recuperare le ore mancanti.
            </AlertDescription>
          </Alert>
        )}

        {/* Metriche principali */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="transition-all hover:shadow-lg border-success/20 bg-gradient-to-br from-card to-success/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ore Effettive</CardTitle>
              <Clock className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{totalActualHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">Ore completate finora</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ore Teoriche</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalStageHours}</div>
              <p className="text-xs text-muted-foreground mt-1">Ore totali previste per lo stage</p>
            </CardContent>
          </Card>

          <Card
            className={`transition-all hover:shadow-lg ${
              isCritical
                ? "border-destructive/20 bg-gradient-to-br from-card to-destructive/5"
                : "border-warning/20 bg-gradient-to-br from-card to-warning/5"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Soglia Assenze</CardTitle>
              <TrendingUp
                className={`h-4 w-4 ${isCritical ? "text-destructive" : "text-warning"}`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${
                  isCritical ? "text-destructive" : "text-warning"
                }`}
              >
                {threshold.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Limite massimo: 25%</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendario */}
        <AttendanceCalendar
          entries={entries}
          theoreticalHoursPerDay={theoreticalHoursPerDay}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Registra Presenza
              </CardTitle>
              <CardDescription>Inserisci la data e le ore lavorate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Ore Lavorate</Label>
                  <Input
                    id="hours"
                    type="number"
                    placeholder="8"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    step="0.5"
                    min="0"
                    max="8"
                  />
                </div>
                <Button
                  onClick={addEntry}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Presenza
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Storico */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Storico Presenze</CardTitle>
              <CardDescription>Ultime registrazioni ({entries.length} totali)</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna presenza registrata</p>
                  <p className="text-sm">Inizia ad aggiungere le tue giornate</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {entries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">
                            {(() => {
                              const [year, month, day] = entry.date.split("-").map(Number);
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString("it-IT", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              });
                            })()}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                entry.hours === 0
                                  ? "bg-destructive/20 text-destructive"
                                  : entry.hours < 8
                                  ? "bg-warning/20 text-warning"
                                  : "bg-success/20 text-success"
                              }`}
                            >
                              {entry.hours}h
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(entry.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Elimina
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        {entries.length > 0 && (
          <Card className="mt-6 shadow-lg">
            <CardHeader>
              <CardTitle>Progresso Stage</CardTitle>
              <CardDescription>Visualizzazione del tuo avanzamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completamento</span>
                  <span className="font-medium">
                    {totalStageHours > 0
                      ? ((totalActualHours / totalStageHours) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCritical
                        ? "bg-gradient-to-r from-destructive to-destructive/80"
                        : "bg-gradient-to-r from-success to-success/80"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (totalActualHours / totalStageHours) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalActualHours} / {totalStageHours} ore completate
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog conferma giornata speciale */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma presenza</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setPendingEntry(null);
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEntry}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa presenza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setEntryToDelete(null);
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;

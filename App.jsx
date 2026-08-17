import React, { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient.js";
import Login from "./components/Login.jsx";
import NairobiOS from "./components/NairobiOS.jsx";

const ALLOW_DEMO = import.meta.env.VITE_ALLOW_DEMO === "true";

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 size={22} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const authed = session || (ALLOW_DEMO && !isSupabaseConfigured);

  if (!authed) {
    return <Login onAuthed={setSession} />;
  }

  return (
    <NairobiOS
      session={session}
      onSignOut={async () => {
        if (isSupabaseConfigured) await supabase.auth.signOut();
        setSession(null);
      }}
    />
  );
}

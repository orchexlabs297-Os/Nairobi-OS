import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient.js";
import Login from "./components/Login.jsx";
import CobrosApp from "./components/CobrosApp.jsx";

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
      <div style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--tinta)" }}>
        <Loader2 size={24} className="girando" color="#d9bc8c" />
      </div>
    );
  }

  const authed = session || (ALLOW_DEMO && !isSupabaseConfigured);

  if (!authed) {
    return <Login onAuthed={setSession} />;
  }

  return (
    <CobrosApp
      onSignOut={async () => {
        if (isSupabaseConfigured) await supabase.auth.signOut();
        setSession(null);
      }}
    />
  );
}

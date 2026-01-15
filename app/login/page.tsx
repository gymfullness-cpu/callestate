"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = () => {
    if (!email || !password) {
      alert("Uzupełnij email i hasło");
      return;
    }

    // MVP auth
    localStorage.setItem("auth-user", email);
    router.push("/dashboard");
  };

  return (
    <main style={{ padding: 40, maxWidth: 400 }}>
      <h1>” Logowanie</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="Hasło"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: 10 }}
      />

      <button onClick={login}>Zaloguj się</button>
    </main>
  );
}

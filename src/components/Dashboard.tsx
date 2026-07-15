import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

// IMPORTACIONES OPERATIVAS DE TUS SUB-COMPONENTES MODULARES
import Admin from "./Admin";
import Jornadas from "./Jornadas";
import Tabla from "./Tabla";

interface Props {
  user: User;
}

const ADMIN_EMAIL = "francisco.ml2809@gmail.com";

export default function Dashboard({ user }: Props) {
  const [seccion, setSeccion] = useState<"jornadas" | "tabla">("jornadas");
  const [enAdmin, setEnAdmin] = useState(false);

  useEffect(() => {
    const guardarUsuario = async () => {
      try {
        // Registro y actualización estática y automática del perfil del amigo al iniciar sesión
        await setDoc(doc(db, "usuarios", user.uid), {
          uid: user.uid,
          nombre: user.displayName || user.email,
          email: user.email
        }, { merge: true });
      } catch (e) {
        console.error("Error al persistir el perfil del usuario en Firestore", e);
      }
    };
    guardarUsuario();
  }, [user.uid]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error al cerrar sesión", e);
    }
  };

  // Ruteo condicional puro hacia el Panel Maestro de Administración
  if (enAdmin) {
    return <Admin user={user} onBack={() => setEnAdmin(false)} />;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>

      {/* Header Superior Principal */}
      <div style={{
        backgroundColor: "#16213e", padding: "12px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>⚽</span>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "15px" }}>Quiniela Liga MX</div>
            <div style={{ color: "#888", fontSize: "12px" }}>Hola, {user.displayName || user.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {user.email === ADMIN_EMAIL && (
            <button onClick={() => setEnAdmin(true)} style={{
              backgroundColor: "#0f3460", border: "none",
              color: "#fff", padding: "6px 14px", borderRadius: "8px",
              cursor: "pointer", fontSize: "13px", fontWeight: "bold"
            }}>
              ⚙️ Admin
            </button>
          )}
          <button onClick={handleSignOut} style={{
            backgroundColor: "transparent", border: "1px solid #e94560",
            color: "#e94560", padding: "6px 14px", borderRadius: "8px",
            cursor: "pointer", fontSize: "13px", fontWeight: "bold"
          }}>
            Salir
          </button>
        </div>
      </div>

      {/* Barra de Navegación de Pestañas de Usuario Compacta */}
      <div style={{ display: "flex", backgroundColor: "#16213e", borderBottom: "1px solid #333" }}>
        {[
          { key: "jornadas", label: "🗓 Jornadas" },
          { key: "tabla", label: "🏆 Tabla General" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSeccion(item.key as any)}
            style={{
              flex: 1, padding: "12px", border: "none",
              backgroundColor: "transparent", cursor: "pointer",
              color: seccion === item.key ? "#e94560" : "#888",
              borderBottom: seccion === item.key ? "2px solid #e94560" : "2px solid transparent",
              fontSize: "13px", fontWeight: seccion === item.key ? "bold" : "normal"
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Inyección Limpia de Vistas Secundarias Externas */}
      <div style={{ padding: "16px" }}>
        {seccion === "jornadas" && (
          <Jornadas user={user} />
        )}

        {seccion === "tabla" && (
          <Tabla />
        )}
      </div>
    </div>
  );
}

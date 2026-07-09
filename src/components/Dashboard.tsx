import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
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
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        nombre: user.displayName || user.email,
        email: user.email
        });
        };
        guardarUsuario();
        }, []);

const handleSignOut = async () => {
await signOut(auth);
};

if (enAdmin) {
return <Admin user={user} onBack={() => setEnAdmin(false)} />;
}

return (
<div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>

{/* Header */}
<div style={{
backgroundColor: "#16213e", padding: "16px 20px",
display: "flex", justifyContent: "space-between", alignItems: "center",
boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
}}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<span style={{ fontSize: "24px" }}>⚽</span>
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
cursor: "pointer", fontSize: "13px"
}}>
⚙️ Admin
</button>
)}
<button onClick={handleSignOut} style={{
backgroundColor: "transparent", border: "1px solid #e94560",
color: "#e94560", padding: "6px 14px", borderRadius: "8px",
cursor: "pointer", fontSize: "13px"
}}>
Salir
</button>
</div>
</div>

{/* Navegación */}
<div style={{ display: "flex", backgroundColor: "#16213e", borderBottom: "1px solid #333" }}>
{[
{ key: "jornadas", label: "🗓 Jornadas" },
{ key: "tabla", label: "🏆 Tabla" },
].map((item) => (
<button
key={item.key}
onClick={() => setSeccion(item.key as any)}
style={{
flex: 1, padding: "14px", border: "none",
backgroundColor: "transparent", cursor: "pointer",
color: seccion === item.key ? "#e94560" : "#888",
borderBottom: seccion === item.key ? "2px solid #e94560" : "2px solid transparent",
fontSize: "14px", fontWeight: seccion === item.key ? "bold" : "normal"
}}
>
{item.label}
</button>
))}
</div>

{/* Contenido */}
<div style={{ padding: "20px" }}>
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
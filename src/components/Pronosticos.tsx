import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
collection, getDocs, doc, setDoc, getDoc
} from "firebase/firestore";
import type { User } from "firebase/auth";

interface Props {
user: User;
jornada: any;
onBack: () => void;
}

export default function Pronosticos({ user, jornada, onBack }: Props) {
const [partidos, setPartidos] = useState<any[]>([]);
const [pronosticos, setPronosticos] = useState<{ [key: string]: { local: string; visitante: string } }>({});
const [loading, setLoading] = useState(true);
const [guardando, setGuardando] = useState(false);
const [mensaje, setMensaje] = useState("");


useEffect(() => {
  const cargar = async () => {
  const partidosSnap = await getDocs(
  collection(db, "jornadas", jornada.id, "partidos")
  );
  const lista = partidosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  setPartidos(lista);
  
  const iniciales: any = {};
  for (const partido of lista) {
  const ref = doc(db, "pronosticos", '${user.uid}_${partido.id}');
  const proSnap = await getDoc(ref);
  if (proSnap.exists()) {
  const data = proSnap.data();
  iniciales[partido.id] = {
  local: String(data.golesLocal),
  visitante: String(data.golesVisitante)
  };
  } else {
  iniciales[partido.id] = { local: "", visitante: "" };
  }
  }
  setPronosticos(iniciales);
  setLoading(false);
  };
  cargar();
  }, []);

const handleChange = (partidoId: string, tipo: "local" | "visitante", valor: string) => {
if (valor !== "" && (isNaN(Number(valor)) || Number(valor) < 0)) return;
setPronosticos(prev => ({
...prev,
[partidoId]: { ...prev[partidoId], [tipo]: valor }
}));
};

const guardar = async () => {
setGuardando(true);
setMensaje("");
try {
for (const partido of partidos) {
const p = pronosticos[partido.id];
if (p.local === "" || p.visitante === "") continue;
await setDoc(doc(db, "pronosticos", '${user.uid}_${partido.id}'), {
uid: user.uid,
jornadaId: jornada.id,
partidoId: partido.id,
golesLocal: parseInt(p.local),
golesVisitante: parseInt(p.visitante),
puntos: 0
});
}
setMensaje("✅ Pronósticos guardados");
} catch (e) {
setMensaje("❌ Error al guardar");
}
setGuardando(false);
};

if (loading) return (
<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
Cargando partidos...
</div>
);

return (
<div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>

{/* Header */}
<div style={{
backgroundColor: "#16213e", padding: "16px 20px",
display: "flex", justifyContent: "space-between", alignItems: "center",
boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
}}>
<div>
<div style={{ fontWeight: "bold", fontSize: "15px" }}>
Jornada {jornada.numero}
</div>
<div style={{ color: "#888", fontSize: "12px" }}>Llena tus pronósticos</div>
</div>
<button onClick={onBack} style={{
backgroundColor: "transparent", border: "1px solid #888",
color: "#888", padding: "6px 14px", borderRadius: "8px",
cursor: "pointer", fontSize: "13px"
}}>
← Volver
</button>
</div>

<div style={{ padding: "20px" }}>
{partidos.length === 0 ? (
<div style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "20px", textAlign: "center", color: "#888"
}}>
<p>No hay partidos en esta jornada aún.</p>
</div>
) : (
<>
{partidos.map((partido) => (
<div key={partido.id} style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "16px", marginBottom: "12px", border: "1px solid #333"
}}>
<div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
{partido.fechaHora}
</div>
<div style={{
display: "grid", gridTemplateColumns: "1fr auto 1fr",
alignItems: "center", gap: "10px"
}}>
<div style={{ textAlign: "center" }}>
<div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>
{partido.local}
</div>
<input
type="number"
min="0"
placeholder="0"
value={pronosticos[partido.id]?.local || ""}
onChange={(e) => handleChange(partido.id, "local", e.target.value)}
style={golesInput}
/>
</div>
<div style={{ color: "#e94560", fontWeight: "bold", fontSize: "18px" }}>
VS
</div>
<div style={{ textAlign: "center" }}>
<div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>
{partido.visitante}
</div>
<input
type="number"
min="0"
placeholder="0"
value={pronosticos[partido.id]?.visitante || ""}
onChange={(e) => handleChange(partido.id, "visitante", e.target.value)}
style={golesInput}
/>
</div>
</div>
</div>
))}

{mensaje && (
<p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", textAlign: "center" }}>
{mensaje}
</p>
)}

<button
onClick={guardar}
disabled={guardando}
style={{
width: "100%", padding: "14px", backgroundColor: "#e94560",
color: "#fff", border: "none", borderRadius: "8px",
fontSize: "16px", fontWeight: "bold", cursor: "pointer",
marginTop: "8px"
}}
>
{guardando ? "Guardando..." : "💾 Guardar pronósticos"}
</button>
</>
)}
</div>
</div>
);
}

const golesInput: React.CSSProperties = {
width: "60px", padding: "10px", textAlign: "center",
borderRadius: "8px", border: "1px solid #e94560",
backgroundColor: "#0f3460", color: "#fff",
fontSize: "18px", fontWeight: "bold"
};
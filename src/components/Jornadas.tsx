import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import type { User } from "firebase/auth";
import Pronosticos from "./Pronosticos";
import MisPuntos from "./MisPuntos";

interface Props {
user: User;
}

export default function Jornadas({ user }: Props) {
const [jornadas, setJornadas] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [jornadaActiva, setJornadaActiva] = useState<any>(null);
const [jornadaMisPuntos, setJornadaMisPuntos] = useState<any>(null);

useEffect(() => {
const cargar = async () => {
const q = query(collection(db, "jornadas"), orderBy("numero"));
const snap = await getDocs(q);
const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
setJornadas(lista);
setLoading(false);
};
cargar();
}, []);

useEffect(() => {
  const path = window.location.pathname;
  const match = path.match(/\/jornada\/(.+)/);
  if (match && jornadas.length > 0) {
  const jornadaId = match[1];
  const encontrada = jornadas.find((j: any) => j.id === jornadaId);
  if (encontrada) setJornadaActiva(encontrada);
  }
  }, [jornadas]);

if (jornadaMisPuntos) return (
  <MisPuntos
  user={user}
  jornada={jornadaMisPuntos}
  onBack={() => setJornadaMisPuntos(null)}
  />
  );

if (jornadaActiva) return (
  <Pronosticos
    user={user}
    jornada={jornadaActiva}
    onBack={() => setJornadaActiva(null)}
    />
);

if (loading) return (
<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
Cargando jornadas...
</div>
);

if (jornadas.length === 0) return (
<div style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "20px", textAlign: "center", color: "#888"
}}>
<div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
<p>No hay jornadas activas por el momento.</p>
<p style={{ fontSize: "13px" }}>El administrador publicará la próxima jornada pronto.</p>
</div>
);

return (
<div>
<h2 style={{ color: "#e94560", marginTop: 0 }}>Jornadas</h2>
{jornadas.map((jornada) => (
<div key={jornada.id} style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "16px", marginBottom: "12px",
border: "1px solid #333"
}}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<div>
<div style={{ fontWeight: "bold", fontSize: "16px" }}>
Jornada {jornada.numero}
</div>
<div style={{ color: "#888", fontSize: "13px", marginTop: "4px" }}>
{jornada.fechaInicio} — {jornada.fechaFin}
</div>
</div>
<div style={{
backgroundColor: jornada.estado === "abierta" ? "#1b5e20" : "#333",
color: jornada.estado === "abierta" ? "#4caf50" : "#888",
padding: "4px 10px", borderRadius: "20px", fontSize: "12px"
}}>
{jornada.estado === "abierta" ? "Abierta" : "Cerrada"}
</div>
</div>

{jornada.estado === "abierta" && (
<button
  onClick={() => setJornadaActiva(jornada)}
style={{
marginTop: "12px", width: "100%", padding: "10px",
backgroundColor: "#e94560", color: "#fff", border: "none",
borderRadius: "8px", fontSize: "14px", cursor: "pointer",
fontWeight: "bold"
}}>
Llenar pronósticos →
</button>
)}


  <button
  onClick={() => setJornadaMisPuntos(jornada)}
  style={{
  marginTop: "12px", width: "100%", padding: "10px",
  backgroundColor: "#0f3460", color: "#fff", border: "none",
  borderRadius: "8px", fontSize: "14px", cursor: "pointer",
  fontWeight: "bold"
  }}
  >
  📊 Ver mis puntos
  </button>

</div>
))}
</div>
);
}
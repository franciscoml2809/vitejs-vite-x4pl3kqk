import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Tabla() {
const [jornadas, setJornadas] = useState<any[]>([]);
const [jornadaSeleccionada, setJornadaSeleccionada] = useState<any>(null);
const [tabla, setTabla] = useState<any[]>([]);
const [usuarios, setUsuarios] = useState<{ [uid: string]: string }>({});
const [loading, setLoading] = useState(true);

useEffect(() => {
const cargar = async () => {
const jornadasSnap = await getDocs(
query(collection(db, "jornadas"), orderBy("numero"))
);
const listaJornadas = jornadasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
setJornadas(listaJornadas);

// Seleccionar jornada predeterminada
const hoy = new Date();
const limite = new Date();
limite.setDate(limite.getDate() + 2);

let jornadaDefault = listaJornadas[0];
for (const j of listaJornadas) {
const fechaFin = new Date((j as any).fechaFin);
if (fechaFin >= hoy || fechaFin <= limite) {
jornadaDefault = j;
break;
}
}
setJornadaSeleccionada(jornadaDefault);

// Cargar usuarios
const usersSnap = await getDocs(collection(db, "usuarios"));
const nombresMap: { [uid: string]: string } = {};
usersSnap.docs.forEach(d => {
const data = d.data();
nombresMap[data.uid] = data.nombre || data.email;
});
setUsuarios(nombresMap);
setLoading(false);
};
cargar();
}, []);

useEffect(() => {
if (!jornadaSeleccionada) return;
cargarTablaJornada(jornadaSeleccionada.id);
}, [jornadaSeleccionada]);

const cargarTablaJornada = async (jornadaId: string) => {
const proSnap = await getDocs(
query(collection(db, "pronosticos"))
);

const puntajesPorUsuario: { [uid: string]: number } = {};
proSnap.docs.forEach(d => {
const pro = d.data();
if (pro.jornadaId !== jornadaId) return;
if (!puntajesPorUsuario[pro.uid]) puntajesPorUsuario[pro.uid] = 0;
puntajesPorUsuario[pro.uid] += pro.puntos || 0;
});

const listaTabla = Object.entries(puntajesPorUsuario)
.map(([uid, puntos]) => ({ uid, puntos }))
.sort((a, b) => b.puntos - a.puntos);

setTabla(listaTabla);
};

if (loading) return (
<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
Cargando...
</div>
);

const medallas = ["🥇", "🥈", "🥉"];

return (
<div>
<h2 style={{ color: "#e94560", marginTop: 0 }}>Tabla de posiciones</h2>

{/* Selector de jornada */}
<select
value={jornadaSeleccionada?.id || ""}
onChange={(e) => {
const j = jornadas.find(j => j.id === e.target.value);
setJornadaSeleccionada(j);
}}
style={{
width: "100%", padding: "12px", marginBottom: "16px",
borderRadius: "8px", border: "1px solid #333",
backgroundColor: "#0f3460", color: "#fff",
fontSize: "15px"
}}
>
{jornadas.map((j: any) => (
<option key={j.id} value={j.id}>
Jornada {j.numero} — {j.fechaInicio} al {j.fechaFin}
</option>
))}
</select>

{tabla.length === 0 ? (
<div style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "20px", textAlign: "center", color: "#888"
}}>
<div style={{ fontSize: "40px", marginBottom: "12px" }}>🏆</div>
<p>Aún no hay puntos en esta jornada.</p>
</div>
) : (
tabla.map((entry: any, index: number) => (
<div key={entry.uid} style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "16px", marginBottom: "10px",
border: index === 0 ? "1px solid #e94560" : "1px solid #333",
display: "flex", alignItems: "center", gap: "14px"
}}>
<div style={{ fontSize: "24px", minWidth: "32px", textAlign: "center" }}>
{medallas[index] || (index + 1)}
</div>
<div style={{ flex: 1 }}>
<div style={{ fontWeight: "bold", fontSize: "15px" }}>
{usuarios[entry.uid] || entry.uid}
</div>
<div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
Jornada {jornadaSeleccionada?.numero}
</div>
</div>
<div style={{ textAlign: "right" }}>
<div style={{
fontSize: "22px", fontWeight: "bold",
color: index === 0 ? "#e94560" : "#fff"
}}>
{entry.puntos}
</div>
<div style={{ color: "#888", fontSize: "11px" }}>pts</div>
</div>
</div>
))
)}
</div>
);
}
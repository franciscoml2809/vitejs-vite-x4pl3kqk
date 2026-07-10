import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Tabla() {
const [jornadas, setJornadas] = useState<any[]>([]);
const [jornadaSeleccionada, setJornadaSeleccionada] = useState<any>(null);
const [tabla, setTabla] = useState<any[]>([]);
const [usuarios, setUsuarios] = useState<{ [uid: string]: string }>({});
const [loading, setLoading] = useState(true);
const [loadingTabla, setLoadingTabla] = useState(false);

useEffect(() => {
const cargar = async () => {
const jornadasSnap = await getDocs(
query(collection(db, "jornadas"), orderBy("numero"))
);
const listaJornadas = jornadasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
setJornadas(listaJornadas);

// Seleccionar jornada predeterminada
const hoy = new Date();
let jornadaDefault = listaJornadas[0];
for (const j of listaJornadas) {
const fechaFin = new Date((j as any).fechaFin);
const dosDispuesDelFin = new Date(fechaFin);
dosDispuesDelFin.setDate(dosDispuesDelFin.getDate() + 2);
if (hoy <= dosDispuesDelFin) {
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
cargarTabla(jornadaSeleccionada.id);
}, [jornadaSeleccionada]);

const cargarTabla = async (jornadaId: string) => {
setLoadingTabla(true);
try {
const posicionesSnap = await getDocs(
collection(db, "tablaPorJornada", jornadaId, "posiciones")
);
const lista = posicionesSnap.docs
.map(d => ({ uid: d.id, ...d.data() }))
.sort((a: any, b: any) => b.totalPuntos - a.totalPuntos);
setTabla(lista);
} catch (e) {
setTabla([]);
}
setLoadingTabla(false);
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

<select
value={jornadaSeleccionada?.id || ""}
onChange={(e) => {
const j = jornadas.find((j: any) => j.id === e.target.value);
setJornadaSeleccionada(j);
}}
style={{
width: "100%", padding: "12px", marginBottom: "16px",
borderRadius: "8px", border: "1px solid #333",
backgroundColor: "#0f3460", color: "#fff", fontSize: "15px"
}}
>
{jornadas.map((j: any) => (
<option key={j.id} value={j.id}>
Jornada {j.numero} — {j.fechaInicio} al {j.fechaFin}
</option>
))}
</select>

{loadingTabla ? (
<div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
Cargando tabla...
</div>
) : tabla.length === 0 ? (
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
{entry.totalPuntos}
</div>
<div style={{ color: "#888", fontSize: "11px" }}>pts</div>
</div>
</div>
))
)}
</div>
);
}
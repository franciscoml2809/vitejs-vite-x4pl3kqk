import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Tabla() {
const [tabla, setTabla] = useState<any[]>([]);
const [usuarios, setUsuarios] = useState<{ [uid: string]: string }>({});
const [loading, setLoading] = useState(true);

useEffect(() => {
const cargar = async () => {
// Cargar tabla de puntos
const tablaSnap = await getDocs(
query(collection(db, "tabla"), orderBy("totalPuntos", "desc"))
);
const listaTabla = tablaSnap.docs.map(d => ({ id: d.id, ...d.data() }));

// Cargar nombres de usuarios
const usersSnap = await getDocs(collection(db, "usuarios"));
const nombresMap: { [uid: string]: string } = {};
usersSnap.docs.forEach(d => {
const data = d.data();
nombresMap[data.uid] = data.nombre || data.email;
});

setTabla(listaTabla);
setUsuarios(nombresMap);
setLoading(false);
};
cargar();
}, []);

if (loading) return (
<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
Cargando tabla...
</div>
);

if (tabla.length === 0) return (
<div style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "20px", textAlign: "center", color: "#888"
}}>
<div style={{ fontSize: "40px", marginBottom: "12px" }}>🏆</div>
<p>Aún no hay puntos registrados.</p>
<p style={{ fontSize: "13px" }}>Los puntos aparecerán cuando se cierre la primera jornada.</p>
</div>
);

const medallas = ["🥇", "🥈", "🥉"];

return (
<div>
<h2 style={{ color: "#e94560", marginTop: 0 }}>Tabla de posiciones</h2>
{tabla.map((entry: any, index: number) => (
<div key={entry.id} style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "16px", marginBottom: "10px",
border: index === 0 ? "1px solid #e94560" : "1px solid #333",
display: "flex", alignItems: "center", gap: "14px"
}}>
<div style={{ fontSize: "24px", minWidth: "32px", textAlign: "center" }}>
{medallas[index] || '${index + 1}'}
</div>
<div style={{ flex: 1 }}>
<div style={{ fontWeight: "bold", fontSize: "15px" }}>
{usuarios[entry.uid] || entry.uid}
</div>
<div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
{Object.keys(entry.jornadas || {}).length} jornadas jugadas
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
))}
</div>
);
}
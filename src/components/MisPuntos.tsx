import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";

interface Props {
user: User;
jornada: any;
onBack: () => void;
}

export default function MisPuntos({ user, jornada, onBack }: Props) {
const [datos, setDatos] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [totalPuntos, setTotalPuntos] = useState(0);

useEffect(() => {
const cargar = async () => {
const partidosSnap = await getDocs(
collection(db, "jornadas", jornada.id, "partidos")
);
const partidos: { [id: string]: any } = {};
partidosSnap.docs.forEach(d => {
partidos[d.id] = { id: d.id, ...d.data() };
});

const proSnap = await getDocs(
query(
collection(db, "pronosticos"),
where("uid", "==", user.uid),
where("jornadaId", "==", jornada.id)
)
);

let total = 0;
const lista = proSnap.docs.map(d => {
const pro = d.data();
const partido = partidos[pro.partidoId];
total += pro.puntos || 0;
return { ...pro, partido };
});

setDatos(lista);
setTotalPuntos(total);
setLoading(false);
};
cargar();
}, []);

const getColor = (puntos: number) => {
if (puntos === 3) return "#4caf50";
if (puntos === 1) return "#ff9800";
return "#e94560";
};

const getIcono = (puntos: number) => {
if (puntos === 3) return "⭐";
if (puntos === 1) return "✅";
return "❌";
};

if (loading) return (
<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
Cargando...
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
Mis puntos — Jornada {jornada.numero}
</div>
<div style={{ color: "#888", fontSize: "12px" }}>
Total: {totalPuntos} puntos
</div>
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

{/* Resumen */}
<div style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "20px", marginBottom: "16px", textAlign: "center"
}}>
<div style={{ fontSize: "48px", fontWeight: "bold", color: "#e94560" }}>
{totalPuntos}
</div>
<div style={{ color: "#888", fontSize: "14px" }}>puntos en esta jornada</div>
<div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "12px" }}>
<div style={{ textAlign: "center" }}>
<div style={{ color: "#4caf50", fontWeight: "bold" }}>
{datos.filter(d => d.puntos === 3).length}
</div>
<div style={{ color: "#888", fontSize: "12px" }}>⭐ Exactos</div>
</div>
<div style={{ textAlign: "center" }}>
<div style={{ color: "#ff9800", fontWeight: "bold" }}>
{datos.filter(d => d.puntos === 1).length}
</div>
<div style={{ color: "#888", fontSize: "12px" }}>✅ Resultado</div>
</div>
<div style={{ textAlign: "center" }}>
<div style={{ color: "#e94560", fontWeight: "bold" }}>
{datos.filter(d => d.puntos === 0).length}
</div>
<div style={{ color: "#888", fontSize: "12px" }}>❌ Fallados</div>
</div>
</div>
</div>

{/* Detalle por partido */}
{datos.map((item, index) => (
<div key={index} style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "16px", marginBottom: "10px",
border: "1px solid " + getColor(item.puntos)
}}>
<div style={{
display: "flex", justifyContent: "space-between",
alignItems: "center", marginBottom: "10px"
}}>
<div style={{ fontSize: "13px", color: "#888" }}>
{item.partido?.local} vs {item.partido?.visitante}
</div>
<div style={{
fontSize: "18px", fontWeight: "bold",
color: getColor(item.puntos)
}}>
{getIcono(item.puntos)} {item.puntos} pts
</div>
</div>
<div style={{
display: "grid", gridTemplateColumns: "1fr auto 1fr",
gap: "8px", alignItems: "center"
}}>
<div style={{ textAlign: "center" }}>
<div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Tu pronóstico</div>
<div style={{ fontWeight: "bold", fontSize: "18px" }}>
{item.golesLocal} - {item.golesVisitante}
</div>
</div>
<div style={{ color: "#555", fontSize: "12px" }}>vs</div>
<div style={{ textAlign: "center" }}>
<div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Resultado real</div>
<div style={{ fontWeight: "bold", fontSize: "18px", color: getColor(item.puntos) }}>
{item.partido?.golesLocal ?? "?"} - {item.partido?.golesVisitante ?? "?"}
</div>
</div>
</div>
</div>
))}

{datos.length === 0 && (
<div style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "20px", textAlign: "center", color: "#888"
}}>
<p>No llenaste pronósticos en esta jornada.</p>
</div>
)}
</div>
</div>
);
}
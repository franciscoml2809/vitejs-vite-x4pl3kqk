import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
collection, getDocs, doc, updateDoc, query, where
} from "firebase/firestore";

interface Props {
jornada: any;
onBack: () => void;
}

export default function Resultados({ jornada, onBack }: Props) {
const [partidos, setPartidos] = useState<any[]>([]);
const [resultados, setResultados] = useState<{ [key: string]: { local: string; visitante: string } }>({});
const [loading, setLoading] = useState(true);
const [calculando, setCalculando] = useState(false);
const [mensaje, setMensaje] = useState("");

useEffect(() => {
const cargar = async () => {
const snap = await getDocs(
collection(db, "jornadas", jornada.id, "partidos")
);
const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
setPartidos(lista);

const iniciales: any = {};
lista.forEach((p: any) => {
iniciales[p.id] = {
local: p.golesLocal !== null ? String(p.golesLocal) : "",
visitante: p.golesVisitante !== null ? String(p.golesVisitante) : ""
};
});
setResultados(iniciales);
setLoading(false);
};
cargar();
}, []);

const getResultado = (golesL: number, golesV: number) => {
if (golesL > golesV) return "L";
if (golesV > golesL) return "V";
return "E";
};

const calcularPuntos = (
pronosticoL: number, pronosticoV: number,
realL: number, realV: number
) => {
if (pronosticoL === realL && pronosticoV === realV) return 3;
if (getResultado(pronosticoL, pronosticoV) === getResultado(realL, realV)) return 1;
return 0;
};

const guardarYCalcular = async () => {
setCalculando(true);
setMensaje("");
try {
// 1. Guardar resultados reales en cada partido
console.log("partidos:", partidos.map((p:any) => p.id));
console.log("resultados keys:", Object.keys(resultados));
for (const partido of partidos) {
const r = resultados[partido.id];
if (r.local === "" || r.visitante === "") continue;
const golesL = parseInt(r.local);
const golesV = parseInt(r.visitante);
await updateDoc(doc(db, "jornadas", jornada.id, "partidos", partido.id), {
golesLocal: golesL,
golesVisitante: golesV,
resultado: getResultado(golesL, golesV)
});
}

// 2. Obtener todos los pronósticos de esta jornada
const proSnap = await getDocs(
query(collection(db, "pronosticos"), where("jornadaId", "==", jornada.id))
);

// 3. Calcular y actualizar puntos por pronóstico
const puntajesPorUsuario: { [uid: string]: number } = {};

for (const proDoc of proSnap.docs) {
const pro = proDoc.data();
const r = resultados[pro.partidoId];
if (!r || r.local === "" || r.visitante === "") continue;

const puntos = calcularPuntos(
pro.golesLocal, pro.golesVisitante,
parseInt(r.local), parseInt(r.visitante)
);

await updateDoc(doc(db, "pronosticos", proDoc.id), { puntos });

if (!puntajesPorUsuario[pro.uid]) puntajesPorUsuario[pro.uid] = 0;
puntajesPorUsuario[pro.uid] += puntos;
}

// 4. Actualizar tabla de puntos global
for (const [uid, puntos] of Object.entries(puntajesPorUsuario)) {
    const tablaRef = doc(db, "tabla", uid);
    const { getDoc, setDoc } = await import("firebase/firestore");
    const tablaSnap = await getDoc(tablaRef);
    if (!tablaSnap.exists()) {
    await setDoc(tablaRef, {
    uid,
    totalPuntos: puntos,
    jornadas: { [jornada.id]: puntos }
    });
    } else {
    const data = tablaSnap.data();
    const puntosAnteriores = data.jornadas?.[jornada.id] || 0;
    await updateDoc(tablaRef, {
    totalPuntos: (data.totalPuntos || 0) - puntosAnteriores + puntos,
    ['jornadas.' + jornada.id]: puntos
    });
    }
    }

// 5. Cerrar la jornada
//await updateDoc(doc(db, "jornadas", jornada.id), { estado: "cerrada" });

setMensaje("✅ Resultados guardados y puntos calculados");
} catch (e) {
console.error(e);
setMensaje("❌ Error al calcular puntos");
}
setCalculando(false);
};

const cerrarJornada = async () => {
try {
const nuevoEstado = jornada.estado === "abierta" ? "cerrada" : "abierta";
await updateDoc(doc(db, "jornadas", jornada.id), { estado: nuevoEstado });
setMensaje(nuevoEstado === "cerrada" ? "✅ Jornada cerrada" : "✅ Jornada reabierta");
} catch (e) {
setMensaje("❌ Error al cambiar estado");
}
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
Resultados — Jornada {jornada.numero}
</div>
<div style={{ color: "#888", fontSize: "12px" }}>Captura el marcador real</div>
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
value={resultados[partido.id]?.local || ""}
onChange={(e) => setResultados(prev => ({
...prev,
[partido.id]: { ...prev[partido.id], local: e.target.value }
}))}
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
value={resultados[partido.id]?.visitante || ""}
onChange={(e) => setResultados(prev => ({
...prev,
[partido.id]: { ...prev[partido.id], visitante: e.target.value }
}))}
style={golesInput}
/>
</div>
</div>
</div>
))}

{mensaje && (
<p style={{
color: mensaje.includes("✅") ? "#4caf50" : "#e94560",
textAlign: "center", fontSize: "14px"
}}>
{mensaje}
</p>
)}

<button
onClick={guardarYCalcular}
disabled={calculando}
style={{
width: "100%", padding: "14px", backgroundColor: "#e94560",
color: "#fff", border: "none", borderRadius: "8px",
fontSize: "16px", fontWeight: "bold", cursor: "pointer",
marginTop: "8px"
}}
>
{calculando ? "Calculando..." : "⚡ Guardar y calcular puntos"}
</button>

<button
onClick={() => cerrarJornada()}
style={{
width: "100%", padding: "14px",
backgroundColor: jornada.estado === "abierta" ? "#333" : "#1b5e20",
color: "#fff", border: "none", borderRadius: "8px",
fontSize: "16px", fontWeight: "bold", cursor: "pointer",
marginTop: "8px"
}}
>
{jornada.estado === "abierta" ? "🔒 Cerrar jornada" : "🔓 Reabrir jornada"}
</button>

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
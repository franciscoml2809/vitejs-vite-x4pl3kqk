import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import Resultados from "./Resultados";

interface Props {
user: User;
onBack: () => void;
}

export default function Admin({ user, onBack }: Props) {
const [seccion, setSeccion] = useState<"jornadas" | "partidos">("jornadas");
const [jornadaResultados, setJornadaResultados] = useState<any>(null);
const [numeroJornada, setNumeroJornada] = useState("");
const [fechaInicio, setFechaInicio] = useState("");
const [fechaFin, setFechaFin] = useState("");
const [mensaje, setMensaje] = useState("");
const [loading, setLoading] = useState(false);


const crearJornada = async () => {
  if (!numeroJornada || numeroJornada.trim() === "") {
  setMensaje("❌ Falta el número de jornada");
  return;
  }
  if (!fechaInicio || fechaInicio.trim() === "") {
  setMensaje("❌ Falta la fecha de inicio");
  return;
  }
  if (!fechaFin || fechaFin.trim() === "") {
  setMensaje("❌ Falta la fecha fin");
  return;
  }
  setLoading(true);
  setMensaje("");
  try {
  await addDoc(collection(db, "jornadas"), {
  numero: parseInt(numeroJornada),
  fechaInicio: fechaInicio,
  fechaFin: fechaFin,
  estado: "abierta",
  creadoPor: user.uid,
  creadoEn: Timestamp.now()
  });
  setMensaje("✅ Jornada creada exitosamente");
  setNumeroJornada("");
  setFechaInicio("");
  setFechaFin("");
  } catch (e) {
  setMensaje("❌ Error al crear la jornada");
  }
  setLoading(false);
  };
  if(jornadaResultados) return (
    <Resultados
      jornada={jornadaResultados}
      onBack={() => setJornadaResultados(null)}
      />
  );


return (
<div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>

{/* Header */}
<div style={{
backgroundColor: "#16213e", padding: "16px 20px",
display: "flex", justifyContent: "space-between", alignItems: "center",
boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
}}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<span style={{ fontSize: "24px" }}>⚙️</span>
<div>
<div style={{ fontWeight: "bold", fontSize: "15px" }}>Panel Admin</div>
<div style={{ color: "#888", fontSize: "12px" }}>Quiniela Liga MX</div>
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

{/* Navegación */}
<div style={{ display: "flex", backgroundColor: "#16213e", borderBottom: "1px solid #333" }}>
{[
{ key: "jornadas", label: "🗓 Jornadas" },
{ key: "partidos", label: "⚽ Partidos" },
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
<div>
<h2 style={{ color: "#e94560", marginTop: 0 }}>Jornadas</h2>
<div style={{ marginBottom: "20px", backgroundColor: "#16213e", borderRadius: "12px", padding: "20px" }}>
<h3 style={{ color: "#aaa", marginTop: 0, fontSize: "14px" }}>CREAR NUEVA JORNADA</h3>
<label style={labelStyle}>Número de jornada</label>
<input
type="number"
placeholder="Ej: 1"
value={numeroJornada}
onChange={(e) => setNumeroJornada(e.target.value)}
style={inputStyle}
/>
<label style={labelStyle}>Fecha inicio</label>
<input
type="date"
value={fechaInicio}
onChange={(e) => setFechaInicio(e.target.value)}
style={inputStyle}
/>
<label style={labelStyle}>Fecha fin</label>
<input
type="date"
value={fechaFin}
onChange={(e) => setFechaFin(e.target.value)}
style={inputStyle}
/>
{mensaje && (
<p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", fontSize: "14px" }}>
{mensaje}
</p>
)}
<button onClick={crearJornada} disabled={loading} style={btnStyle}>
{loading ? "Creando..." : "Crear Jornada"}
</button>
</div>

<JornadasAdmin onVerResultados={(j) => setJornadaResultados(j)} />
</div>
)}

{seccion === "partidos" && (
  <PartidosAdmin user={user} />
)}
</div>
</div>
);
}

function PartidosAdmin({ user }: { user: User }) {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState("");
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
  const cargarJornadas = async () => {
  const { getDocs, collection } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "jornadas"));
  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  setJornadas(lista);
  };
  cargarJornadas();
  }, []);
  
  const agregarPartido = async () => {
  if (!jornadaSeleccionada || !local || !visitante || !fechaHora) {
  setMensaje("❌ Completa todos los campos");
  return;
  }
  setLoading(true);
  setMensaje("");
  try {
  const { addDoc, collection } = await import("firebase/firestore");
  await addDoc(collection(db, "jornadas", jornadaSeleccionada, "partidos"), {
  local,
  visitante,
  fechaHora,
  golesLocal: null,
  golesVisitante: null,
  resultado: null
  });
  setMensaje("✅ Partido agregado");
  setLocal("");
  setVisitante("");
  setFechaHora("");
  } catch (e) {
  setMensaje("❌ Error al agregar partido");
  }
  setLoading(false);
  };
  
  return (
  <div>
  <h2 style={{ color: "#e94560", marginTop: 0 }}>Agregar Partido</h2>
  <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "20px" }}>
  
  <label style={labelStyle}>Jornada</label>
  <select
  value={jornadaSeleccionada}
  onChange={(e) => setJornadaSeleccionada(e.target.value)}
  style={inputStyle}
  >
  <option value="">Selecciona jornada</option>
  {jornadas.map((j: any) => (
  <option key={j.id} value={j.id}>Jornada {j.numero}</option>
  ))}
  </select>
  
  <label style={labelStyle}>Equipo local</label>
  <input
  placeholder="Ej: América"
  value={local}
  onChange={(e) => setLocal(e.target.value)}
  style={inputStyle}
  />
  
  <label style={labelStyle}>Equipo visitante</label>
  <input
  placeholder="Ej: Chivas"
  value={visitante}
  onChange={(e) => setVisitante(e.target.value)}
  style={inputStyle}
  />
  
  <label style={labelStyle}>Fecha y hora del partido</label>
  <input
  type="datetime-local"
  value={fechaHora}
  onChange={(e) => setFechaHora(e.target.value)}
  style={inputStyle}
  />
  
  {mensaje && (
  <p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", fontSize: "14px" }}>
  {mensaje}
  </p>
  )}
  
  <button
  onClick={agregarPartido}
  disabled={loading}
  style={btnStyle}
  >
  {loading ? "Guardando..." : "Agregar Partido"}
  </button>
  </div>
  </div>
  );
}  
function JornadasAdmin({ onVerResultados }: { onVerResultados: (j: any) => void }) {
const [jornadas, setJornadas] = useState<any[]>([]);

useEffect(() => {
const cargar = async () => {
const { getDocs, collection, orderBy, query } = await import("firebase/firestore");
const q = query(collection(db, "jornadas"), orderBy("numero"));
const snap = await getDocs(q);
setJornadas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
};
cargar();
}, []);

return (
<div>
<h3 style={{ color: "#aaa", fontSize: "14px" }}>JORNADAS EXISTENTES</h3>
{jornadas.map((j) => (
<div key={j.id} style={{
backgroundColor: "#16213e", borderRadius: "12px",
padding: "16px", marginBottom: "12px", border: "1px solid #333"
}}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<div>
<div style={{ fontWeight: "bold" }}>Jornada {j.numero}</div>
<div style={{ color: "#888", fontSize: "12px" }}>{j.fechaInicio} — {j.fechaFin}</div>
</div>
<div style={{
backgroundColor: j.estado === "abierta" ? "#1b5e20" : "#333",
color: j.estado === "abierta" ? "#4caf50" : "#888",
padding: "4px 10px", borderRadius: "20px", fontSize: "12px"
}}>
{j.estado === "abierta" ? "Abierta" : "Cerrada"}
</div>
</div>
<div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
  <button
  onClick={() => onVerResultados(j)}
  style={{
  flex: 1, padding: "10px",
  backgroundColor: "#0f3460", color: "#fff", border: "none",
  borderRadius: "8px", fontSize: "14px", cursor: "pointer"
  }}
  >
  ⚡ Resultados
  </button>
  <button
  onClick={() => {
    const baseUrl = "https://vitejsvitex4pl3kqk-dmlm--5173--639e0ff1.local-credentialless.webcontainer.io";
    const url = baseUrl + "/jornada/" + j.id;
    const texto = "Llena tu quiniela! Jornada " + j.numero + " de Liga MX " + url;
    const waUrl = "https://wa.me/?text=" + encodeURIComponent(texto);
    window.open(waUrl, "_blank");
    }}
  style={{
  flex: 1, padding: "10px",
  backgroundColor: "#25D366", color: "#fff", border: "none",
  borderRadius: "8px", fontSize: "14px", cursor: "pointer"
  }}
  >
  📲 WhatsApp
  </button>
  </div>

</div>
))}
</div>
);
}

const labelStyle: React.CSSProperties = {
display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px"
};

const inputStyle: React.CSSProperties = {
width: "100%", padding: "12px 16px", marginBottom: "16px",
borderRadius: "8px", border: "1px solid #333",
backgroundColor: "#0f3460", color: "#fff",
fontSize: "15px", boxSizing: "border-box"
};

const btnStyle: React.CSSProperties = {
width: "100%", padding: "14px", backgroundColor: "#e94560",
color: "#fff", border: "none", borderRadius: "8px",
fontSize: "16px", fontWeight: "bold", cursor: "pointer"
};
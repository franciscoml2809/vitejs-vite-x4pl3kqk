import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, query, orderBy } from "firebase/firestore";

interface PartidosViewProps {
  jornada: any;
  torneos: any[];
  onBack: () => void;
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

export default function PartidosView({ jornada, torneos, onBack }: PartidosViewProps) {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [fechaHora, setFechaHora] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [equiposDeLaLiga, setEquiposDeLaLiga] = useState<any[]>([]);

  useEffect(() => {
    cargarPartidos();
    cargarEquiposDeLaLiga();
  }, []);

  const cargarPartidos = async () => {
    const snap = await getDocs(collection(db, "jornadas", jornada.id, "partidos"));
    setPartidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarEquiposDeLaLiga = async () => {
    if (jornada.torneoId) {
      try {
        const torneoActual = torneos.find(t => t.id === jornada.torneoId);
        if (torneoActual && torneoActual.ligaId) {
          const q = query(collection(db, "equipos_liga", torneoActual.ligaId, "equipos"), orderBy("nombre"));
          const snap = await getDocs(q);
          setEquiposDeLaLiga(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.error("Error cargando equipos basados en la jerarquía de la liga", e);
      }
    }
  };

  const agregarPartido = async () => {
    if (!local || !visitante || !fechaHora) {
      setMensaje("❌ Completa todos los campos");
      return;
    }
    if (local === visitante) {
      setMensaje("❌ El equipo local y visitante no pueden ser el mismo");
      return;
    }
    setLoading(true);
    setMensaje("");
    try {
      await addDoc(collection(db, "jornadas", jornada.id, "partidos"), {
        local,
        visitante,
        fechaHora,
        golesLocal: null,
        golesVisitante: null,
        resultado: null,
        suspendido: false
      });
      setMensaje("✅ Partido agregado");
      setLocal("");
      setVisitante("");
      setFechaHora("");
      cargarPartidos();
    } catch (e) {
      setMensaje("❌ Error al agregar partido");
    }
    setLoading(false);
  };

  const eliminarPartido = async (partidoId: string) => {
    try {
      await deleteDoc(doc(db, "jornadas", jornada.id, "partidos", partidoId));
      setMensaje("✅ Partido eliminado");
      cargarPartidos();
    } catch (e) {
      setMensaje("❌ Error al eliminar");
    }
  };

  const toggleSuspender = async (partido: any) => {
    try {
      const nuevoEstado = !partido.suspendido;
      await updateDoc(doc(db, "jornadas", jornada.id, "partidos", partido.id), {
        suspendido: nuevoEstado
      });
      setMensaje(nuevoEstado ? "⚠️ Partido suspendido" : "✅ Partido rehabilitado");
      cargarPartidos();
    } catch (e) {
      setMensaje("❌ Error al cambiar estado");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>
      <div style={{ backgroundColor: "#16213e", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>Jornada {jornada.numero} — Partidos</div>
          <div style={{ color: "#888", fontSize: "12px" }}>{jornada.fechaInicio} — {jornada.fechaFin}</div>
        </div>
        <button onClick={onBack} style={{ backgroundColor: "transparent", border: "1px solid #888", color: "#888", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>← Volver</button>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ color: "#aaa", marginTop: 0, fontSize: "14px" }}>AGREGAR PARTIDO</h3>
          <label style={labelStyle}>Equipo local</label>
          {equiposDeLaLiga.length > 0 ? (
            <select value={local} onChange={(e) => setLocal(e.target.value)} style={inputStyle}>
              <option value="">-- Selecciona Local --</option>
              {equiposDeLaLiga.map(eq => <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>)}
            </select>
          ) : (
            <input placeholder="Ej: América" value={local} onChange={(e) => setLocal(e.target.value)} style={inputStyle} />
          )}
          <label style={labelStyle}>Equipo visitante</label>
          {equiposDeLaLiga.length > 0 ? (
            <select value={visitante} onChange={(e) => setVisitante(e.target.value)} style={inputStyle}>
              <option value="">-- Selecciona Visitante --</option>
              {equiposDeLaLiga.map(eq => <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>)}
            </select>
          ) : (
            <input placeholder="Ej: Chivas" value={visitante} onChange={(e) => setVisitante(e.target.value)} style={inputStyle} />
          )}
          <label style={labelStyle}>Fecha y hora</label>
          <input type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} style={inputStyle} />
          {mensaje && <p style={{ color: mensaje.includes("✅") ? "#4caf50" : mensaje.includes("⚠️") ? "#ff9800" : "#e94560", fontSize: "14px" }}>{mensaje}</p>}
          <button onClick={agregarPartido} disabled={loading} style={btnStyle}>{loading ? "Guardando..." : "➕ Agregar Partido"}</button>
        </div>
        {partidos.length > 0 && (
          <div>
            <h3 style={{ color: "#aaa", fontSize: "14px" }}>PARTIDOS AGREGADOS ({partidos.length})</h3>
            {partidos.map((partido: any) => (
              <div key={partido.id} style={{ backgroundColor: partido.suspendido ? "#2a1a1a" : "#16213e", borderRadius: "12px", padding: "14px", marginBottom: "10px", border: partido.suspendido ? "1px solid #e94560" : "1px solid #333" }}>
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: partido.suspendido ? "#888" : "#fff" }}>{partido.local} vs {partido.visitante}</div>
                  <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>{partido.fechaHora} {partido.suspendido && <span style={{ color: "#e94560", marginLeft: "8px" }}>⚠️ Suspendido</span>}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => toggleSuspender(partido)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", backgroundColor: partido.suspendido ? "#1b5e20" : "#ff9800", color: "#fff", cursor: "pointer", fontSize: "12px" }}>{partido.suspendido ? "✅ Rehabilitar" : "⚠️ Suspender"}</button>
                  <button onClick={() => eliminarPartido(partido.id)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", backgroundColor: "#c62828", color: "#fff", cursor: "pointer", fontSize: "12px" }}>🗑 Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {partidos.length === 0 && <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "20px", textAlign: "center", color: "#888" }}><p>No hay partidos en esta jornada aún.</p></div>}
      </div>
    </div>
  );
}

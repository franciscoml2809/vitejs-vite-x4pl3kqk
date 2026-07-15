import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";

interface LigasAdminViewProps {
  user: any;
  ligas: any[];
  cargarLigas: () => void;
  setMensajeGeneral: (msg: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", marginBottom: "16px",
  borderRadius: "8px", border: "1px solid #333",
  backgroundColor: "#0f3460", color: "#fff",
  fontSize: "15px", boxSizing: "border-box"
};

export default function LigasAdminView({ user, ligas, cargarLigas, setMensajeGeneral }: LigasAdminViewProps) {
  const [nombreLiga, setNombreLiga] = useState("");
  const [ligaSeleccionada, setLigaSeleccionada] = useState<any>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [loading, setLoading] = useState(false);

  const crearLiga = async () => {
    if (!nombreLiga.trim()) {
      setMensajeGeneral("❌ Escribe el nombre de la liga");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "ligas"), {
        nombre: nombreLiga.trim(),
        creadoPor: user.uid,
        creadoEn: Timestamp.now()
      });
      setMensajeGeneral("✅ Liga creada con éxito");
      setNombreLiga("");
      cargarLigas();
    } catch (e) {
      setMensajeGeneral("❌ Error al crear la liga");
    }
    setLoading(false);
  };

  const cargarEquipos = async (ligaId: string) => {
    try {
      const q = query(collection(db, "equipos_liga", ligaId, "equipos"), orderBy("nombre"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEquipos(lista);
    } catch (e) {
      console.error("Error al cargar equipos", e);
    }
  };

  const agregarEquipo = async () => {
    if (!ligaSeleccionada || !nombreEquipo.trim()) {
      setMensajeGeneral("❌ Escribe el nombre del equipo");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "equipos_liga", ligaSeleccionada.id, "equipos"), {
        nombre: nombreEquipo.trim()
      });
      setNombreEquipo("");
      cargarEquipos(ligaSeleccionada.id);
    } catch (e) {
      setMensajeGeneral("❌ Error al agregar equipo");
    }
    setLoading(false);
  };

  const eliminarEquipo = async (equipoId: string) => {
    if (!ligaSeleccionada) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "equipos_liga", ligaSeleccionada.id, "equipos", equipoId));
      cargarEquipos(ligaSeleccionada.id);
    } catch (e) {
      setMensajeGeneral("❌ Error al eliminar equipo");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: "#e94560", marginTop: 0 }}>🛡 Gestión de Ligas Base</h2>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        
        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", border: "1px solid #333", marginBottom: "15px" }}>
            <h3 style={{ marginTop: 0, fontSize: "14px", color: "#aaa" }}>CREAR LIGA BASE</h3>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Ej: Liga MX, Champions League"
                value={nombreLiga}
                onChange={(e) => setNombreLiga(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
              <button
                onClick={crearLiga}
                disabled={loading}
                style={{ padding: "0 20px", backgroundColor: "#e94560", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
            <h3 style={{ marginTop: 0, fontSize: "14px", color: "#aaa" }}>SELECCIONA UNA LIGA</h3>
            {ligas.map((l) => (
              <div
                key={l.id}
                onClick={() => {
                  setLigaSeleccionada(l);
                  cargarEquipos(l.id);
                }}
                style={{
                  padding: "12px", borderRadius: "8px", marginBottom: "8px", cursor: "pointer",
                  backgroundColor: ligaSeleccionada?.id === l.id ? "#0f3460" : "#1a1a2e",
                  border: ligaSeleccionada?.id === l.id ? "1px solid #e94560" : "1px solid #333"
                }}
              >
                {l.nombre}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "280px" }}>
          {ligaSeleccionada ? (
            <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
              <h3 style={{ marginTop: 0, fontSize: "14px", color: "#e94560" }}>
                EQUIPOS: {ligaSeleccionada.nombre.toUpperCase()}
              </h3>
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px", marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="Nombre del Equipo"
                  value={nombreEquipo}
                  onChange={(e) => setNombreEquipo(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <button
                  onClick={agregarEquipo}
                  disabled={loading}
                  style={{ padding: "0 20px", backgroundColor: "#4caf50", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                >
                  +
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {equipos.length === 0 ? (
                  <div style={{ color: "#888", fontSize: "13px", padding: "10px" }}>No hay equipos registrados en esta liga.</div>
                ) : (
                  equipos.map((eq) => (
                    <div key={eq.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      backgroundColor: "#1a1a2e", padding: "8px 12px", borderRadius: "6px", border: "1px solid #333"
                    }}>
                      <span>{eq.nombre}</span>
                      <button
                        onClick={() => eliminarEquipo(eq.id)}
                        style={{ backgroundColor: "transparent", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "14px" }}
                      >
                        ❌
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: "#16213e", padding: "40px 20px", borderRadius: "12px",
              border: "1px solid #333", textAlign: "center", color: "#888"
            }}>
              Selecciona una liga base de la lista izquierda para administrar sus equipos fijos.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

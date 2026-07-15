import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface TorneosAdminViewProps {
  user: any;
  ligas: any[];
  torneos: any[];
  cargarTorneos: () => void;
  setMensajeGeneral: (msg: string) => void;
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

export default function TorneosAdminView({ user, ligas, torneos, cargarTorneos, setMensajeGeneral }: TorneosAdminViewProps) {
  const [nombreTorneo, setNombreTorneo] = useState("");
  const [idLigaParaTorneo, setIdLigaParaTorneo] = useState("");
  const [tipoTorneo, setTipoTorneo] = useState<"regular" | "eliminatoria">("regular");
  const [loading, setLoading] = useState(false);

  const crearTorneo = async () => {
    if (!nombreTorneo.trim() || !idLigaParaTorneo) {
      setMensajeGeneral("❌ Escribe el nombre del torneo y selecciona una liga");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "torneos"), {
        nombre: nombreTorneo.trim(),
        ligaId: idLigaParaTorneo,
        tipo: tipoTorneo,
        creadoPor: user.uid,
        creadoEn: Timestamp.now()
      });
      setMensajeGeneral("✅ Torneo creado con éxito");
      setNombreTorneo("");
      setIdLigaParaTorneo("");
      setTipoTorneo("regular");
      cargarTorneos();
    } catch (e) {
      setMensajeGeneral("❌ Error al crear el torneo");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: "#e94560", marginTop: 0 }}>🏆 Edición de Torneos</h2>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        
        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
            <h3 style={{ marginTop: 0, fontSize: "14px", color: "#aaa" }}>CONFIGURAR TORNEO</h3>
            
            <label style={labelStyle}>Nombre del Torneo</label>
            <input
              type="text"
              placeholder="Ej: Apertura 2026, Liguilla 2026"
              value={nombreTorneo}
              onChange={(e) => setNombreTorneo(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Liga Base Vinculada</label>
            <select
              value={idLigaParaTorneo}
              onChange={(e) => setIdLigaParaTorneo(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Selecciona Liga Base --</option>
              {ligas.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>

            <label style={labelStyle}>Tipo / Formato de Torneo</label>
            <select
              value={tipoTorneo}
              onChange={(e) => setTipoTorneo(e.target.value as any)}
              style={inputStyle}
            >
              <option value="regular">Fase Regular (Puntos estándar)</option>
              <option value="eliminatoria">Fase Eliminatoria (Liguilla / Playoff)</option>
            </select>

            <button
              onClick={crearTorneo}
              disabled={loading}
              style={btnStyle}
            >
              {loading ? "Creando..." : "Crear Edición de Torneo"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ backgroundColor: "#16213e", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
            <h3 style={{ marginTop: 0, fontSize: "14px", color: "#aaa" }}>TORNEOS EXISTENTES</h3>
            {torneos.length === 0 ? (
              <div style={{ color: "#888", fontSize: "13px", padding: "10px" }}>No hay torneos creados todavía.</div>
            ) : (
              torneos.map((t) => {
                const l = ligas.find(liga => liga.id === t.ligaId);
                return (
                  <div key={t.id} style={{
                    backgroundColor: "#1a1a2e", padding: "12px", borderRadius: "8px",
                    marginBottom: "8px", border: "1px solid #333"
                  }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{t.nombre}</div>
                    <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>
                      Liga: {l ? l.nombre : "Desconocida"}
                    </div>
                    <div style={{
                      display: "inline-block", marginTop: "6px", fontSize: "11px",
                      padding: "2px 8px", borderRadius: "10px",
                      backgroundColor: t.tipo === "regular" ? "#0f3460" : "#e94560",
                      color: "#fff"
                    }}>
                      {t.tipo === "regular" ? "Fase Regular" : "Eliminatoria"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

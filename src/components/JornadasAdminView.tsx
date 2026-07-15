import { useState } from "react";

interface JornadasAdminViewProps {
  jornadas: any[];
  torneos: any[];
  ligas: any[];
  cambiarEstadoJornada: (id: string, estado: "abierta" | "en_progreso" | "finalizada", torneoId: string) => void;
  setJornadaPartidos: (j: any) => void;
  setJornadaResultados: (j: any) => void;
  setJornadaParticipantes: (j: any) => void;
  crearJornadaProps: (numero: number, inicio: string, fin: string, torneoId: string) => Promise<boolean>;
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

export default function JornadasAdminView({
  jornadas, torneos, ligas, cambiarEstadoJornada,
  setJornadaPartidos, setJornadaResultados, setJornadaParticipantes, crearJornadaProps
}: JornadasAdminViewProps) {
  const [numeroJornada, setNumeroJornada] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [idTorneoParaJornada, setIdTorneoParaJornada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [filtroJornadaAdmin, setFiltroJornadaAdmin] = useState<"activas" | "torneo">("activas");
  const [idTorneoFiltroAdmin, setIdTorneoFiltroAdmin] = useState("");

  const handleCrear = async () => {
    if (!numeroJornada || !fechaInicio || !fechaFin || !idTorneoParaJornada) {
      setMensaje("❌ Completa todos los campos, incluyendo el torneo");
      return;
    }
    setLoading(true);
    setMensaje("");
    const exito = await crearJornadaProps(
      parseInt(numeroJornada),
      fechaInicio,
      fechaFin,
      idTorneoParaJornada
    );
    if (exito) {
      setMensaje("✅ Jornada creada exitosamente");
      setNumeroJornada("");
      setFechaInicio("");
      setFechaFin("");
      setIdTorneoParaJornada("");
    } else {
      setMensaje("❌ Error al crear la jornada o ya existe");
    }
    setLoading(false);
  };
  return (
    <div>
      <h2 style={{ color: "#e94560", marginTop: 0, marginBottom: "12px" }}>Jornadas</h2>

      {/* FILTROS INTEGRADOS SIMPLIFICADOS */}
      <div style={{ display: "flex", backgroundColor: "#12192c", borderRadius: "8px", marginBottom: "16px", padding: "3px", maxWidth: "280px" }}>
        {[
          { key: "activas", label: "⚡ Activas" },
          { key: "torneo", label: "🏆 Por Torneo" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFiltroJornadaAdmin(tab.key as any)}
            style={{
              flex: 1, padding: "6px 10px", border: "none", borderRadius: "6px",
              backgroundColor: filtroJornadaAdmin === tab.key ? "#e94560" : "transparent",
              color: filtroJornadaAdmin === tab.key ? "#fff" : "#888",
              cursor: "pointer", fontWeight: "bold", fontSize: "12px"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtroJornadaAdmin === "torneo" && (
        <div style={{ marginBottom: "16px", maxWidth: "420px" }}>
          <select
            value={idTorneoFiltroAdmin}
            onChange={(e) => setIdTorneoFiltroAdmin(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, padding: "8px 12px", fontSize: "14px" }}
          >
            <option value="">-- Elige un Torneo para auditar --</option>
            {torneos.map((t: any) => {
              const l = ligas.find(liga => liga.id === t.ligaId);
              return (
                <option key={t.id} value={t.id}>
                  {l ? l.nombre + " — " : ""}{t.nombre}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {(() => {
        const jornadasFiltradas = jornadas.filter((j: any) => {
          if (filtroJornadaAdmin === "activas") return j.estado === "abierta" || j.estado === "en_progreso";
          if (filtroJornadaAdmin === "torneo") return j.torneoId === idTorneoFiltroAdmin;
          return true;
        });

        if (filtroJornadaAdmin === "torneo" && !idTorneoFiltroAdmin) {
          return (
            <div style={{ color: "#666", fontSize: "13px", padding: "10px 0", fontStyle: "italic", marginBottom: "24px" }}>
              Selecciona un torneo arriba para desplegar sus jornadas cronológicas.
            </div>
          );
        }

        if (jornadasFiltradas.length === 0) {
          return (
            <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "20px", marginBottom: "24px", textAlign: "center", color: "#666", fontSize: "13px" }}>
              No se encontraron jornadas en esta sección.
            </div>
          );
        }

        return (
          <div style={{ marginBottom: "24px" }}>
            {jornadasFiltradas.map((j: any) => {
              const torneoAsociado = torneos.find(t => t.id === j.torneoId);
              const ligaAsociada = torneoAsociado ? ligas.find(l => l.id === torneoAsociado.ligaId) : null;
              
              return (
                <div key={j.id} style={{
                  backgroundColor: "#16213e", borderRadius: "12px",
                  padding: "12px 16px", marginBottom: "10px", border: "1px solid #333"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "12px" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "15px", color: "#fff" }}>
                        Jornada {j.numero}
                      </div>
                      {torneoAsociado && (
                        <div style={{ color: "#e94560", fontSize: "12px", fontWeight: "bold", marginTop: "2px" }}>
                          🏆 {ligaAsociada ? ligaAsociada.nombre + " — " : ""}{torneoAsociado.nombre}
                        </div>
                      )}
                      <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>
                        {j.fechaInicio} — {j.fechaFin}
                      </div>
                    </div>

                    <div style={{ display: "flex", backgroundColor: "#12192c", padding: "3px", borderRadius: "6px", gap: "2px" }}>
                      <button
                        onClick={() => cambiarEstadoJornada(j.id, "abierta", j.torneoId)}
                        style={{
                          padding: "4px 8px", fontSize: "11px", borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: "bold",
                          backgroundColor: j.estado === "abierta" ? "#1b5e20" : "transparent",
                          color: j.estado === "abierta" ? "#4caf50" : "#555"
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => cambiarEstadoJornada(j.id, "en_progreso", j.torneoId)}
                        style={{
                          padding: "4px 8px", fontSize: "11px", borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: "bold",
                          backgroundColor: j.estado === "en_progreso" ? "#e65100" : "transparent",
                          color: j.estado === "en_progreso" ? "#ffb74d" : "#555"
                        }}
                      >
                        Progreso
                      </button>
                      <button
                        onClick={() => cambiarEstadoJornada(j.id, "finalizada", j.torneoId)}
                        style={{
                          padding: "4px 8px", fontSize: "11px", borderRadius: "4px", border: "none", cursor: "pointer", fontWeight: "bold",
                          backgroundColor: j.estado === "finalizada" ? "#0d47a1" : "transparent",
                          color: j.estado === "finalizada" ? "#4fc3f7" : "#555"
                        }}
                      >
                        Fin
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {j.estado === "abierta" && (
                      <button
                        onClick={() => setJornadaPartidos(j)}
                        style={{
                          flex: 1, padding: "6px", backgroundColor: "#0f3460",
                          color: "#fff", border: "none", borderRadius: "6px",
                          fontSize: "12px", cursor: "pointer"
                        }}
                      >
                        ⚽ Partidos
                      </button>
                    )}
                    <button
                      onClick={() => setJornadaResultados(j)}
                      style={{
                        flex: 1, padding: "6px", backgroundColor: "#0f3460",
                        color: "#fff", border: "none", borderRadius: "8px",
                        fontSize: "12px", cursor: "pointer"
                      }}
                    >
                      ⚡ Resultados
                    </button>
                    
                    <button
                      onClick={() => setJornadaParticipantes(j)}
                      style={{
                        flex: 1, padding: "6px", backgroundColor: "#0f3460",
                        color: "#fff", border: "none", borderRadius: "6px",
                        fontSize: "12px", cursor: "pointer"
                      }}
                    >
                      👥 Amigos
                    </button>

                    <button
                      onClick={() => {
                        const baseUrl = "https://netlify.app";
                        const url = baseUrl + "/jornada/" + j.id;
                        const texto = "Llena tu quiniela! Jornada " + j.numero + " " + url;
                        const waUrl = "https://wa.me" + encodeURIComponent(texto);
                        window.open(waUrl, "_blank");
                      }}
                      style={{
                        flex: 1, padding: "6px", backgroundColor: "#25D366",
                        color: "#fff", border: "none", borderRadius: "6px",
                        fontSize: "12px", cursor: "pointer"
                      }}
                    >
                      📲 WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      {/* CREAR NUEVA JORNADA */}
      <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ color: "#aaa", marginTop: 0, fontSize: "14px" }}>CREAR NUEVA JORNADA</h3>
        
        <label style={labelStyle}>Número de jornada</label>
        <input
          type="number"
          placeholder="Ej: 1"
          value={numeroJornada}
          onChange={(e) => setNumeroJornada(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Torneo / Edición de Referencia</label>
        <select
          value={idTorneoParaJornada}
          onChange={(e) => setIdTorneoParaJornada(e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Selecciona el Torneo --</option>
          {torneos.map((t) => {
            const l = ligas.find(liga => liga.id === t.ligaId);
            return (
              <option key={t.id} value={t.id}>
                {l ? l.nombre + " — " : ""}{t.nombre} ({t.tipo === "regular" ? "Regular" : "Eliminatoria"})
              </option>
            );
          })}
        </select>

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

        <button onClick={handleCrear} disabled={loading} style={btnStyle}>
          {loading ? "Creando..." : "Crear Jornada"}
        </button>
      </div>
    </div>
  );
}

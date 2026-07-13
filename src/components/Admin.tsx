import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, orderBy, query, Timestamp
} from "firebase/firestore";
import type { User } from "firebase/auth";
import Resultados from "./Resultados";

interface Props {
  user: User;
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

export default function Admin({ user, onBack }: Props) {
  const [seccion, setSeccion] = useState<"jornadas" | "ligas" | "torneos">("jornadas");
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [jornadaResultados, setJornadaResultados] = useState<any>(null);
  const [jornadaPartidos, setJornadaPartidos] = useState<any>(null);
  const [numeroJornada, setNumeroJornada] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  // --- NUEVA ARQUITECTURA DE ESTADOS DE CONFIGURACIÓN ---
  const [ligas, setLigas] = useState<any[]>([]);
  const [nombreLiga, setNombreLiga] = useState("");
  const [ligaSeleccionada, setLigaSeleccionada] = useState<any>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombreEquipo, setNombreEquipo] = useState("");

  const [torneos, setTorneos] = useState<any[]>([]);
  const [nombreTorneo, setNombreTorneo] = useState("");
  const [idLigaParaTorneo, setIdLigaParaTorneo] = useState("");
  const [tipoTorneo, setTipoTorneo] = useState<"regular" | "eliminatoria">("regular");
  
  const [idTorneoParaJornada, setIdTorneoParaJornada] = useState("");

  useEffect(() => {
    cargarJornadas();
    cargarLigas();
    cargarTorneos();
  }, []);

  const cargarJornadas = async () => {
    const q = query(collection(db, "jornadas"), orderBy("numero"));
    const snap = await getDocs(q);
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setJornadas(lista);
  };

  const cargarLigas = async () => {
    try {
      const q = query(collection(db, "ligas"), orderBy("nombre"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLigas(lista);
    } catch (e) {
      console.error("Error al cargar ligas", e);
    }
  };

  const cargarTorneos = async () => {
    try {
      const q = query(collection(db, "torneos"), orderBy("nombre"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTorneos(lista);
    } catch (e) {
      console.error("Error al cargar torneos", e);
    }
  };
  const crearLiga = async () => {
    if (!nombreLiga.trim()) {
      setMensaje("❌ Escribe el nombre de la liga");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "ligas"), {
        nombre: nombreLiga.trim(),
        creadoPor: user.uid,
        creadoEn: Timestamp.now()
      });
      setMensaje("✅ Liga creada con éxito");
      setNombreLiga("");
      cargarLigas();
    } catch (e) {
      setMensaje("❌ Error al crear la liga");
    }
    setLoading(false);
  };

  const crearTorneo = async () => {
    if (!nombreTorneo.trim() || !idLigaParaTorneo) {
      setMensaje("❌ Escribe el nombre del torneo y selecciona una liga");
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
      setMensaje("✅ Torneo creado con éxito");
      setNombreTorneo("");
      setIdLigaParaTorneo("");
      setTipoTorneo("regular");
      cargarTorneos();
    } catch (e) {
      setMensaje("❌ Error al crear el torneo");
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
      setMensaje("❌ Escribe el nombre del equipo");
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
      setMensaje("❌ Error al agregar equipo");
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
      setMensaje("❌ Error al eliminar equipo");
    }
    setLoading(false);
  };

  const crearJornada = async () => {
    if (!numeroJornada || !fechaInicio || !fechaFin || !idTorneoParaJornada) {
      setMensaje("❌ Completa todos los campos, incluyendo el torneo");
      return;
    }
    const existe = jornadas.find((j: any) => j.numero === parseInt(numeroJornada) && j.torneoId === idTorneoParaJornada);
    if (existe) {
      setMensaje("❌ Ya existe una jornada con ese número en este torneo");
      return;
    }
    setLoading(true);
    setMensaje("");
    try {
      await addDoc(collection(db, "jornadas"), {
        numero: parseInt(numeroJornada),
        fechaInicio,
        fechaFin,
        torneoId: idTorneoParaJornada,
        estado: "abierta",
        creadoPor: user.uid,
        creadoEn: Timestamp.now()
      });
      setMensaje("✅ Jornada creada exitosamente");
      setNumeroJornada("");
      setFechaInicio("");
      setFechaFin("");
      setIdTorneoParaJornada("");
      cargarJornadas();
    } catch (e) {
      setMensaje("❌ Error al crear la jornada");
    }
    setLoading(false);
  };

  if (jornadaResultados) return (
    <Resultados
      jornada={jornadaResultados}
      onBack={() => {
        setJornadaResultados(null);
        cargarJornadas();
      }}
    />
  );

  if (jornadaPartidos) return (
    <PartidosView
      jornada={jornadaPartidos}
      torneos={torneos}
      onBack={() => {
        setJornadaPartidos(null);
        cargarJornadas();
      }}
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
            <div style={{ color: "#888", fontSize: "12px" }}>Quiniela Administrador</div>
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

      {/* Navegación - Actualizada con Ligas y Torneos */}
      <div style={{ display: "flex", backgroundColor: "#16213e", borderBottom: "1px solid #333" }}>
        {[
          { key: "jornadas", label: "🗓 Jornadas" },
          { key: "ligas", label: "🛡 Ligas Base" },
          { key: "torneos", label: "🏆 Torneos" },
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

      <div style={{ padding: "20px" }}>
        {seccion === "jornadas" && (
          <div>
            <h2 style={{ color: "#e94560", marginTop: 0 }}>Jornadas</h2>

            {/* Lista de jornadas */}
            {jornadas.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                {jornadas.map((j: any) => {
                  const torneoAsociado = torneos.find(t => t.id === j.torneoId);
                  const ligaAsociada = torneoAsociado ? ligas.find(l => l.id === torneoAsociado.ligaId) : null;
                  
                  return (
                    <div key={j.id} style={{
                      backgroundColor: "#16213e", borderRadius: "12px",
                      padding: "16px", marginBottom: "12px", border: "1px solid #333"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                            Jornada {j.numero}
                          </div>
                          {torneoAsociado && (
                            <div style={{ color: "#e94560", fontSize: "13px", fontWeight: "bold", marginTop: "2px" }}>
                              🏆 {ligaAsociada ? ligaAsociada.nombre + " — " : ""}{torneoAsociado.nombre} ({torneoAsociado.tipo === "regular" ? "Regular" : "Eliminatoria"})
                            </div>
                          )}
                          <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                            {j.fechaInicio} — {j.fechaFin}
                          </div>
                        </div>
                        <div style={{
                          backgroundColor: j.estado === "abierta" ? "#1b5e20" : "#333",
                          color: j.estado === "abierta" ? "#4caf50" : "#888",
                          padding: "4px 10px", borderRadius: "20px", fontSize: "12px"
                        }}>
                          {j.estado === "abierta" ? "Abierta" : "Cerrada"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {j.estado === "abierta" && (
                          <button
                            onClick={() => setJornadaPartidos(j)}
                            style={{
                              flex: 1, padding: "8px", backgroundColor: "#0f3460",
                              color: "#fff", border: "none", borderRadius: "8px",
                              fontSize: "13px", cursor: "pointer"
                            }}
                          >
                            ⚽ Partidos
                          </button>
                        )}
                        <button
                          onClick={() => setJornadaResultados(j)}
                          style={{
                            flex: 1, padding: "8px", backgroundColor: "#0f3460",
                            color: "#fff", border: "none", borderRadius: "8px",
                            fontSize: "13px", cursor: "pointer"
                          }}
                        >
                          ⚡ Resultados
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
                            flex: 1, padding: "8px", backgroundColor: "#25D366",
                            color: "#fff", border: "none", borderRadius: "8px",
                            fontSize: "13px", cursor: "pointer"
                          }}
                        >
                          📲 WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Crear nueva jornada */}
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

              {mensaje && !seccion.includes("torneos") && !seccion.includes("ligas") && (
                <p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", fontSize: "14px" }}>
                  {mensaje}
                </p>
              )}

              <button onClick={crearJornada} disabled={loading} style={btnStyle}>
                {loading ? "Creando..." : "Crear Jornada"}
              </button>
            </div>
          </div>
        )}
        {/* Sección de Gestión de Ligas Base */}
        {seccion === "ligas" && (
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
        )}

        {/* Sección de Gestión de Torneos / Ediciones */}
        {seccion === "torneos" && (
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
                    style={btnStyle}
                  >
                    Crear Edición de Torneo
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
        )}

        {mensaje && (seccion === "torneos" || seccion === "ligas") && (
          <p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", fontSize: "14px", marginTop: "15px" }}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}
// Componente secundario modificado para rastrear la relación Torneo -> Liga -> Equipos
function PartidosView({ jornada, torneos, onBack }: { jornada: any; torneos: any[]; onBack: () => void }) {
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
        // Encontramos el torneo actual para saber cuál es su ligaId
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
      {/* Header */}
      <div style={{
        backgroundColor: "#16213e", padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>
            Jornada {jornada.numero} — Partidos
          </div>
          <div style={{ color: "#888", fontSize: "12px" }}>
            {jornada.fechaInicio} — {jornada.fechaFin}
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
        {/* Formulario agregar partido */}
        <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ color: "#aaa", marginTop: 0, fontSize: "14px" }}>AGREGAR PARTIDO</h3>
          
          <label style={labelStyle}>Equipo local</label>
          {equiposDeLaLiga.length > 0 ? (
            <select value={local} onChange={(e) => setLocal(e.target.value)} style={inputStyle}>
              <option value="">-- Selecciona Local --</option>
              {equiposDeLaLiga.map(eq => (
                <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Ej: América"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              style={inputStyle}
            />
          )}

          <label style={labelStyle}>Equipo visitante</label>
          {equiposDeLaLiga.length > 0 ? (
            <select value={visitante} onChange={(e) => setVisitante(e.target.value)} style={inputStyle}>
              <option value="">-- Selecciona Visitante --</option>
              {equiposDeLaLiga.map(eq => (
                <option key={eq.id} value={eq.nombre}>{eq.nombre}</option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Ej: Chivas"
              value={visitante}
              onChange={(e) => setVisitante(e.target.value)}
              style={inputStyle}
            />
          )}

          <label style={labelStyle}>Fecha y hora</label>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            style={inputStyle}
          />
          {mensaje && (
            <p style={{ color: mensaje.includes("✅") ? "#4caf50" : mensaje.includes("⚠️") ? "#ff9800" : "#e94560", fontSize: "14px" }}>
              {mensaje}
            </p>
          )}
          <button onClick={agregarPartido} disabled={loading} style={btnStyle}>
            {loading ? "Guardando..." : "➕ Agregar Partido"}
          </button>
        </div>

        {/* Lista de partidos */}
        {partidos.length > 0 && (
          <div>
            <h3 style={{ color: "#aaa", fontSize: "14px" }}>
              PARTIDOS AGREGADOS ({partidos.length})
            </h3>
            {partidos.map((partido: any) => (
              <div key={partido.id} style={{
                backgroundColor: partido.suspendido ? "#2a1a1a" : "#16213e",
                borderRadius: "12px", padding: "14px", marginBottom: "10px",
                border: partido.suspendido ? "1px solid #e94560" : "1px solid #333"
              }}>
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", color: partido.suspendido ? "#888" : "#fff" }}>
                    {partido.local} vs {partido.visitante}
                  </div>
                  <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                    {partido.fechaHora}
                    {partido.suspendido && (
                      <span style={{ color: "#e94560", marginLeft: "8px" }}>⚠️ Suspendido</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => toggleSuspender(partido)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "6px", border: "none",
                      backgroundColor: partido.suspendido ? "#1b5e20" : "#ff9800",
                      color: "#fff", cursor: "pointer", fontSize: "12px"
                    }}
                  >
                    {partido.suspendido ? "✅ Rehabilitar" : "⚠️ Suspender"}
                  </button>
                  <button
                    onClick={() => eliminarPartido(partido.id)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "6px", border: "none",
                      backgroundColor: "#c62828", color: "#fff",
                      cursor: "pointer", fontSize: "12px"
                    }}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {partidos.length === 0 && (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No hay partidos en esta jornada aún.</p>
          </div>
        )}
      </div>
    </div>
  );
}

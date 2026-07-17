import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import type { User } from "firebase/auth";

interface Props {
  user: User;
  jornada: any;
  onBack: () => void;
}

export default function Pronosticos({ user, jornada, onBack }: Props) {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [pronosticos, setPronosticos] = useState<{ [key: string]: { local: string; visitante: string; bloqueado: boolean } }>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [usuarioDeshabilitado, setUsuarioDeshabilitado] = useState(false);

  // Estados defensivos anti error de dedo optimizados por partido individual
  const [alertaInusual, setAlertaInusual] = useState("");
  const [bloqueoPreventivo, setBloqueoPreventivo] = useState(false);
  const [partidosConError, setPartidosConError] = useState<string[]>([]);
  useEffect(() => {
    const cargar = async () => {
      // 1. Verificar si el participante está deshabilitado por moderación
      const participanteRef = doc(db, "pronosticos", jornada.id, "participantes", user.uid);
      const participanteSnap = await getDoc(participanteRef);
      let baneado = false;
      
      if (participanteSnap.exists()) {
        const pData = participanteSnap.data();
        if (pData.deshabilitado === true) {
          baneado = true;
          setUsuarioDeshabilitado(true);
          setMensaje("🚫 Has sido deshabilitado de esta jornada por el administrador.");
        }
      }

      // Banner complementario informativo sobre el estado vivo de la fecha
      if (!baneado) {
        if (jornada.estado === "en_progreso") {
          setMensaje("⏳ Jornada en progreso. Partidos disputándose (Solo lectura).");
        } else if (jornada.estado === "finalizada") {
          setMensaje("🏁 Jornada concluida. Los puntos finales han sido procesados.");
        }
      }

      // 2. Cargar partidos activos de la jornada
      const partidosSnap = await getDocs(
        collection(db, "jornadas", jornada.id, "partidos")
      );
      
      const lista = partidosSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => !p.suspendido)
        .sort((a: any, b: any) => {
          if (a.fechaHora < b.fechaHora) return -1;
          if (a.fechaHora > b.fechaHora) return 1;
          return 0;
        });
        
      setPartidos(lista);

      // 3. Cargar pronósticos existentes aplicando candados cruzados tiempo/estado
      const iniciales: any = {};
      for (const partido of lista) {
        const ahora = new Date();
        const fechaPartido = new Date((partido as any).fechaHora);
        const unaHoraAntes = new Date(fechaPartido.getTime() - 60 * 60 * 1000);

        // REGLA CLAVE: Bloqueado si el admin cerró/avanzó la jornada, si caducó el tiempo, o si el usuario está baneado
        const partidoBloqueado = baneado || jornada.estado !== "abierta" || ahora >= unaHoraAntes;

        const ref = doc(db, "pronosticos", jornada.id, "participantes", user.uid, "partidos", partido.id);
        const proSnap = await getDoc(ref);
        
        if (proSnap.exists()) {
          const data = proSnap.data();
          iniciales[partido.id] = {
            local: data.golesLocal !== null && data.golesLocal !== undefined ? String(data.golesLocal) : "",
            visitante: data.golesVisitante !== null && data.golesVisitante !== undefined ? String(data.golesVisitante) : "",
            bloqueado: partidoBloqueado
          };
        } else {
          // Inicializa en blanco limpio para que deje borrar de forma totalmente fluida
          iniciales[partido.id] = { 
            local: partidoBloqueado ? "-" : "", 
            visitante: partidoBloqueado ? "-" : "",
            bloqueado: partidoBloqueado
          };
        }
      }
      setPronosticos(iniciales);
      setLoading(false);
    };
    cargar();
  }, [jornada.estado]);

  const handleChange = (partidoId: string, tipo: "local" | "visitante", valor: string) => {
    if (pronosticos[partidoId]?.bloqueado) return;
    
    // BLINDAJE DIRECTO: Si el usuario borra con el teclado, dejamos el input en blanco total
    if (valor === "" || valor === null || valor === undefined) {
      setPronosticos(prev => ({
        ...prev,
        [partidoId]: { ...prev[partidoId], [tipo]: "" }
      }));
      return;
    }

    // Si el cuadro tiene un vacío o un cero y el usuario escribe un número, remueve el cero de inmediato
    let valorProcesado = valor;
    if (valor.length > 1 && valor.startsWith("0")) {
      valorProcesado = valor.replace(/^0+/, "");
    }
    
    if (isNaN(Number(valorProcesado)) || Number(valorProcesado) < 0) return;
    
    setAlertaInusual("");
    setBloqueoPreventivo(false);
    setPartidosConError([]);

    setPronosticos(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [tipo]: valorProcesado }
    }));
  };


  const guardar = async () => {
    if (jornada.estado !== "abierta") {
      setMensaje("❌ Esta jornada se encuentra cerrada para recibir modificaciones.");
      return;
    }

    if (usuarioDeshabilitado) {
      setMensaje("❌ No puedes guardar cambios porque has sido deshabilitado de esta jornada");
      return;
    }

    // Escaneo defensivo detallado por ID de partido individual
    let erroresDetectados: string[] = [];
    let mayorGoles = 0;
    let partidoEjemploNombre = "";

    for (const partido of partidos) {
      const p = pronosticos[partido.id];
      if (!p || p.local === "" || p.visitante === "" || p.bloqueado) continue;
      
      const gl = parseInt(p.local);
      const gv = parseInt(p.visitante);
      
      if (gl > 6 || gv > 6) {
        erroresDetectados.push(partido.id);
        const maxLocalOVisitante = gl > gv ? gl : gv;
        if (maxLocalOVisitante > mayorGoles) {
          mayorGoles = maxLocalOVisitante;
          partidoEjemploNombre = partido.local + " vs " + partido.visitante;
        }
      }
    }

    // Si hay inputs inusuales (>6), se frena transitoriamente el flujo y se marcan las tarjetas específicas
    if (erroresDetectados.length > 0 && !bloqueoPreventivo) {
      setPartidosConError(erroresDetectados);
      setAlertaInusual("⚠️ Alerta en [" + partidoEjemploNombre + "]: Detectamos un marcador inusual de " + mayorGoles + " goles. Verifica las tarjetas marcadas en rojo antes de continuar.");
      setBloqueoPreventivo(true);
      return;
    }

    setGuardando(true);
    setMensaje("");
    setAlertaInusual("");
    setBloqueoPreventivo(false);
    setPartidosConError([]);

    try {
      const participanteRef = doc(db, "pronosticos", jornada.id, "participantes", user.uid);
      await setDoc(participanteRef, { 
        existe: true,
        actualizadoEn: new Date().toISOString()
      }, { merge: true });

      for (const partido of partidos) {
        const p = pronosticos[partido.id];
        if (!p || p.local === "" || p.visitante === "" || p.bloqueado) continue;

        const ahora = new Date();
        const fechaPartido = new Date(partido.fechaHora);
        const unaHoraAntes = new Date(fechaPartido.getTime() - 60 * 60 * 1000);
        if (ahora >= unaHoraAntes) continue;

        await setDoc(
          doc(db, "pronosticos", jornada.id, "participantes", user.uid, "partidos", partido.id),
          {
            golesLocal: parseInt(p.local),
            golesVisitante: parseInt(p.visitante),
            puntos: 0,
            uid: user.uid,
            jornadaId: jornada.id,
            partidoId: partido.id
          }
        );
      }
      setMensaje("✅ Pronósticos guardados con éxito");
      setAlertaInusual(""); 
    } catch (e) {
      setMensaje("❌ Error al guardar en el servidor");
    }
    setGuardando(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
      Cargando partidos disponibles...
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Header Superior Fijo */}
      <div style={{
        backgroundColor: "#16213e", padding: "16px 20px",
        display: "flex", justifyBetween: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)", position: "sticky", top: 0, zIndex: 10
      }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>
            Jornada {jornada.numero}
          </div>
          <div style={{ color: "#888", fontSize: "12px" }}>
            {jornada.estado === "abierta" ? "Llena tus pronósticos" : "Consulta de Quiniela (Lectura)"}
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

      {/* Contenedor de Partidos Deslizable */}
      <div style={{ padding: "20px", flex: 1, paddingBottom: "140px" }}> {/* paddingBottom vital para que la barra no tape el último partido */}
        
        {partidos.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No hay partidos cargados en esta jornada.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {partidos.map((partido) => {
              const pro = pronosticos[partido.id];
              const bloqueado = pro?.bloqueado;
              const tieneErrorGoles = partidosConError.includes(partido.id);

              return (
                <div key={partido.id} style={{
                  backgroundColor: "#16213e", borderRadius: "12px",
                  padding: "12px 16px", marginBottom: "4px",
                  border: tieneErrorGoles ? "2px solid #ef4444" : bloqueado ? "1px solid #555" : "1px solid #333",
                  boxShadow: tieneErrorGoles ? "0 0 10px rgba(239, 68, 68, 0.3)" : "none",
                  opacity: bloqueado ? 0.75 : 1,
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                    {partido.fechaHora.replace("T", " ")}
                    {(bloqueado && !usuarioDeshabilitado && jornada.estado === "abierta") && (
                      <span style={{ color: "#e94560", marginLeft: "8px", fontWeight: "bold" }}>
                        🔒 Tiempo expirado
                      </span>
                    )}
                    {(bloqueado && !usuarioDeshabilitado && jornada.estado !== "abierta") && (
                      <span style={{ color: "#ff9800", marginLeft: "8px", fontWeight: "bold" }}>
                        🔒 Jornada en juego
                      </span>
                    )}
                    {usuarioDeshabilitado && (
                      <span style={{ color: "#ff4444", marginLeft: "8px", fontWeight: "bold" }}>
                        🚫 No autorizado
                      </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "10px" }}>
                    {/* Local */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {partido.local}
                      </div>
                      <input
                        type="text"
                        disabled={bloqueado}
                        value={pro?.local === "0" ? "0" : (pro?.local ?? "")}
                        onChange={(e) => handleChange(partido.id, "local", e.target.value)}
                        style={{ 
                          ...golesInput, 
                          backgroundColor: bloqueado ? "#222" : "#0f3460",
                          border: tieneErrorGoles ? "2px solid #ef4444" : bloqueado ? "1px solid #444" : "1px solid #e94560",
                          color: bloqueado ? "#888" : "#fff",
                          opacity: bloqueado ? 0.6 : 1 
                        }}
                      />
                    </div>

                    <div style={{ color: "#e94560", fontWeight: "bold", fontSize: "16px", marginTop: "18px" }}>
                      VS
                    </div>

                    {/* Visitante */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {partido.visitante}
                      </div>
                      <input
                        type="text"
                        disabled={bloqueado}
                        value={pro?.visitante === "0" ? "0" : (pro?.visitante ?? "")}
                        onChange={(e) => handleChange(partido.id, "visitante", e.target.value)}
                        style={{ 
                          ...golesInput, 
                          backgroundColor: bloqueado ? "#222" : "#0f3460",
                          border: tieneErrorGoles ? "2px solid #ef4444" : bloqueado ? "1px solid #444" : "1px solid #e94560",
                          color: bloqueado ? "#888" : "#fff",
                          opacity: bloqueado ? 0.6 : 1 
                        }}
                      />
                    </div>
                  </div>

                  {tieneErrorGoles && (
                    <div style={{ color: "#f87171", fontSize: "11px", textAlign: "center", marginTop: "10px", fontWeight: "bold" }}>
                      ⚠️ Marcador inusual. Verifica si los goles son correctos.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BARRA DE ACCIÓN MAESTRA FIJADA AL FONDO (Sticky Bottom Bar) */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#16213e", padding: "14px 20px",
        borderTop: "1px solid #333", boxShadow: "0 -4px 12px rgba(0,0,0,0.4)",
        zIndex: 100, display: "flex", flexDirection: "column", gap: "8px"
      }}>
        {/* Banner preventivo de goles inusuales */}
        {alertaInusual && (
          <div style={{
            backgroundColor: "#7c2d12", color: "#fdba74", padding: "10px", borderRadius: "6px",
            border: "1px solid #ea580c", fontSize: "12px", fontWeight: "bold", textAlign: "center"
          }}>
            {alertaInusual}
          </div>
        )}

        {/* LEYENDA DE ÉXITO O ERROR: Siempre visible al lado o arriba del botón */}
        {mensaje && (
          <div style={{
            backgroundColor: "#1a1a2e", padding: "10px", borderRadius: "6px",
            borderLeft: "4px solid " + (mensaje.includes("✅") ? "#4caf50" : "#e94560"),
            fontSize: "13px", color: "#ccc", textAlign: "center", fontWeight: "500"
          }}>
            {mensaje}
          </div>
        )}

        {jornada.estado === "abierta" && !usuarioDeshabilitado && (
          <button
            onClick={guardar}
            disabled={guardando}
            style={{
              width: "100%", padding: "14px", 
              backgroundColor: bloqueoPreventivo ? "#ea580c" : "#e94560",
              color: "#fff", border: "none", borderRadius: "8px",
              fontSize: "15px", fontWeight: "bold", cursor: guardando ? "not-allowed" : "pointer",
              boxShadow: bloqueoPreventivo ? "0 4px 10px rgba(234, 88, 12, 0.3)" : "0 4px 10px rgba(233, 69, 96, 0.3)"
            }}
          >
            {guardando ? "Guardando Quiniela..." : bloqueoPreventivo ? "⚠️ Confirmar: Guardar Marcador Inusual Extremo" : "💾 Guardar mi quiniela"}
          </button>
        )}
      </div>
    </div>
  );
}

const golesInput: React.CSSProperties = {
  width: "56px", padding: "8px", textAlign: "center",
  borderRadius: "8px", fontSize: "16px", fontWeight: "bold"
};
  
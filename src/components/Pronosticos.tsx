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
            local: String(data.golesLocal),
            visitante: String(data.golesVisitante),
            bloqueado: partidoBloqueado
          };
        } else {
          // Si está bloqueado de origen y nunca guardó, ponemos un guión neutral para no confundir con un cero real
          iniciales[partido.id] = { 
            local: partidoBloqueado ? "-" : "0", 
            visitante: partidoBloqueado ? "-" : "0",
            bloqueado: partidoBloqueado
          };
        }
      }
      setPronosticos(iniciales);
      setLoading(false);
    };
    cargar();
  }, [jornada.estado]); // Escucha reactiva si el administrador altera el estado desde afuera

  const handleChange = (partidoId: string, tipo: "local" | "visitante", valor: string) => {
    // Si la bandera defensiva local marca bloqueado, rechazar el cambio de inmediato
    if (pronosticos[partidoId]?.bloqueado) return;
    
    if (valor !== "" && (isNaN(Number(valor)) || Number(valor) < 0)) return;
    setPronosticos(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [tipo]: valor }
    }));
  };
  const guardar = async () => {
    // Candado de seguridad 1: La jornada mutó o avanzó en el backend
    if (jornada.estado !== "abierta") {
      setMensaje("❌ Esta jornada se encuentra cerrada para recibir modificaciones.");
      return;
    }

    // Candado de seguridad 2: Usuario penalizado
    if (usuarioDeshabilitado) {
      setMensaje("❌ No puedes guardar cambios porque has sido deshabilitado de esta jornada");
      return;
    }

    setGuardando(true);
    setMensaje("");
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
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#16213e", padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
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

      <div style={{ padding: "20px" }}>
        {/* Banner de mensajes/alertas reactivas */}
        {mensaje && (
          <div style={{
            backgroundColor: "#16213e", padding: "12px", borderRadius: "8px",
            marginBottom: "16px", borderLeft: "4px solid #e94560", fontSize: "13px",
            color: "#ccc"
          }}>
            {mensaje}
          </div>
        )}

        {partidos.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No hay partidos cargados en esta jornada.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {partidos.map((partido) => {
                const pro = pronosticos[partido.id];
                const bloqueado = pro?.bloqueado;

                return (
                  <div key={partido.id} style={{
                    backgroundColor: "#16213e", borderRadius: "12px",
                    padding: "12px 16px", marginBottom: "4px",
                    border: bloqueado ? "1px solid #555" : "1px solid #333",
                    opacity: bloqueado ? 0.75 : 1
                  }}>
                    {/* Fecha y Leyendas Horarias Informativas */}
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

                    {/* Fila en Rejilla de Confrontación Simétrica */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr auto 1fr",
                      alignItems: "center", gap: "10px"
                    }}>
                      {/* Local */}
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {partido.local}
                        </div>
                        <input
                          type="text"
                          disabled={bloqueado}
                          value={pro?.local || "0"}
                          onChange={(e) => handleChange(partido.id, "local", e.target.value)}
                          style={{ 
                            ...golesInput, 
                            backgroundColor: bloqueado ? "#222" : "#0f3460",
                            border: bloqueado ? "1px solid #444" : "1px solid #e94560",
                            color: bloqueado ? "#888" : "#fff",
                            opacity: bloqueado ? 0.6 : 1 
                          }}
                        />
                      </div>

                      {/* Divisor */}
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
                          value={pro?.visitante || "0"}
                          onChange={(e) => handleChange(partido.id, "visitante", e.target.value)}
                          style={{ 
                            ...golesInput, 
                            backgroundColor: bloqueado ? "#222" : "#0f3460",
                            border: bloqueado ? "1px solid #444" : "1px solid #e94560",
                            color: bloqueado ? "#888" : "#fff",
                            opacity: bloqueado ? 0.6 : 1 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* El botón de guardar se evapora si la jornada ya está bloqueada por el administrador */}
            {jornada.estado === "abierta" && !usuarioDeshabilitado && (
              <button
                onClick={guardar}
                disabled={guardando}
                style={{
                  width: "100%", padding: "14px", backgroundColor: "#e94560",
                  color: "#fff", border: "none", borderRadius: "8px",
                  fontSize: "16px", fontWeight: "bold", cursor: "pointer",
                  marginTop: "16px", boxShadow: "0 4px 12px rgba(233, 69, 96, 0.3)"
                }}
              >
                {guardando ? "Guardando Quiniela..." : "💾 Guardar mi quiniela"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const golesInput: React.CSSProperties = {
  width: "56px", padding: "8px", textAlign: "center",
  borderRadius: "8px", fontSize: "16px", fontWeight: "bold"
};

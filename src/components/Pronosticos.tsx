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
  const [pronosticos, setPronosticos] = useState<{ [key: string]: { local: string; visitante: string } }>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // ESTADO NUEVO: Rastreará si el administrador penalizó a este usuario en esta jornada
  const [usuarioDeshabilitado, setUsuarioDeshabilitado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      // 1. Verificar primero si el documento raíz del participante tiene la bandera de deshabilitado
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

      // 2. Cargar partidos activos (no suspendidos)
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

      // 3. Cargar pronósticos existentes
      const iniciales: any = {};
      for (const partido of lista) {
        const ahora = new Date();
        const fechaPartido = new Date((partido as any).fechaHora);
        const unaHoraAntes = new Date(fechaPartido.getTime() - 60 * 60 * 1000);

        // Si el usuario está deshabilitado, la jornada está cerrada o venció el tiempo, forzamos candado
        if (baneado || jornada.estado === "cerrada" || ahora >= unaHoraAntes) {
          iniciales[partido.id] = { local: "🔒", visitante: "🔒", bloqueado: true };
          continue;
        }

        const ref = doc(db, "pronosticos", jornada.id, "participantes", user.uid, "partidos", partido.id);
        const proSnap = await getDoc(ref);
        if (proSnap.exists()) {
          const data = proSnap.data();
          iniciales[partido.id] = {
            local: String(data.golesLocal),
            visitante: String(data.golesVisitante)
          };
        } else {
          iniciales[partido.id] = { local: "0", visitante: "0" };
        }
      }
      setPronosticos(iniciales);
      setLoading(false);
    };
    cargar();
  }, []);
  const handleChange = (partidoId: string, tipo: "local" | "visitante", valor: string) => {
    if (valor !== "" && (isNaN(Number(valor)) || Number(valor) < 0)) return;
    setPronosticos(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [tipo]: valor }
    }));
  };

  const guardar = async () => {
    // 1. Candado de seguridad: Si la jornada está cerrada
    if (jornada.estado === "cerrada") {
      setMensaje("❌ Esta jornada ya se encuentra cerrada por el administrador");
      return;
    }

    // 2. Candado de seguridad: Si el usuario fue deshabilitado por el administrador
    if (usuarioDeshabilitado) {
      setMensaje("❌ No puedes guardar cambios porque has sido deshabilitado de esta jornada");
      return;
    }

    setGuardando(true);
    setMensaje("");
    try {
      // --- PARCHE DE COMPATIBILIDAD CON FIRESTORE (SIN TIMESTAMP) ---
      const participanteRef = doc(db, "pronosticos", jornada.id, "participantes", user.uid);
      
      // Usamos un string nativo de JS para evitar errores de importación en StackBlitz
      await setDoc(participanteRef, { 
        existe: true,
        actualizadoEn: new Date().toISOString()
      }, { merge: true });

      for (const partido of partidos) {
        const p = pronosticos[partido.id];
        if (!p || p.local === "" || p.visitante === "" || (p as any).bloqueado) continue;

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
      setMensaje("✅ Pronósticos guardados");
    } catch (e) {
      setMensaje("❌ Error al guardar");
    }
    setGuardando(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
      Cargando partidos...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>
      <div style={{
        backgroundColor: "#16213e", padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>
            Jornada {jornada.numero}
          </div>
          <div style={{ color: "#888", fontSize: "12px" }}>Llena tus pronósticos</div>
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
        {partidos.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No hay partidos disponibles en esta jornada.</p>
          </div>
        ) : (
          <>
            {partidos.map((partido) => {
              const pro = pronosticos[partido.id];
              const bloqueado = (pro as any)?.bloqueado;

              return (
                <div key={partido.id} style={{
                  backgroundColor: "#16213e", borderRadius: "12px",
                  padding: "16px", marginBottom: "12px",
                  border: bloqueado ? "1px solid #555" : "1px solid #333",
                  opacity: bloqueado ? 0.7 : 1
                }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
                    {partido.fechaHora.replace("T", " ")}
                    {(bloqueado && !usuarioDeshabilitado) && (
                      <span style={{ color: "#e94560", marginLeft: "8px" }}>
                        🔒 Pronóstico cerrado
                      </span>
                    )}
                    {usuarioDeshabilitado && (
                      <span style={{ color: "#ff4444", marginLeft: "8px" }}>
                        🚫 No autorizado
                      </span>
                    )}
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
                        disabled={bloqueado || usuarioDeshabilitado}
                        value={bloqueado || usuarioDeshabilitado ? "" : (pro?.local || "")}
                        onChange={(e) => handleChange(partido.id, "local", e.target.value)}
                        style={{ ...golesInput, opacity: bloqueado || usuarioDeshabilitado ? 0.5 : 1 }}
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
                        disabled={bloqueado || usuarioDeshabilitado}
                        value={bloqueado || usuarioDeshabilitado ? "" : (pro?.visitante || "")}
                        onChange={(e) => handleChange(partido.id, "visitante", e.target.value)}
                        style={{ ...golesInput, opacity: bloqueado || usuarioDeshabilitado ? 0.5 : 1 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {mensaje && (
              <p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", textAlign: "center" }}>
                {mensaje}
              </p>
            )}

            <button
              onClick={guardar}
              disabled={guardando || usuarioDeshabilitado}
              style={{
                width: "100%", padding: "14px", backgroundColor: usuarioDeshabilitado ? "#333" : "#e94560",
                color: usuarioDeshabilitado ? "#888" : "#fff", border: "none", borderRadius: "8px",
                fontSize: "16px", fontWeight: "bold", cursor: usuarioDeshabilitado ? "not-allowed" : "pointer",
                marginTop: "8px"
              }}
            >
              {guardando ? "Guardando..." : "💾 Guardar pronósticos"}
            </button>
          </>
        )}
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

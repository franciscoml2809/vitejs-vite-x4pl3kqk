import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, getDocs, doc, updateDoc, setDoc
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
      // Solo partidos NO suspendidos
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => !p.suspendido);
      setPartidos(lista);

      const iniciales: any = {};
      lista.forEach((p: any) => {
        iniciales[p.id] = {
          local: p.golesLocal !== null && p.golesLocal !== undefined ? String(p.golesLocal) : "",
          visitante: p.golesVisitante !== null && p.golesVisitante !== undefined ? String(p.golesVisitante) : ""
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
      // 1. Guardar resultados reales en cada partido de la jornada en Firestore
      for (const partido of partidos) {
        const r = resultados[partido.id];
        if (!r || r.local === "" || r.visitante === "") continue;
        const golesL = parseInt(r.local);
        const golesV = parseInt(r.visitante);
        await updateDoc(doc(db, "jornadas", jornada.id, "partidos", partido.id), {
          golesLocal: golesL,
          golesVisitante: golesV,
          resultado: getResultado(golesL, golesV)
        });
      }

      // 2. Volver a leer la subcolección de partidos de la jornada para obtener la foto real y fresca de Firestore
      const partidosActualizadosSnap = await getDocs(
        collection(db, "jornadas", jornada.id, "partidos")
      );
      const partidosOficialesMap: { [id: string]: any } = {};
      partidosActualizadosSnap.docs.forEach(d => {
        partidosOficialesMap[d.id] = d.data();
      });

      // 3. CONSULTA JERÁRQUICA: Recorrer participantes directo de la subcolección de esta jornada
      const participantesSnap = await getDocs(
        collection(db, "pronosticos", jornada.id, "participantes")
      );
      const puntajesPorUsuario: { [uid: string]: number } = {};

      for (const participanteDoc of participantesSnap.docs) {
        const uid = participanteDoc.id;
        const participanteData = participanteDoc.data();

        // Excluir automáticamente a los amigos penalizados/deshabilitados por el administrador
        if (participanteData.deshabilitado === true) continue;

        const partidosSnap = await getDocs(
          collection(db, "pronosticos", jornada.id, "participantes", uid, "partidos")
        );

        if (partidosSnap.empty) continue;

        let totalUsuario = 0;

        for (const proDoc of partidosSnap.docs) {
          const pro = proDoc.data();
          const partidoId = proDoc.id;

          // LEER DESDE FIRESTORE (No de los inputs): Si el partido aún no se juega o no tiene marcador oficial, saltar sin borrar el pasado
          const partidoOficial = partidosOficialesMap[partidoId];
          if (!partidoOficial || partidoOficial.suspendido) continue;
          if (partidoOficial.golesLocal === null || partidoOficial.golesVisitante === null) continue;

          const puntos = calcularPuntos(
            pro.golesLocal, pro.golesVisitante,
            partidoOficial.golesLocal, partidoOficial.golesVisitante
          );

          await updateDoc(
            doc(db, "pronosticos", jornada.id, "participantes", uid, "partidos", partidoId),
            { puntos }
          );

          totalUsuario += puntos;
        }

        puntajesPorUsuario[uid] = totalUsuario;
      }

      // 4. Escribir los puntajes consolidados en la colección oficial de posiciones con espacios
      for (const [uid, puntos] of Object.entries(puntajesPorUsuario)) {
        await setDoc(
          doc(db, "tabla por jornada", jornada.id, "posiciones", uid),
          { uid, totalPuntos: puntos }
        );
      }

      setMensaje("✅ Marcadores parciales guardados y ranking en vivo actualizado");
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al procesar el cálculo de puntos parciales");
    }
    setCalculando(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
      Cargando partidos de la jornada...
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
        {partidos.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No hay partidos activos en esta jornada.</p>
          </div>
        ) : (
          <>
            {partidos.map((partido) => (
              <div key={partido.id} style={{
                backgroundColor: "#16213e", borderRadius: "12px",
                padding: "16px", marginBottom: "12px", border: "1px solid #333"
              }}>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
                  {partido.fechaHora.replace("T", " ")}
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
          </>
        )}

        {mensaje && (
          <p style={{ color: mensaje.includes("✅") ? "#4caf50" : "#e94560", textAlign: "center" }}>
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
            marginTop: "12px", boxShadow: "0 4px 12px rgba(233,69,96,0.2)"
          }}
        >
          {calculando ? "Calculando..." : "⚡ Guardar marcadores y actualizar ranking en vivo"}
        </button>

        {/* ETIQUETA INFORMATIVA COMPACTA NEUTRAL DEL ESTADO DE LA JORNADA */}
        <div style={{
          marginTop: "12px", padding: "12px", borderRadius: "8px",
          backgroundColor: "#12192c", border: "1px solid #222",
          textAlign: "center", fontSize: "13px", color: "#888"
        }}>
          Estado de control exterior: <span style={{ 
            fontWeight: "bold", 
            color: jornada.estado === "abierta" ? "#4caf50" : jornada.estado === "en_progreso" ? "#ff9800" : "#00bcd4" 
          }}>{jornada.estado.toUpperCase()}</span>
        </div>
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

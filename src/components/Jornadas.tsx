import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import type { User } from "firebase/auth";
import Pronosticos from "./Pronosticos";
import MisPuntos from "./MisPuntos";

interface Props {
  user: User;
}

export default function Jornadas({ user }: Props) {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]); 
  const [ligas, setLigas] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [jornadaActiva, setJornadaActiva] = useState<any>(null);
  const [jornadaMisPuntos, setJornadaMisPuntos] = useState<any>(null);

  useEffect(() => {
    const cargar = async () => {
      // 1. Cargar las jornadas cronológicas
      const qJornadas = query(collection(db, "jornadas"), orderBy("numero"));
      const snapJornadas = await getDocs(qJornadas);
      
      // Lógica de conteo embebida por cada jornada para inyectar estadísticas financieras en vivo
      const listaJornadasTemp = [];
      for (const docSnap of snapJornadas.docs) {
        const jData = docSnap.data();
        const jId = docSnap.id;

        // Consultar la subcolección jerárquica de participantes de esta fecha específica
        const pSnap = await getDocs(collection(db, "pronosticos", jId, "participantes"));
        const listaParticipantes = pSnap.docs.map(d => d.data());

        // Procesar totales descartando duplicados o estructuras vacías
        const totalParticipantes = listaParticipantes.length;
        const totalPagados = listaParticipantes.filter(p => p.pagoRealizado === true).length;

        listaJornadasTemp.push({
          id: jId,
          ...jData,
          totalParticipantes,
          totalPagados
        });
      }
      setJornadas(listaJornadasTemp);

      try {
        const qTorneos = query(collection(db, "torneos"), orderBy("nombre"));
        const snapTorneos = await getDocs(qTorneos);
        const listaTorneos = snapTorneos.docs.map(d => ({ id: d.id, ...d.data() }));
        setTorneos(listaTorneos);
      } catch (e) {
        console.error("Error al cargar torneos en Dashboard", e);
      }

      try {
        const qLigas = query(collection(db, "ligas"), orderBy("nombre"));
        const snapLigas = await getDocs(qLigas);
        const listaLigas = snapLigas.docs.map(d => ({ id: d.id, ...d.data() }));
        setLigas(listaLigas);
      } catch (e) {
        console.error("Error al cargar ligas en Dashboard", e);
      }

      setLoading(false);
    };
    cargar();
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/jornada\/(.+)/);
    if (match && jornadas.length > 0) {
      const jornadaId = match[1];
      const encontrada = jornadas.find((j: any) => j.id === jornadaId);
      if (encontrada) setJornadaActiva(encontrada);
    }
  }, [jornadas]);

  if (jornadaMisPuntos) return (
    <MisPuntos
      user={user}
      jornada={jornadaMisPuntos}
      onBack={() => setJornadaMisPuntos(null)}
    />
  );

  if (jornadaActiva) return (
    <Pronosticos
      user={user}
      jornada={jornadaActiva}
      onBack={() => setJornadaActiva(null)}
    />
  );

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
      Cargando jornadas y estadísticas...
    </div>
  );

  const jornadasVisibles = jornadas.filter(
    j => j.estado === "abierta" || j.estado === "en_progreso"
  );

  const jornadasFinalizadas = jornadas
    .filter(j => j.estado === "finalizada")
    .sort((a, b) => b.numero - a.numero)
    .slice(0, 3);
    return (
      <div>
        {/* SECCIÓN 1: JORNADAS ACTIVAS DE LA SEMANA */}
        <h2 style={{ color: "#e94560", marginTop: 0 }}>Jornadas Activas</h2>
        
        {jornadasVisibles.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888", marginBottom: "30px"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
            <p>No hay jornadas activas por el momento.</p>
            <p style={{ fontSize: "13px" }}>El administrador publicará la próxima jornada pronto.</p>
          </div>
        ) : (
          jornadasVisibles.map((jornada) => {
            const torneoAsociado = torneos.find(t => t.id === jornada.torneoId);
            const ligaAsociada = torneoAsociado ? ligas.find(l => l.id === torneoAsociado.ligaId) : null;
            const esAbierta = jornada.estado === "abierta";
  
            return (
              <div key={jornada.id} style={{
                backgroundColor: "#16213e", borderRadius: "12px",
                padding: "16px", marginBottom: "12px",
                border: "1px solid #333"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      Jornada {jornada.numero}
                    </div>
                    {torneoAsociado && (
                      <div style={{ color: "#e94560", fontSize: "13px", fontWeight: "bold", marginTop: "4px" }}>
                        🏆 {ligaAsociada ? ligaAsociada.nombre + " — " : ""}{torneoAsociado.nombre}
                      </div>
                    )}
                    
                    {/* INDICADORES EN VIVO DE COMPETIDORES Y FINANZAS */}
                    <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "12px", color: "#aaa" }}>
                      <span>👥 {jornada.totalParticipantes || 0} Jugadores</span>
                      <span style={{ color: (jornada.totalPagados === jornada.totalParticipantes && jornada.totalParticipantes > 0) ? "#4caf50" : "#ff9800" }}>
                        💰 {jornada.totalPagados || 0} Pagados
                      </span>
                    </div>
  
                    <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>
                      {jornada.fechaInicio} — {jornada.fechaFin}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: esAbierta ? "#1b5e20" : "#e65100",
                    color: esAbierta ? "#4caf50" : "#ffb74d",
                    padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
                    fontWeight: "bold"
                  }}>
                    {esAbierta ? "Abierta" : "En Progreso"}
                  </div>
                </div>
  
                {esAbierta ? (
                  <button
                    onClick={() => setJornadaActiva(jornada)}
                    style={{
                      marginTop: "14px", width: "100%", padding: "10px",
                      backgroundColor: "#e94560", color: "#fff", border: "none",
                      borderRadius: "8px", fontSize: "14px", cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    Llenar pronósticos →
                  </button>
                ) : (
                  <button
                    onClick={() => setJornadaMisPuntos(jornada)}
                    style={{
                      marginTop: "14px", width: "100%", padding: "10px",
                      backgroundColor: "#0f3460", color: "#fff", border: "none",
                      borderRadius: "8px", fontSize: "14px", cursor: "pointer",
                      fontWeight: "bold", boxShadow: "0 4px 10px rgba(15, 52, 96, 0.3)"
                    }}
                  >
                    📊 Ver mis puntos / Quiniela
                  </button>
                )}
              </div>
            );
          })
        )}
  
        {/* SECCIÓN 2: HISTORIAL RECIENTE COMPACTO */}
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ color: "#888", fontSize: "15px", borderBottom: "1px solid #333", paddingBottom: "8px", marginBottom: "12px" }}>
            📜 Historial Reciente (Últimas 3 Jornadas)
          </h3>
          
          {jornadasFinalizadas.length === 0 ? (
            <div style={{ color: "#555", fontSize: "13px", padding: "10px 0", fontStyle: "italic" }}>
              No hay jornadas finalizadas en el historial todavía.
            </div>
          ) : (
            jornadasFinalizadas.map((jornada) => {
              const torneoAsociado = torneos.find(t => t.id === jornada.torneoId);
              const ligaAsociada = torneoAsociado ? ligas.find(l => l.id === torneoAsociado.ligaId) : null;
  
              return (
                <div key={jornada.id} style={{
                  backgroundColor: "#12192c", borderRadius: "12px",
                  padding: "12px 16px", marginBottom: "10px",
                  border: "1px solid #222", opacity: 0.85
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px", color: "#ccc" }}>
                        Jornada {jornada.numero} (Finalizada)
                      </div>
                      {torneoAsociado && (
                        <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                          {ligaAsociada ? ligaAsociada.nombre + " — " : ""}{torneoAsociado.nombre}
                        </div>
                      )}
                      {/* Datos financieros informativos en el historial */}
                      <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                        👥 {jornada.totalParticipantes || 0} Jugadores | 💰 {jornada.totalPagados || 0} Pagados
                      </div>
                    </div>
                    <button
                      onClick={() => setJornadaMisPuntos(jornada)}
                      style={{
                        padding: "8px 16px", backgroundColor: "#0f3460", 
                        color: "#fff", border: "none",
                        borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold"
                      }}
                    >
                      📊 Puntos / Quiniela
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
  
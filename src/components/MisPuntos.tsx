import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import type { User } from "firebase/auth";

interface Props {
  user: User;
  jornada: any;
  onBack: () => void;
}

export default function MisPuntos({ user, jornada, onBack }: Props) {
  const [datos, setDatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPuntos, setTotalPuntos] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      // 1. Cargar partidos de la jornada desde la subcolección jerárquica
      const partidosSnap = await getDocs(
        collection(db, "jornadas", jornada.id, "partidos")
      );
      const partidos: { [id: string]: any } = {};
      partidosSnap.docs.forEach(d => {
        partidos[d.id] = { id: d.id, ...d.data() };
      });

      // 2. Cargar pronósticos del usuario en esta jornada desde su subcolección de partidos
      const proSnap = await getDocs(
        collection(db, "pronosticos", jornada.id, "participantes", user.uid, "partidos")
      );

      let total = 0;
      const lista = proSnap.docs.map(d => {
        const pro = d.data();
        const partido = partidos[pro.partidoId];
        // Omitir por completo el conteo de partidos suspendidos
        if (partido?.suspendido) return null;

        // Comprobación defensiva local: si el admin no ha puesto marcadores, es un partido pendiente
        const tieneMarcadorOficial = partido?.golesLocal !== null && partido?.golesLocal !== undefined &&
                                    partido?.golesVisitante !== null && partido?.golesVisitante !== undefined;

        // Si tiene marcador usamos sus puntos, si no, usamos la bandera (-1) para pintar gris en la UI
        const puntosVista = tieneMarcadorOficial ? (pro.puntos || 0) : -1;

        if (tieneMarcadorOficial) {
          total += pro.puntos || 0;
        }

        return { ...pro, partido, puntosVista };
      })
      .filter(Boolean)
      // Ordenación precisa usando el string fechaHora nativo guardado por el administrador
      .sort((a, b) => {
        const fA = a.partido?.fechaHora || "";
        const fB = b.partido?.fechaHora || "";
        if (fA < fB) return -1;
        if (fA > fB) return 1;
        return 0;
      });

      setDatos(lista);
      setTotalPuntos(total);
      setLoading(false);
    };
    cargar();
  }, []);

  // Control estético de colores: Gris neutral si está pendiente (-1)
  const getColor = (puntosVista: number) => {
    if (puntosVista === -1) return "#555566"; // Gris oscuro neutral
    if (puntosVista === 3) return "#4caf50";   // Verde exacto
    if (puntosVista === 1) return "#ff9800";   // Naranja tendencia
    return "#e94560";                          // Rojo fallado
  };

  const getIcono = (puntosVista: number) => {
    if (puntosVista === -1) return "🕒";        // Icono de espera para pendientes
    if (puntosVista === 3) return "⭐";
    if (puntosVista === 1) return "✅";
    return "❌";
  };

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
      Cargando puntos de la jornada...
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>
      {/* Barra de Encabezado */}
      <div style={{
        backgroundColor: "#16213e", padding: "12px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>
            Mis puntos — Jornada {jornada.numero}
          </div>
          <div style={{ color: "#888", fontSize: "12px" }}>
            Total acumulado en esta fecha
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

      <div style={{ padding: "16px" }}>
        {/* Bloque de Resumen Compacto */}
        <div style={{
          backgroundColor: "#16213e", borderRadius: "12px",
          padding: "16px", marginBottom: "16px", textAlign: "center",
          border: "1px solid #333"
        }}>
          <div style={{ fontSize: "40px", fontWeight: "bold", color: "#e94560", lineHeight: "1" }}>
            {totalPuntos}
          </div>
          <div style={{ color: "#888", fontSize: "13px", marginTop: "4px" }}>puntos obtenidos</div>
          
          <div style={{ display: "flex", justifyContent: "center", gap: "28px", marginTop: "12px", borderTop: "1px solid #222", paddingTop: "12px" }}>
            {/* Exactos */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>⭐</div>
              <div style={{ color: "#ccc", fontWeight: "bold", fontSize: "14px" }}>
                {datos.filter(d => d.puntosVista === 3).length}
              </div>
              <div style={{ color: "#777", fontSize: "11px", marginTop: "2px" }}>Exactos</div>
            </div>
            
            {/* Resultado */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>✅</div>
              <div style={{ color: "#ccc", fontWeight: "bold", fontSize: "14px" }}>
                {datos.filter(d => d.puntosVista === 1).length}
              </div>
              <div style={{ color: "#777", fontSize: "11px", marginTop: "2px" }}>Resultado</div>
            </div>
            
            {/* Fallados */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>❌</div>
              <div style={{ color: "#ccc", fontWeight: "bold", fontSize: "14px" }}>
                {datos.filter(d => d.puntosVista === 0).length}
              </div>
              <div style={{ color: "#777", fontSize: "11px", marginTop: "2px" }}>Fallados</div>
            </div>
          </div>
        </div>

        {/* Listado de Confrontaciones Detallado Optimizado para Móvil */}
        {datos.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No registraste quiniela para esta fecha.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {datos.map((item, index) => (
              <div key={index} style={{
                backgroundColor: "#16213e", 
                borderRadius: "10px",
                padding: "12px 14px",
                border: "1px solid " + getColor(item.puntosVista),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
              }}>
                
                {/* Contenedor Izquierdo Principal (Filas de Información) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
                  
                  {/* Fila 1: Enfrentamiento (Equipo A vs Equipo B) */}
                  <div style={{ 
                    fontWeight: "bold", 
                    fontSize: "14px", 
                    color: "#fff", 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis" 
                  }}>
                    {(item.partido?.local ?? "Local")} <span style={{ color: "#888", fontWeight: "normal", fontSize: "12px" }}>vs</span> {(item.partido?.visitante ?? "Visitante")}
                  </div>

                  {/* Bloque Interno de Marcadores en Cascada */}
                  <div style={{
                    backgroundColor: "#12192c",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #253352",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}>
                    {/* Fila 2: Tu Pronóstico */}
                    <div style={{ display: "flex", alignItems: "center", fontSize: "12px", gap: "6px" }}>
                      <span style={{ color: "#aaa", minWidth: "75px" }}>Tu Prono:</span>
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {item.golesLocal} - {item.golesVisitante}
                      </span>
                    </div>

                    {/* Fila 3: Resultado Oficial */}
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      fontSize: "12px", 
                      gap: "6px",
                      borderTop: "1px solid #1c2842", 
                      paddingTop: "4px" 
                    }}>
                      <span style={{ color: "#aaa", minWidth: "75px" }}>Oficial:</span>
                      <span style={{ color: getColor(item.puntosVista), fontWeight: "bold" }}>
                        {(item.partido?.golesLocal ?? "?")} - {(item.partido?.golesVisitante ?? "?")}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Contenedor Derecho: Banner Lateral de Puntos Ganados */}
                <div style={{ 
                  textAlign: "center", 
                  backgroundColor: getColor(item.puntosVista) + "22", 
                  border: "1px solid " + getColor(item.puntosVista),
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "13px", 
                  fontWeight: "bold", 
                  color: "#ccc",
                  minWidth: "72px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  height: "fit-content"
                }}>
                  <span>{getIcono(item.puntosVista)}</span>
                  <span>{item.puntosVista === -1 ? "—" : "+" + item.puntosVista}</span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


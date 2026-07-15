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
        total += pro.puntos || 0;
        return { ...pro, partido };
      }).filter(Boolean);

      setDatos(lista);
      setTotalPuntos(total);
      setLoading(false);
    };
    cargar();
  }, []);

  const getColor = (puntos: number) => {
    if (puntos === 3) return "#4caf50";
    if (puntos === 1) return "#ff9800";
    return "#e94560";
  };

  const getIcono = (puntos: number) => {
    if (puntos === 3) return "⭐";
    if (puntos === 1) return "✅";
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
        {/* Bloque de Resumen Compacto Modificado */}
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
                {datos.filter(d => d.puntos === 3).length}
              </div>
              <div style={{ color: "#777", fontSize: "11px", marginTop: "2px" }}>Exactos</div>
            </div>
            
            {/* Resultado (Antes Tendencia) */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>✅</div>
              <div style={{ color: "#ccc", fontWeight: "bold", fontSize: "14px" }}>
                {datos.filter(d => d.puntos === 1).length}
              </div>
              <div style={{ color: "#777", fontSize: "11px", marginTop: "2px" }}>Resultado</div>
            </div>
            
            {/* Fallados */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>❌</div>
              <div style={{ color: "#ccc", fontWeight: "bold", fontSize: "14px" }}>
                {datos.filter(d => d.puntos === 0).length}
              </div>
              <div style={{ color: "#777", fontSize: "11px", marginTop: "2px" }}>Fallados</div>
            </div>
          </div>
        </div>
        {/* Listado de Confrontaciones Detallado con Etiquetas Claras */}
        {datos.length === 0 ? (
          <div style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "20px", textAlign: "center", color: "#888"
          }}>
            <p>No registraste quiniela para esta fecha.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {datos.map((item, index) => (
              <div key={index} style={{
                backgroundColor: "#16213e", borderRadius: "10px",
                padding: "10px 14px",
                border: "1px solid " + getColor(item.puntos),
                display: "grid",
                gridTemplateColumns: "1.2fr 1.2fr 1.2fr auto",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
              }}>
                {/* Columna 1: Equipo Local */}
                <div style={{ textAlign: "right", fontWeight: "bold", fontSize: "14px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.partido?.local}
                </div>

                {/* Columna 2: Bloque de Confrontación de Marcadores (Doble Fila Vertical Limpia) */}
                <div style={{ 
                  textAlign: "center", 
                  backgroundColor: "#12192c", 
                  padding: "6px 8px", 
                  borderRadius: "6px", 
                  border: "1px solid #253352",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  {/* Fila del Pronóstico del Usuario */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#aaa" }}>Pronostico:</span>
                    <span style={{ color: "#fff", fontWeight: "bold" }}>{item.golesLocal} - {item.golesVisitante}</span>
                  </div>
                  {/* Fila del Marcador Real Oficial */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderTop: "1px solid #1c2842", paddingTop: "3px" }}>
                    <span style={{ color: "#aaa" }}>Oficial:</span>
                    <span style={{ color: getColor(item.puntos), fontWeight: "bold" }}>{item.partido?.golesLocal ?? "?"} - {item.partido?.golesVisitante ?? "?"}</span>
                  </div>
                </div>

                {/* Columna 3: Equipo Visitante */}
                <div style={{ textAlign: "left", fontWeight: "bold", fontSize: "14px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.partido?.visitante}
                </div>

                {/* Columna 4: Banner Lateral de Puntos Ganados sin fuentes cruzadas de color */}
                <div style={{ 
                  textAlign: "center", 
                  backgroundColor: getColor(item.puntos) + "22", 
                  border: "1px solid " + getColor(item.puntos),
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "13px", 
                  fontWeight: "bold", 
                  color: "#ccc", // Texto e indicador numérico en color neutral claro
                  minWidth: "68px",
                  boxSizing: "border-box"
                }}>
                  <span style={{ marginRight: "3px" }}>{getIcono(item.puntos)}</span> +{item.puntos}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

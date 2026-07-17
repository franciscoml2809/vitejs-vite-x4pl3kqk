import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface ParticipantesViewProps {
  jornada: any;
  onBack: () => void;
}

export default function ParticipantesView({ jornada, onBack }: ParticipantesViewProps) {
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [usuariosMap, setUsuariosMap] = useState<{ [uid: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [exportando, setExportando] = useState(false);

  const [nombreTorneoReporte, setNombreTorneoReporte] = useState("Desconocido");
  const [nombreLigaReporte, setNombreLigaReporte] = useState("Desconocida");

  // Estado nuevo para controlar el universo total de partidos activos en la fecha
  const [totalPartidosJornada, setTotalPartidosJornada] = useState<number>(0);

  useEffect(() => {
    const inicializar = async () => {
      try {
        // 1. Obtener y filtrar partidos oficiales no suspendidos de la jornada
        const partidosSnap = await getDocs(collection(db, "jornadas", jornada.id, "partidos"));
        const listaPartidosActivos = partidosSnap.docs.filter(d => !d.data().suspendido);
        setTotalPartidosJornada(listaPartidosActivos.length);

        // 2. Mapear nombres reales del catálogo global de usuarios
        const uSnap = await getDocs(collection(db, "usuarios"));
        const temporalMap: { [uid: string]: string } = {};
        uSnap.docs.forEach(d => {
          const data = d.data();
          temporalMap[data.uid] = data.nombre || data.email;
        });
        setUsuariosMap(temporalMap);

        // 3. Consultar subcolección de participantes admitidos en la fecha
        const pSnap = await getDocs(collection(db, "pronosticos", jornada.id, "participantes"));
        const listaTemp = [];

        for (const pDoc of pSnap.docs) {
          const pData = pDoc.data();
          const pUid = pDoc.id;

          // Consulta interna asíncrona por cada participante para medir sus avances reales
          const pronosticosSnap = await getDocs(
            collection(db, "pronosticos", jornada.id, "participantes", pUid, "partidos")
          );
          
          let conteoLlenados = 0;
          pronosticosSnap.docs.forEach(pronoDoc => {
            const pronoData = pronoDoc.data();
            if (
              pronoData.golesLocal !== "" && 
              pronoData.golesVisitante !== "" && 
              pronoData.golesLocal !== undefined && 
              pronoData.golesVisitante !== undefined &&
              pronoData.golesLocal !== "-" &&
              pronoData.golesVisitante !== "-"
            ) {
              conteoLlenados++;
            }
          });

          listaTemp.push({
            uid: pUid,
            ...pData,
            partidosLlenados: conteoLlenados
          });
        }
        setParticipantes(listaTemp);

        const tSnap = await getDocs(collection(db, "torneos"));
        const lSnap = await getDocs(collection(db, "ligas"));
        
        const torneoActual = tSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(t => t.id === jornada.torneoId) as any;
        if (torneoActual) {
          setNombreTorneoReporte(torneoActual.nombre + " (" + (torneoActual.tipo === "regular" ? "Regular" : "Eliminatoria") + ")");
          const ligaActual = lSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(l => l.id === torneoActual.ligaId) as any;
          if (ligaActual) {
            setNombreLigaReporte(ligaActual.nombre);
          }
        }
      } catch (e) {
        console.error("Error cargando moderación de participantes", e);
      }
      setLoading(false);
    };
    inicializar();
  }, []);

  // Generador de alias inteligentes de 3 caracteres al vuelo
  const obtenerAlias = (nombre: string): string => {
    if (!nombre) return "???";
    const limpio = nombre.trim().toUpperCase();
    
    // Diccionario de correcciones comunes de equipos de la Liga MX
    if (limpio.indexOf("CRUZ") !== -1 || limpio.indexOf("AZUL") !== -1) return "CAZ";
    if (limpio.indexOf("PUMA") !== -1 || limpio.indexOf("UNAM") !== -1) return "UNM";
    if (limpio.indexOf("AMER") !== -1) return "AME";
    if (limpio.indexOf("CHIV") !== -1 || limpio.indexOf("GUAD") !== -1) return "GUA";
    if (limpio.indexOf("TIG") !== -1) return "TIG";
    if (limpio.indexOf("RAYA") !== -1 || limpio.indexOf("MONT") !== -1) return "MTY";
    if (limpio.indexOf("ATLAS") !== -1) return "ATS";
    if (limpio.indexOf("SAN LUIS") !== -1) return "ASL";
    if (limpio.indexOf("JUAR") !== -1 || limpio.indexOf("BRAV") !== -1) return "JUA";
    if (limpio.indexOf("TIJU") !== -1 || limpio.indexOf("XOLO") !== -1) return "TIJ";
    if (limpio.indexOf("QUER") !== -1 || limpio.indexOf("GALL") !== -1) return "QRO";
    if (limpio.indexOf("ATLAN") !== -1) return "ATL";
    if (limpio.indexOf("NECA") !== -1) return "NEC";
    if (limpio.indexOf("PACH") !== -1) return "PAC";
    if (limpio.indexOf("TOLU") !== -1) return "TOL";
    if (limpio.indexOf("PUEB") !== -1) return "PUE";
    if (limpio.indexOf("LEON") !== -1) return "LEO";
    if (limpio.indexOf("SANT") !== -1) return "SAN";
    
    return limpio.substring(0, 3);
  };
  const exportarTexto = async () => {
    const habilitadosParaReporte = participantes.filter(p => p.deshabilitado !== true);

    if (habilitadosParaReporte.length === 0) {
      setMensaje("⚠️ No hay participantes habilitados en esta jornada para exportar.");
      return;
    }

    setExportando(true);
    setMensaje("");
    try {
      const partidosSnap = await getDocs(collection(db, "jornadas", jornada.id, "partidos"));
      const listaPartidos = partidosSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => !p.suspendido)
        .sort((a: any, b: any) => (a.fechaHora < b.fechaHora ? -1 : 1));

      // 1. Crear el bloque dinámico de encabezados de los partidos alineados (7 caracteres por columna)
      let filaPartidosHeader = "";
      listaPartidos.forEach((partido: any) => {
        const aliasLocal = obtenerAlias(partido.local);
        const aliasVisitante = obtenerAlias(partido.visitante);
        const llavePartido = aliasLocal + "-" + aliasVisitante;
        filaPartidosHeader = filaPartidosHeader + " | " + llavePartido.padEnd(7, " ");
      });

      // 2. Determinar la longitud de la línea divisoria basado en los partidos que haya
      const columnaNombreWidth = 18;
      let totalSeparadores = columnaNombreWidth;
      listaPartidos.forEach(() => {
        totalSeparadores = totalSeparadores + 10; // Espaciado simétrico de cada pipe y datos
      });
      
      let lineaDivisoria = "".padEnd(totalSeparadores, "-") + "\n";

      // 3. Compilar el encabezado estático del reporte general
      let txt = "======================================================================\n";
      txt += "        REPORTE OFICIAL DE PRONÓSTICOS — COMPARACIÓN DIRECTA\n";
      txt += "======================================================================\n";
      txt += "Liga Base: " + nombreLigaReporte + "\n";
      txt += "Torneo Edición: " + nombreTorneoReporte + "\n";
      txt += "Jornada: " + jornada.numero + "\n";
      txt += "Estado General: " + jornada.estado.toUpperCase() + "\n";
      txt += "======================================================================\n";
      txt += "Participante      " + filaPartidosHeader + "\n";
      txt += lineaDivisoria;

      // 4. Bucle asíncrono cruzado para inyectar las filas de los participantes
      for (const p of habilitadosParaReporte) {
        const nombreAmigo = usuariosMap[p.uid] || p.uid;
        const colNombre = nombreAmigo.substring(0, columnaNombreWidth).padEnd(columnaNombreWidth, " ");
        
        const pronosticosSnap = await getDocs(
          collection(db, "pronosticos", jornada.id, "participantes", p.uid, "partidos")
        );
        const proMap: { [partidoId: string]: any } = {};
        pronosticosSnap.docs.forEach(d => {
          proMap[d.id] = d.data();
        });

        let filaPronosticosCeldas = "";
        for (const partido of listaPartidos as any[]) {
          const proGuardado = proMap[partido.id];
          let celdaResultado = "  ?  "; // Valor por defecto si no hay registro
          
          if (
            proGuardado && 
            proGuardado.golesLocal !== "" && 
            proGuardado.golesVisitante !== "" && 
            proGuardado.golesLocal !== "-" && 
            proGuardado.golesVisitante !== "-" &&
            proGuardado.golesLocal !== undefined &&
            proGuardado.golesVisitante !== undefined
          ) {
            const golesL = proGuardado.golesLocal;
            const golesV = proGuardado.golesVisitante;
            celdaResultado = " " + golesL + "-" + golesV + " ";
          }
          
          filaPronosticosCeldas = filaPronosticosCeldas + " | " + celdaResultado.padEnd(7, " ");
        }

        txt += colNombre + filaPronosticosCeldas + "\n";
      }

      txt += lineaDivisoria;
      txt += "Generado automáticamente por el Sistema de Quinielas. Total: " + habilitadosParaReporte.length + " Amigos\n";
      txt += "======================================================================\n";

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const urlDescarga = URL.createObjectURL(blob);
      const enlaceHtml = document.createElement("a");
      enlaceHtml.href = urlDescarga;
      enlaceHtml.download = "pronosticos_jornada_" + jornada.numero + ".txt";
      document.body.appendChild(enlaceHtml);
      enlaceHtml.click();
      document.body.removeChild(enlaceHtml);
      URL.revokeObjectURL(urlDescarga);

      setMensaje("✅ Reporte .txt descargado exitosamente");
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al codificar el reporte de exportación");
    }
    setExportando(false);
  };

  const toggleHabilitar = async (pId: string, estadoActual: boolean) => {
    setMensaje("");
    try {
      const nuevoEstadoBool = !estadoActual;
      const ref = doc(db, "pronosticos", jornada.id, "participantes", pId);
      await updateDoc(ref, { deshabilitado: nuevoEstadoBool });
      setMensaje("✅ Permisos de acceso actualizados correctamente");
      setParticipantes(prev => prev.map(item => item.uid === pId ? { ...item, deshabilitado: nuevoEstadoBool } : item));
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al cambiar los permisos del participante en Firestore");
    }
  };
  const togglePago = async (pId: string, pagoActual: boolean) => {
    setMensaje("");
    try {
      const nuevoPagoBool = !pagoActual;
      const ref = doc(db, "pronosticos", jornada.id, "participantes", pId);
      await updateDoc(ref, { pagoRealizado: nuevoPagoBool });
      setParticipantes(prev => prev.map(item => item.uid === pId ? { ...item, pagoRealizado: nuevoPagoBool } : item));
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al guardar el estatus de pago en el servidor");
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Cargando participantes...</div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1a1a2e", color: "#fff" }}>
      {/* Barra de Encabezado */}
      <div style={{ backgroundColor: "#16213e", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>Jornada {jornada.numero} — Participantes Activos</div>
          <div style={{ color: "#888", fontSize: "12px" }}>Administra los accesos y cuotas recibidas de esta fecha</div>
        </div>
        <button onClick={onBack} style={{ backgroundColor: "transparent", border: "1px solid #888", color: "#888", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>← Volver</button>
      </div>

      <div style={{ padding: "20px" }}>
        {mensaje && <div style={{ backgroundColor: "#16213e", borderLeft: "4px solid #e94560", padding: "10px", marginBottom: "15px", borderRadius: "4px", fontSize: "14px" }}>{mensaje}</div>}

        {participantes.length === 0 ? (
          <div style={{ backgroundColor: "#16213e", borderRadius: "12px", padding: "30px", textAlign: "center", color: "#888" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
            <p>Ningún amigo ha ingresado pronósticos en esta jornada todavía.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            
            <button
              onClick={exportarTexto}
              disabled={exportando}
              style={{
                width: "100%", padding: "12px", backgroundColor: "#0f3460",
                color: "#fff", border: "1px solid #e94560", borderRadius: "8px",
                fontSize: "14px", fontWeight: "bold", cursor: "pointer", marginBottom: "6px"
              }}
            >
              {exportando ? "Generando Reporte..." : "📥 Exportar Pronósticos Habilitados (.txt)"}
            </button>

            {participantes.map((p) => {
              const estaDeshabilitado = p.deshabilitado === true;
              const tienePago = p.pagoRealizado === true;

              // Constantes de validación semántica sobre los avances del amigo
              const conteoLlenados = p.partidosLlenados || 0;
              const tieneTodoListo = conteoLlenados === totalPartidosJornada && totalPartidosJornada > 0;
              const noTieneNinguno = conteoLlenados === 0;

              return (
                <div key={p.uid} style={{
                  backgroundColor: estaDeshabilitado ? "#2a1a1a" : tienePago ? "#102a18" : "#16213e", 
                  borderRadius: "12px", 
                  padding: "10px 16px",
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  border: estaDeshabilitado ? "1px solid #ff4444" : tienePago ? "1px solid #4caf50" : "1px solid #333",
                  opacity: estaDeshabilitado ? 0.6 : 1,
                  boxShadow: tienePago ? "0 2px 8px rgba(76,175,80,0.1)" : "none"
                }}>
                  <div style={{ flex: 1, minWidth: "0" }}>
                    <div style={{ 
                      fontWeight: "bold", 
                      fontSize: "14px", 
                      color: estaDeshabilitado ? "#ff4444" : tienePago ? "#81c784" : "#fff",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {usuariosMap[p.uid] || p.uid}
                    </div>
                    
                    {/* MONITOR VISUAL INTEGRADO DE LLEVADO DE PARTIDOS EN LA SUB-LEYENDA */}
                    <div style={{ marginTop: "2px" }}>
                      {estaDeshabilitado ? (
                        <div style={{ color: "#888", fontSize: "11px" }}>🚫 Deshabilitado (Fuera de juego)</div>
                      ) : noTieneNinguno ? (
                        <div style={{ color: "#f87171", fontSize: "11px", fontWeight: "bold" }}>
                          🚨 Sin pronósticos (0 de {totalPartidosJornada})
                        </div>
                      ) : tieneTodoListo ? (
                        <div style={{ color: "#34d399", fontSize: "11px", fontWeight: "bold" }}>
                          ✅ Listo ({conteoLlenados} de {totalPartidosJornada})
                        </div>
                      ) : (
                        <div style={{ color: "#fbbf24", fontSize: "11px", fontWeight: "bold" }}>
                          ⚠️ Incompleto: Solo lleva {conteoLlenados} de {totalPartidosJornada}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {!estaDeshabilitado && (
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: tienePago ? "#81c784" : "#aaa", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={tienePago}
                          onChange={() => togglePago(p.uid, tienePago)}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#4caf50" }}
                        />
                        {tienePago ? "Pagó" : "Debe"}
                      </label>
                    )}

                    <button
                      onClick={() => toggleHabilitar(p.uid, estaDeshabilitado)}
                      style={{
                        backgroundColor: estaDeshabilitado ? "#1b5e20" : "#c62828",
                        color: "#fff", border: "none", borderRadius: "6px",
                        padding: "6px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "bold"
                      }}
                    >
                      {estaDeshabilitado ? "Habilitar" : "Banear"}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

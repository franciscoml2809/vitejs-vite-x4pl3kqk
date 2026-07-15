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

  useEffect(() => {
    const inicializar = async () => {
      try {
        const uSnap = await getDocs(collection(db, "usuarios"));
        const temporalMap: { [uid: string]: string } = {};
        uSnap.docs.forEach(d => {
          const data = d.data();
          temporalMap[data.uid] = data.nombre || data.email;
        });
        setUsuariosMap(temporalMap);

        const pSnap = await getDocs(collection(db, "pronosticos", jornada.id, "participantes"));
        const lista = pSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
        setParticipantes(lista);

        const tSnap = await getDocs(collection(db, "torneos"));
        const lSnap = await getDocs(collection(db, "ligas"));
        
        const torneoActual = tSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(t => t.id === jornada.torneoId);
        if (torneoActual) {
          setNombreTorneoReporte(torneoActual.nombre + " (" + (torneoActual.tipo === "regular" ? "Regular" : "Eliminatoria") + ")");
          const ligaActual = lSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(l => l.id === torneoActual.ligaId);
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

      let txt = "==================================================\n";
      txt += "        REPORTE OFICIAL DE PRONÓSTICOS\n";
      txt += "==================================================\n";
      txt += "Liga Base: " + nombreLigaReporte + "\n";
      txt += "Torneo Edición: " + nombreTorneoReporte + "\n";
      txt += "Jornada: " + jornada.numero + "\n";
      txt += "Estado General: " + jornada.estado.toUpperCase() + "\n";
      txt += "Total Participantes Habilitados: " + habilitadosParaReporte.length + "\n";
      txt += "==================================================\n\n";

      for (const p of habilitadosParaReporte) {
        const nombreAmigo = usuariosMap[p.uid] || p.uid;
        const estatusPago = p.pagoRealizado === true ? " [PAGADO]" : " [PAGO PENDIENTE]";
        
        txt += "--------------------------------------------------\n";
        txt += "PARTICIPANTE: " + nombreAmigo + estatusPago + "\n";
        txt += "Estado en Jornada: HABILITADO\n";
        txt += "--------------------------------------------------\n";

        const pronosticosSnap = await getDocs(
          collection(db, "pronosticos", jornada.id, "participantes", p.uid, "partidos")
        );
        const proMap: { [partidoId: string]: any } = {};
        pronosticosSnap.docs.forEach(d => {
          proMap[d.id] = d.data();
        });

        for (const partido of listaPartidos) {
          const proGuardado = proMap[partido.id];
          if (proGuardado) {
            txt += partido.local + " ( " + proGuardado.golesLocal + " ) vs ( " + proGuardado.golesVisitante + " ) " + partido.visitante + "\n";
          } else {
            txt += partido.local + " ( Sin registro ) vs ( Sin registro ) " + partido.visitante + "\n";
          }
        }
        txt += "\n";
      }

      txt += "==================================================\n";
      txt += "Generado automáticamente por el Sistema de Quinielas.\n";

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const urlDescarga = URL.createObjectURL(blob);
      const enlaceHtml = document.createElement("a");
      enlaceHtml.href = urlDescarga;
      enlaceHtml.download = "pronosticos_jornada_" + jornada.numero + ".txt";
      document.body.appendChild(enlaceHtml);
      enlaceHtml.click();
      document.body.removeChild(enlaceHtml);
      URL.revokeObjectURL(urlDescarga);

      setMensaje("✅ Archivo .txt descargado exitosamente");
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al icodificar el reporte de exportación");
    }
    setExportando(false);
  };
  // FUNCIÓN CORREGIDA: Remueve el error de la variable fantasma "actualizado"
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

  // NUEVA FUNCIÓN: Control asíncrono para registrar o remover la cuota de la jornada
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

            {/* Listado Interactivo Ooptimizado para el Administrador */}
            {participantes.map((p) => {
              const estaDeshabilitado = p.deshabilitado === true;
              const tienePago = p.pagoRealizado === true;

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
                  {/* Bloque Izquierdo: Nombre y Datos */}
                  <div style={{ flex: 1, minWidth: "0" }}>
                    <div style={{ 
                      fontWeight: "bold", 
                      fontSize: "14px", 
                      color: estaDeshabilitado ? "#ff4444" : tienePago ? "#81c784" : "#fff",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {usuariosMap[p.uid] || p.uid}
                    </div>
                    <div style={{ color: "#888", fontSize: "11px", marginTop: "2px" }}>
                      {estaDeshabilitado ? "🚫 Deshabilitado (Fuera de juego)" : tienePago ? "💰 Cuota Recibida (Ok)" : "⏳ Pago Pendiente"}
                    </div>
                  </div>

                  {/* Bloque Derecho: Controles Compactos Alineados */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {/* Checkbox de pago interactivo (Oculto si el usuario está deshabilitado) */}
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

                    {/* Botón Habilitar/Deshabilitar Miniatura Compacto */}
                    <button
                      onClick={() => toggleHabilitar(p.uid, estaDeshabilitado)}
                      style={{
                        backgroundColor: estaDeshabilitado ? "#1b5e20" : "#c62828",
                        color: "#fff", border: "none", borderRadius: "6px",
                        padding: "6px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "bold"
                      }}
                    >
                      {estaDeshabilitado ? "Habilitar" : "Baneas"}
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

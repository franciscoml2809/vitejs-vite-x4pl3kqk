import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Tabla() {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]); 
  const [ligas, setLigas] = useState<any[]>([]); 
  const [torneoSeleccionadoId, setTorneoSeleccionadoId] = useState<string>(""); 
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<any>(null);
  const [tabla, setTabla] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<{ [uid: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [loadingTabla, setLoadingTabla] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      // 1. Cargar las jornadas
      const jornadasSnap = await getDocs(
        query(collection(db, "jornadas"), orderBy("numero"))
      );
      const listaJornadas = jornadasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJornadas(listaJornadas);

      // 2. Cargar los torneos / ediciones disponibles
      let listaTorneos: any[] = [];
      try {
        const torneosSnap = await getDocs(
          query(collection(db, "torneos"), orderBy("nombre"))
        );
        listaTorneos = torneosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTorneos(listaTorneos);
      } catch (e) {
        console.error("Error al cargar torneos en Tabla", e);
      }

      // 3. Cargar las ligas base para saber a cuál pertenece cada torneo
      let listaLigas: any[] = [];
      try {
        const ligasSnap = await getDocs(
          query(collection(db, "ligas"), orderBy("nombre"))
        );
        listaLigas = ligasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLigas(listaLigas);
      } catch (e) {
        console.error("Error al cargar ligas en Tabla", e);
      }

      // 4. Forzar una edición que pertenezca a "Liga MX" como Torneo Inicial por Default
      const ligaMX = listaLigas.find(l => l.nombre.toLowerCase() === "liga mx");
      let torneoDefault = null;
      
      if (ligaMX) {
        torneoDefault = listaTorneos.find(t => t.ligaId === ligaMX.id);
      }
      
      let idTorneoInicial = torneoDefault ? torneoDefault.id : (listaTorneos[0]?.id || "");
      setTorneoSeleccionadoId(idTorneoInicial);

      // 5. Filtrar jornadas de ese torneo inicial para aplicar la preselección inteligente por fecha
      const jornadasDelTorneoInicial = listaJornadas.filter((j: any) => j.torneoId === idTorneoInicial);

      const hoy = new Date();
      let jDefault = jornadasDelTorneoInicial[0] || null;

      for (const j of jornadasDelTorneoInicial) {
        const fechaFin = new Date((j as any).fechaFin);
        const dosDispuesDelFin = new Date(fechaFin);
        dosDispuesDelFin.setDate(dosDispuesDelFin.getDate() + 2);
        if (hoy <= dosDispuesDelFin) {
          jDefault = j;
          break;
        }
      }
      setJornadaSeleccionada(jDefault);

      // 6. Cargar nombres de usuarios
      const usersSnap = await getDocs(collection(db, "usuarios"));
      const nombresMap: { [uid: string]: string } = {};
      usersSnap.docs.forEach(d => {
        const data = d.data();
        nombresMap[data.uid] = data.nombre || data.email;
      });
      setUsuarios(nombresMap);
      setLoading(false);
    };
    cargar();
  }, []);

  useEffect(() => {
    if (!jornadaSeleccionada) return;
    cargarTabla(jornadaSeleccionada.id);
  }, [jornadaSeleccionada]);

  const cargarTabla = async (jornadaId: string) => {
    setLoadingTabla(true);
    try {
      // AJUSTE CRÍTICO: Cambio de ruta a la colección oficial con espacios
      const posicionesSnap = await getDocs(
        collection(db, "tabla por jornada", jornadaId, "posiciones")
      );
      const lista = posicionesSnap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .sort((a: any, b: any) => b.totalPuntos - a.totalPuntos);
      setTabla(lista);
    } catch (e) {
      setTabla([]);
    }
    setLoadingTabla(false);
  };

  const jornadasFiltradas = jornadas.filter((j: any) => j.torneoId === torneoSeleccionadoId);

  const handleTorneoChange = (torneoId: string) => {
    setTorneoSeleccionadoId(torneoId);
    const jornadasDeEseTorneo = jornadas.filter((j: any) => j.torneoId === torneoId);
    if (jornadasDeEseTorneo.length > 0) {
      setJornadaSeleccionada(jornadasDeEseTorneo[0]);
    } else {
      setJornadaSeleccionada(null);
      setTabla([]);
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
      Cargando...
    </div>
  );

  const medallas = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h2 style={{ color: "#e94560", marginTop: 0, marginBottom: "14px" }}>Tabla de posiciones</h2>

      {/* Selector A: Filtrado por Torneo con Altura Optimizada */}
      <label style={{ display: "block", color: "#aaa", fontSize: "12px", marginBottom: "4px", fontWeight: "bold" }}>
        Seleccionar Torneo / Edición
      </label>
      <select
        value={torneoSeleccionadoId}
        onChange={(e) => handleTorneoChange(e.target.value)}
        style={{
          width: "100%", padding: "8px 12px", marginBottom: "12px",
          borderRadius: "6px", border: "1px solid #333",
          backgroundColor: "#0f3460", color: "#fff", fontSize: "14px"
        }}
      >
        <option value="">-- Elige un Torneo --</option>
        {torneos.map((t: any) => {
          const l = ligas.find(liga => liga.id === t.ligaId);
          return (
            <option key={t.id} value={t.id}>
              🏆 {l ? l.nombre + " — " : ""}{t.nombre}
            </option>
          );
        })}
      </select>

      {/* Selector B: Filtrado por Jornada con Altura Optimizada */}
      <label style={{ display: "block", color: "#aaa", fontSize: "12px", marginBottom: "4px", fontWeight: "bold" }}>
        Seleccionar Jornada
      </label>
      <select
        value={jornadaSeleccionada?.id || ""}
        onChange={(e) => {
          const j = jornadas.find((j: any) => j.id === e.target.value);
          setJornadaSeleccionada(j);
        }}
        disabled={jornadasFiltradas.length === 0}
        style={{
          width: "100%", padding: "8px 12px", marginBottom: "16px",
          borderRadius: "6px", border: "1px solid #333",
          backgroundColor: jornadasFiltradas.length === 0 ? "#222" : "#0f3460",
          color: jornadasFiltradas.length === 0 ? "#666" : "#fff", fontSize: "14px"
        }}
      >
        {jornadasFiltradas.length === 0 ? (
          <option value="">No hay jornadas en este torneo</option>
        ) : (
          jornadasFiltradas.map((j: any) => (
            <option key={j.id} value={j.id}>
              Jornada {j.numero} — {j.fechaInicio} al {j.fechaFin}
            </option>
          ))
        )}
      </select>
      {loadingTabla ? (
        <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
          Cargando tabla...
        </div>
      ) : tabla.length === 0 ? (
        <div style={{
          backgroundColor: "#16213e", borderRadius: "12px",
          padding: "20px", textAlign: "center", color: "#888"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏆</div>
          <p>Aún no hay puntos en esta jornada.</p>
        </div>
      ) : (
        tabla.map((entry: any, index: number) => {
          const esGanador = index === 0;

          return (
            <div key={entry.uid} style={{
              backgroundColor: esGanador ? "#1f1a10" : "#16213e", 
              borderRadius: "8px",
              padding: esGanador ? "12px 14px" : "8px 14px", 
              marginBottom: "6px",
              border: esGanador ? "2px solid #81c784" : "1px solid #333",
              display: "flex", 
              alignItems: "center", 
              gap: "12px",
              boxShadow: esGanador ? "0 4px 12px rgba(255, 215, 0, 0.15)" : "none"
            }}>
              {/* 1. Medalla o Posición */}
              <div style={{ 
                fontSize: esGanador ? "22px" : "18px", 
                minWidth: "26px", 
                textAlign: "center", 
                fontWeight: "bold" 
              }}>
                {medallas[index] || (index + 1)}
              </div>
              
              {/* 2. Contenedor Dinámico Interno */}
              <div style={{ 
                flex: 1, 
                display: "grid", 
                gridTemplateColumns: esGanador ? "1fr auto 1fr" : "1fr auto", 
                alignItems: "center",
                gap: "10px"
              }}>
                {/* Nombre y Datos del Usuario */}
                <div>
                  <div style={{ 
                    fontWeight: "bold", 
                    fontSize: esGanador ? "15px" : "14px",
                    color: esGanador ? "#81c784" : "#fff" 
                  }}>
                    {usuarios[entry.uid] || entry.uid}
                  </div>
                  <div style={{ color: esGanador ? "#4caf50" : "#777", fontSize: "11px", marginTop: "1px" }}>
                    Jornada {jornadaSeleccionada?.numero}
                  </div>
                </div>

                {/* 3. LEYENDA GANADOR: Centrada horizontalmente en la tarjeta */}
                {esGanador && (
                  <div style={{ textAlign: "center" }}>
                    <span style={{
                      backgroundColor: "#81c784", 
                      color: "#000", 
                      fontSize: "9px", 
                      fontWeight: "black",
                      padding: "3px 8px", 
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}>
                      👑 Ganador
                    </span>
                  </div>
                )}
                
                {/* 4. Puntuación */}
                <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "3px", justifyContent: "flex-end" }}>
                  <div style={{
                    fontSize: esGanador ? "22px" : "18px", 
                    fontWeight: "bold",
                    color: esGanador ? "#81c784" : "#fff"
                  }}>
                    {entry.totalPuntos}
                  </div>
                  <div style={{ color: esGanador ? "#81c784" : "#777", fontSize: "11px" }}>pts</div>
                </div>
              </div>

            </div>
          );
        })
      )}
    </div>
  );
}
      
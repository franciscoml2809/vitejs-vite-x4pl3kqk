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

  // Estados críticos para la lógica de empates múltiples en el liderato
  const [puntajeMaximo, setPuntajeMaximo] = useState<number>(0);
  const [conteoGanadores, setConteoGanadores] = useState<number>(0);
  useEffect(() => {
    const cargar = async () => {
      const jornadasSnap = await getDocs(
        query(collection(db, "jornadas"), orderBy("numero"))
      );
      const listaJornadas = jornadasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJornadas(listaJornadas);

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

      const ligaMX = listaLigas.find(l => l.nombre.toLowerCase() === "liga mx");
      let torneoDefault = null;
      if (ligaMX) {
        torneoDefault = listaTorneos.find(t => t.ligaId === ligaMX.id);
      }
      
      // Corregido: Acceso seguro al índice cero sin romper el compilador
      let idTorneoInicial = torneoDefault ? torneoDefault.id : (listaTorneos[0]?.id || "");
      setTorneoSeleccionadoId(idTorneoInicial);

      const jornadasDelTorneoInicial = listaJornadas.filter((j: any) => j.torneoId === idTorneoInicial);
      const hoy = new Date();
      
      // Corregido: Asignación por defecto al índice cero de la jornada
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
      const posicionesSnap = await getDocs(
        collection(db, "tabla por jornada", jornadaId, "posiciones")
      );
      const lista = posicionesSnap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .sort((a: any, b: any) => b.totalPuntos - a.totalPuntos);
      
      // Corregido: Extracción del puntaje más alto leyendo la primera posición real del array
      if (lista.length > 0) {
        const maxPts = (lista[0] as any).totalPuntos;
        const totalEmpatados = lista.filter((p: any) => p.totalPuntos === maxPts).length;
        setPuntajeMaximo(maxPts);
        setConteoGanadores(totalEmpatados);
      } else {
        setPuntajeMaximo(0);
        setConteoGanadores(0);
      }
      setTabla(lista);
    } catch (e) {
      setTabla([]);
      setPuntajeMaximo(0);
      setConteoGanadores(0);
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
          // Evaluación inclusiva por puntaje y no por índice ciego
          const esGanador = entry.totalPuntos === puntajeMaximo && puntajeMaximo > 0;
          const textoInsignia = conteoGanadores > 1 ? "👑 Ganador (Empate)" : "👑 Ganador";

          return (
            <div key={entry.uid} style={{
              backgroundColor: esGanador ? "#064e3b" : "#16213e", 
              borderRadius: "8px",
              padding: esGanador ? "12px 14px" : "8px 14px", 
              marginBottom: "6px",
              border: esGanador ? "2px solid #10b981" : "1px solid #333",
              display: "flex", 
              alignItems: "center", 
              gap: "12px",
              boxShadow: esGanador ? "0 4px 12px rgba(16, 185, 129, 0.15)" : "none"
            }}>
              <div style={{ 
                fontSize: esGanador ? "22px" : "18px", 
                minWidth: "26px", 
                textAlign: "center", 
                fontWeight: "bold" 
              }}>
                {medallas[index] || (index + 1)}
              </div>
              
              <div style={{ 
                flex: 1, 
                display: "grid", 
                gridTemplateColumns: esGanador ? "1fr auto 1fr" : "1fr auto", 
                alignItems: "center",
                gap: "10px"
              }}>
                <div>
                  <div style={{ 
                    fontWeight: "bold", 
                    fontSize: esGanador ? "15px" : "14px",
                    color: esGanador ? "#34d399" : "#fff" 
                  }}>
                    {usuarios[entry.uid] || entry.uid}
                  </div>
                  <div style={{ color: esGanador ? "#10b981" : "#777", fontSize: "11px", marginTop: "1px" }}>
                    Jornada {jornadaSeleccionada?.numero}
                  </div>
                </div>

                {esGanador && (
                  <div style={{ textAlign: "center", display: "grid" }}>
                    <span style={{
                      backgroundColor: "#10b981", 
                      color: "#fff", 
                      fontSize: "9px", 
                      fontWeight: "black",
                      padding: "3px 8px", 
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}>
                      {textoInsignia}
                    </span>
                  </div>
                )}
                
                <div style={{ textAlign: "right", display: "flex", alignItems: "baseline", gap: "3px", justifyContent: "flex-end" }}>
                  <div style={{
                    fontSize: esGanador ? "22px" : "18px", 
                    fontWeight: "bold",
                    color: esGanador ? "#34d399" : "#fff"
                  }}>
                    {entry.totalPuntos}
                  </div>
                  <div style={{ color: esGanador ? "#34d399" : "#777", fontSize: "11px" }}>pts</div>
                </div>
              </div>

            </div>
          );
        })
      )}
    </div>
  );
}

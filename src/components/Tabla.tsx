import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Tabla() {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]); 
  const [ligas, setLigas] = useState<any[]>([]); // Estado añadido para guardar las ligas base
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
        // Buscamos un torneo amarrado a la Liga MX (ej: Apertura o Clausura)
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
      const posicionesSnap = await getDocs(
        collection(db, "tablaPorJornada", jornadaId, "posiciones")
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
      <h2 style={{ color: "#e94560", marginTop: 0 }}>Tabla de posiciones</h2>

      {/* Selector A: Filtrado por Torneo / Edición */}
      <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px", fontWeight: "bold" }}>
        Seleccionar Torneo / Edición
      </label>
      <select
        value={torneoSeleccionadoId}
        onChange={(e) => handleTorneoChange(e.target.value)}
        style={{
          width: "100%", padding: "12px", marginBottom: "16px",
          borderRadius: "8px", border: "1px solid #333",
          backgroundColor: "#0f3460", color: "#fff", fontSize: "15px"
        }}
      >
        <option value="">-- Elige un Torneo --</option>
        {torneos.map((t: any) => {
          const l = ligas.find(liga => liga.id === t.ligaId);
          return (
            <option key={t.id} value={t.id}>
              🏆 {l ? l.nombre + " — " : ""}{t.nombre} ({t.tipo === "regular" ? "Regular" : "Eliminatoria"})
            </option>
          );
        })}
      </select>

      {/* Selector B: Filtrado por Jornada */}
      <label style={{ display: "block", color: "#aaa", fontSize: "13px", marginBottom: "6px", fontWeight: "bold" }}>
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
          width: "100%", padding: "12px", marginBottom: "24px",
          borderRadius: "8px", border: "1px solid #333",
          backgroundColor: jornadasFiltradas.length === 0 ? "#222" : "#0f3460",
          color: jornadasFiltradas.length === 0 ? "#666" : "#fff", fontSize: "15px"
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
        tabla.map((entry: any, index: number) => (
          <div key={entry.uid} style={{
            backgroundColor: "#16213e", borderRadius: "12px",
            padding: "16px", marginBottom: "10px",
            border: index === 0 ? "1px solid #e94560" : "1px solid #333",
            display: "flex", alignItems: "center", gap: "14px"
          }}>
            <div style={{ fontSize: "24px", minWidth: "32px", textAlign: "center" }}>
              {medallas[index] || (index + 1)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "15px" }}>
                {usuarios[entry.uid] || entry.uid}
              </div>
              <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                Jornada {jornadaSeleccionada?.numero}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: "22px", fontWeight: "bold",
                color: index === 0 ? "#e94560" : "#fff"
              }}>
                {entry.totalPuntos}
              </div>
              <div style={{ color: "#888", fontSize: "11px" }}>pts</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

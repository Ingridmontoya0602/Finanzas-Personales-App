import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const SHEET = {
  rosa: "#F4CCCC",
  rosaBorde: "#CC0000",
  verde: "#D9EAD3",
  verdeBorde: "#38761D",
  amarillo: "#FFF2CC",
  amarilloBorde: "#BF9000",
  azul: "#C9DAF8",
  azulBorde: "#3C78D8",
  gris: "#F3F3F3",
  grisBorde: "#999999",
  rojo: "#FF0000",
  texto: "#000000",
  fuente: "Calibri, 'Segoe UI', Arial, sans-serif"
};

const DEFAULT_CATALOG = {
  metodos: ["Efectivo", "TDC", "TDD"],
  cuentas: {
    Efectivo: ["Cartera"],
    TDC: [],
    TDD: []
  },
  lugares: [],
  tipos: ["G. Fijo", "G. Variable", "Préstamo", "Familia", "Inversión", "Ahorro", "Otro(a)", "Pago TDC"],
  categorias: {
    "G. Fijo": ["Seguros", "Membresías", "Servicios"],
    "G. Variable": ["Comidas", "Compras Online", "Educación", "Entretenimiento", "Gastos Personales", "Intereses TDC", "Mascotas", "Otro(a)", "Regalos y Festejos", "Ropa y Accesorios", "Salud y Bienestar", "Supermercado", "Tecnología", "Tienda de Conveniencia", "Transporte", "Viajes y Vacaciones", "Vivienda"],
    "Préstamo": ["Bancario", "Crédito", "de Tercero", "a Tercero"],
    "Familia": ["Aportación", "Pago TDC Familiar"],
    "Inversión": [],
    "Ahorro": ["Viaje", "Tecnología", "Entretenimiento", "Transporte", "Casa/Hogar"],
    "Otro(a)": ["Otro(a)"],
    "Pago TDC": []
  },
  subcategorias: {
    "Seguros": [],
    "Membresías": [],
    "Servicios": [],
    "Aportación": [],
    "Pago TDC Familiar": [],
    "Comidas": ["Domicilio", "Restaurante", "Otro(a)"],
    "Compras Online": ["Amazon", "Mercado Libre", "Ebay", "Otro(a)"],
    "Educación": ["Colegiatura", "Utiles", "Otro(a)"],
    "Entretenimiento": ["Cine", "Conciertos", "Juguetes", "Otro(a)"],
    "Gastos Personales": ["Donaciones", "Clases", "Otro(a)"],
    "Intereses TDC": ["1. enero", "2. febrero", "3. marzo", "4. abril", "5. mayo", "6. junio", "7. julio", "8. agosto", "9. septiembre", "10. octubre", "11. noviembre", "12. diciembre"],
    "Mascotas": ["Alimentación", "Otro(a)", "Estancia (Hotel)"],
    "Regalos y Festejos": ["Otro(a)"],
    "Ropa y Accesorios": ["Otro(a)"],
    "Salud y Bienestar": ["Consulta", "Farmacia", "Otro(a)"],
    "Supermercado": ["Otro(a)"],
    "Tecnología": ["Apps", "PC", "Otro(a)"],
    "Tienda de Conveniencia": ["Otro(a)"],
    "Transporte": ["Gasolina", "Taller", "Uber", "Tenencia", "Refrendo", "Estacionamiento", "Casetas", "Otro(a)"],
    "Viajes y Vacaciones": ["Hospedaje", "Transporte", "Comida", "Compras", "Otro(a)"],
    "Vivienda": ["Otro(a)"],
    "Bancario": [],
    "Crédito": [],
    "de Tercero": [],
    "a Tercero": []
  },
  ingresoTipos: ["Sueldo", "Comisión", "Préstamo", "Reembolso", "Otro(a)"],
  ingresoSub: {
    "Sueldo": [],
    "Comisión": [],
    "Préstamo": ["Bancario", "de Tercero", "a Tercero"],
    "Reembolso": ["TDC", "TDD"],
    "Otro(a)": ["Otro(a)"]
  },
  presupuestos: {
    "Comidas": 0, "Compras Online": 0, "Educación": 0, "Entretenimiento": 0,
    "Gastos Personales": 0, "Intereses TDC": 0, "Mascotas": 0, "Otro(a)": 0,
    "Regalos y Festejos": 0, "Ropa y Accesorios": 0, "Salud y Bienestar": 0,
    "Supermercado": 0, "Tecnología": 0, "Tienda de Conveniencia": 0,
    "Transporte": 0, "Viajes y Vacaciones": 0, "Vivienda": 0
  },
  membresias: [],
  seguros: [],
  servicios: [],
  prestamosBancarios: [],
  prestamosTerceros: [],
  familiares: [],
  diferidos: [],
  ahorros: [],
  inversiones: [],
  _bannerVisto: false
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function monthLabel(iso) {
  const [y, m] = iso.split("-");
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return meses[parseInt(m, 10) - 1] + " " + y;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d}-${meses[parseInt(m, 10) - 1]}-${y}`;
}

function mismoMes(isoA, isoB) {
  if (!isoA || !isoB) return false;
  return isoA.slice(0, 7) === isoB.slice(0, 7);
}

function tocaPagarEsteMes(membresia, hoyISO = todayISO()) {
  if (!membresia.activa) return false;
  if (mismoMes(membresia.ultimoPago, hoyISO)) return false;
  if (membresia.frecuencia === "Mensual") return true;
  if (membresia.frecuencia === "Anual") {
    if (!membresia.ultimoPago) return true;
    const [y, m] = membresia.ultimoPago.split("-").map(Number);
    const ultima = new Date(y, m - 1, 1);
    const hoy = new Date(hoyISO.slice(0, 4) * 1, hoyISO.slice(5, 7) * 1 - 1, 1);
    const mesesTranscurridos = (hoy.getFullYear() - ultima.getFullYear()) * 12 + (hoy.getMonth() - ultima.getMonth());
    return mesesTranscurridos >= 11;
  }
  return false;
}

const cardBase = { background: "#fff", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "12px 14px" };

const labelStyle = {
  display: "block", fontSize: 12, fontStyle: "italic", fontWeight: 700,
  color: SHEET.texto, marginBottom: 4, fontFamily: SHEET.fuente
};

const inputBase = {
  width: "100%", boxSizing: "border-box", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
  borderRadius: 2, padding: "8px 10px", fontSize: 14, background: "#fff", color: SHEET.texto
};

function HeaderBand({ children, color, borderColor }) {
  return (
    <div style={{
      background: color, border: `1px solid ${borderColor}`, borderRadius: 4, padding: "10px 14px",
      fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, fontSize: 15,
      color: SHEET.texto, textAlign: "center"
    }}>
      {children}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ ...labelStyle, color: error ? SHEET.rosaBorde : SHEET.texto }}>
        {label}{error ? " *" : ""}
      </label>
      {children}
      {error && <p style={{ fontSize: 11, color: SHEET.rosaBorde, margin: "3px 0 0", fontStyle: "italic" }}>Falta llenar este campo</p>}
    </div>
  );
}

function Btn({ children, onClick, primary, full, style, type }) {
  const base = {
    padding: "10px 16px", borderRadius: 3, fontSize: 14, fontWeight: 700, fontStyle: "italic",
    fontFamily: SHEET.fuente, cursor: "pointer", border: "1px solid " + SHEET.grisBorde,
    background: "#fff", color: SHEET.texto, width: full ? "100%" : "auto", ...style
  };
  if (primary) { base.background = SHEET.verde; base.border = "1px solid " + SHEET.verdeBorde; }
  return <button type={type || "button"} onClick={onClick} style={base}>{children}</button>;
}

function LoginScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else setMsg("Cuenta creada. Revisa tu correo para confirmar antes de entrar.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 380, margin: "60px auto", fontFamily: SHEET.fuente, padding: "0 16px" }}>
      <h2 style={{ textAlign: "center", fontStyle: "italic", fontWeight: 700 }}>Finanzas Personales</h2>
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
        <HeaderBand color={mode === "signin" ? SHEET.azul : SHEET.verde} borderColor={mode === "signin" ? SHEET.azulBorde : SHEET.verdeBorde}>
          {mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
        </HeaderBand>
        <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "14px" }}>
          <Field label="Correo">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputBase} />
          </Field>
          <Field label="Contraseña">
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputBase} />
          </Field>
          {msg && <p style={{ fontSize: 12, color: SHEET.rosaBorde, fontStyle: "italic" }}>{msg}</p>}
          <Btn type="submit" primary full style={{ marginTop: 6 }}>
            {loading ? "Cargando..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Btn>
        </form>
      </div>
      <p style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>
        {mode === "signin" ? (
          <>¿No tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setMsg(""); }}>Crear una</a></>
        ) : (
          <>¿Ya tienes cuenta? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setMsg(""); }}>Iniciar sesión</a></>
        )}
      </p>
    </div>
  );
}

function TabBar({ tab, setTab, onLogout }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const tabs = [
    { id: "registrar", label: "Registro", icon: "+" },
    { id: "resumen", label: "Reporte", icon: "▤" },
    { id: "historial", label: "Historial", icon: "≡" }
  ];
  const menuItems = [
    { id: "diferidos", label: "Diferidos TDC" },
    { id: "membresias", label: "Membresías" },
    { id: "servicios", label: "Servicios" },
    { id: "seguros", label: "Seguros" },
    { id: "prestamos", label: "Préstamos" },
    { id: "familia", label: "Familia" },
    { id: "ahorro", label: "Ahorro" },
    { id: "inversion", label: "Inversión" },
    { id: "catalogos", label: "Datos" }
  ];
  const enMenu = menuItems.some((m) => m.id === tab);

  function irA(id) {
    setTab(id);
    setMenuAbierto(false);
  }

  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 4, position: "sticky", top: 0, background: SHEET.gris, zIndex: 5, padding: "6px 4px", borderRadius: 4, border: "1px solid " + SHEET.grisBorde }}>
        <button onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menú" title="Más opciones" style={{
          padding: "8px 10px", background: menuAbierto || enMenu ? SHEET.amarillo : "transparent",
          border: menuAbierto || enMenu ? `1px solid ${SHEET.amarilloBorde}` : "1px solid transparent", borderRadius: 3,
          color: SHEET.texto, fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1
        }}>☰</button>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => irA(t.id)} style={{
            flex: 1, padding: "8px 4px", background: tab === t.id ? SHEET.amarillo : "transparent",
            border: tab === t.id ? `1px solid ${SHEET.amarilloBorde}` : "1px solid transparent", borderRadius: 3,
            color: SHEET.texto, fontSize: 12, fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, cursor: "pointer"
          }}>
            {t.label}
          </button>
        ))}
        <button onClick={onLogout} title="Cerrar sesión" style={{
          padding: "8px 10px", background: "transparent", border: "1px solid transparent", borderRadius: 3,
          color: SHEET.rosaBorde, fontSize: 12, fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, cursor: "pointer"
        }}>
          Salir
        </button>
      </div>
      {menuAbierto && (
        <div style={{
          position: "absolute", top: "100%", left: 4, marginTop: 4, zIndex: 6, minWidth: 180,
          background: "#fff", border: "1px solid " + SHEET.grisBorde, borderRadius: 4,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden"
        }}>
          {menuItems.map((m) => (
            <button key={m.id} onClick={() => irA(m.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
              background: tab === m.id ? SHEET.amarillo : "#fff", border: "none",
              borderBottom: "1px solid " + SHEET.gris, color: SHEET.texto,
              fontSize: 13, fontWeight: 700, fontStyle: "italic", fontFamily: SHEET.fuente, cursor: "pointer"
            }}>
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RegistrarTab({ catalog, addMovimiento, addDiferido }) {
  const [mov, setMov] = useState("Egreso");
  const [metodo, setMetodo] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [ingresoTipo, setIngresoTipo] = useState("");
  const [ingresoSub, setIngresoSub] = useState("");
  const [ingresoPersonaTercero, setIngresoPersonaTercero] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [cantidad, setCantidad] = useState("");
  const [esDiferido, setEsDiferido] = useState(false);
  const [plazoMeses, setPlazoMeses] = useState("");
  const [nombreDiferido, setNombreDiferido] = useState("");
  const [pagosPrevios, setPagosPrevios] = useState("");
  const [pagadoPrevio, setPagadoPrevio] = useState("");
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const cuentasDisponibles = catalog.cuentas[metodo] || [];
  const categoriasDisponibles = catalog.categorias[tipo] || [];
  const subcatsDisponibles = catalog.subcategorias[categoria] || [];
  const ingresoSubsDisponibles = catalog.ingresoSub[ingresoTipo] || [];

  useEffect(() => { setCuenta(""); }, [metodo]);
  useEffect(() => { setCategoria(""); }, [tipo]);
  useEffect(() => { setSubcategoria(""); }, [categoria]);
  useEffect(() => { setIngresoSub(""); }, [ingresoTipo]);
  useEffect(() => { setIngresoPersonaTercero(""); }, [ingresoSub]);
  useEffect(() => { if (metodo !== "TDC") setEsDiferido(false); }, [metodo]);
  useEffect(() => { if (mov !== "Egreso") setEsDiferido(false); }, [mov]);
  useEffect(() => { setPagosPrevios(""); setPagadoPrevio(""); }, [plazoMeses]);

  function reset() {
    setMetodo(""); setCuenta(""); setTipo(""); setCategoria(""); setSubcategoria("");
    setIngresoTipo(""); setIngresoSub(""); setIngresoPersonaTercero(""); setDescripcion(""); setLugar(""); setCantidad("");
    setFecha(todayISO()); setErrors({}); setEsDiferido(false); setPlazoMeses(""); setNombreDiferido("");
    setPagosPrevios(""); setPagadoPrevio("");
  }

  function validate() {
    const errs = {};
    if (!cantidad || parseFloat(cantidad) <= 0) errs.cantidad = true;
    if (!metodo) errs.metodo = true;
    if (!cuenta) errs.cuenta = true;
    if (!fecha) errs.fecha = true;
    if (esDiferido) {
      if (!plazoMeses || parseInt(plazoMeses) <= 0) errs.plazoMeses = true;
      if (!categoria) errs.categoria = true;
    } else if (mov === "Egreso") {
      if (!tipo) errs.tipo = true;
      if (!categoria) errs.categoria = true;
      if (subcatsDisponibles.length > 0 && !subcategoria) errs.subcategoria = true;
    } else {
      if (!ingresoTipo) errs.ingresoTipo = true;
      if (ingresoSubsDisponibles.length > 0 && !ingresoSub) errs.ingresoSub = true;
      if (ingresoTipo === "Préstamo" && (ingresoSub === "de Tercero" || ingresoSub === "a Tercero") &&
        (catalog.subcategorias[ingresoSub] || []).length > 0 && !ingresoPersonaTercero) errs.ingresoPersonaTercero = true;
    }
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const amt = parseFloat(cantidad);
    if (esDiferido) {
      const plazo = parseInt(plazoMeses);
      await addDiferido({
        nombre: nombreDiferido, tarjeta: cuenta, categoria, subcategoria, descripcion,
        costoTotal: amt, plazoMeses: plazo, inicio: fecha,
        pagosPrevios: pagosPrevios ? parseInt(pagosPrevios) : 0,
        pagadoPrevio: pagadoPrevio ? parseFloat(pagadoPrevio) : 0
      });
    } else {
      const entry = {
        mov, metodo, cuenta,
        tipo: mov === "Egreso" ? tipo : ingresoTipo,
        categoria: mov === "Egreso" ? categoria : ingresoSub,
        subcategoria: mov === "Egreso" ? subcategoria : (ingresoPersonaTercero || ""),
        descripcion, lugar, fecha, cantidad: amt
      };
      await addMovimiento(entry);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  const bandColor = mov === "Egreso" ? SHEET.rosa : SHEET.verde;
  const bandBorder = mov === "Egreso" ? SHEET.rosaBorde : SHEET.verdeBorde;

  function selStyle(hasError) {
    return { ...inputBase, background: "#fff", border: hasError ? `2px solid ${SHEET.rojo}` : "1px solid " + SHEET.grisBorde };
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => { setMov("Egreso"); setErrors({}); }} style={{
          flex: 1, padding: "10px", borderRadius: 4, fontSize: 14, fontWeight: 700, fontStyle: "italic", cursor: "pointer", fontFamily: SHEET.fuente,
          border: mov === "Egreso" ? `2px solid ${SHEET.rosaBorde}` : "1px solid " + SHEET.grisBorde,
          background: mov === "Egreso" ? SHEET.rosa : "#fff", color: SHEET.texto
        }}>Egreso</button>
        <button onClick={() => { setMov("Ingreso"); setErrors({}); }} style={{
          flex: 1, padding: "10px", borderRadius: 4, fontSize: 14, fontWeight: 700, fontStyle: "italic", cursor: "pointer", fontFamily: SHEET.fuente,
          border: mov === "Ingreso" ? `2px solid ${SHEET.verdeBorde}` : "1px solid " + SHEET.grisBorde,
          background: mov === "Ingreso" ? SHEET.verde : "#fff", color: SHEET.texto
        }}>Ingreso</button>
      </div>

      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
        <HeaderBand color={bandColor} borderColor={bandBorder}>{mov}</HeaderBand>
        <div style={{ padding: "12px 14px", background: "#fff" }}>
          <Field label={mov === "Egreso" ? "Origen" : "Destino"} error={errors.metodo}>
            <select value={metodo} onChange={(e) => { setMetodo(e.target.value); setErrors((p) => ({ ...p, metodo: false })); }} style={selStyle(errors.metodo)}>
              <option value="">Selecciona...</option>
              {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="Cuenta" error={errors.cuenta}>
            <select value={cuenta} onChange={(e) => { setCuenta(e.target.value); setErrors((p) => ({ ...p, cuenta: false })); }} style={selStyle(errors.cuenta)} disabled={!metodo}>
              <option value="">{metodo ? "Selecciona..." : "Primero elige Origen"}</option>
              {cuentasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          {mov === "Egreso" && metodo === "TDC" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, padding: "8px 10px", background: SHEET.gris, borderRadius: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>¿Deseas agregar un diferido?</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setEsDiferido(true)} style={{
                  padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                  border: esDiferido ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                  background: esDiferido ? SHEET.azul : "#fff"
                }}>Sí</button>
                <button onClick={() => setEsDiferido(false)} style={{
                  padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                  border: !esDiferido ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                  background: !esDiferido ? SHEET.azul : "#fff"
                }}>No</button>
              </div>
            </div>
          )}


          {esDiferido ? (
            <>
              <Field label="Nombre del diferido (opcional)">
                <input type="text" value={nombreDiferido} onChange={(e) => setNombreDiferido(e.target.value)} style={inputBase} placeholder="Ej. iPhone nuevo, Viaje Cancún" />
              </Field>
              <Field label="Categoría" error={errors.categoria}>
                <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setErrors((p) => ({ ...p, categoria: false })); }} style={selStyle(errors.categoria)}>
                  <option value="">Selecciona...</option>
                  {Object.keys(catalog.subcategorias).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {categoria && (catalog.subcategorias[categoria] || []).length > 0 && (
                <Field label="Subcategoría" error={errors.subcategoria}>
                  <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} style={selStyle(false)}>
                    <option value="">Selecciona...</option>
                    {(catalog.subcategorias[categoria] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Plazo (meses)" error={errors.plazoMeses}>
                <input type="number" inputMode="numeric" placeholder="Ej. 6" value={plazoMeses}
                  onChange={(e) => { setPlazoMeses(e.target.value); setErrors((p) => ({ ...p, plazoMeses: false })); }}
                  style={selStyle(errors.plazoMeses)} />
              </Field>
              {plazoMeses && parseInt(plazoMeses) > 1 && (
                <>
                  <Field label="¿Ya venías pagando este diferido? (opcional)">
                    <select value={pagosPrevios} onChange={(e) => {
                      const n = e.target.value;
                      setPagosPrevios(n);
                      const mensualidad = cantidad && parseFloat(cantidad) > 0 && parseInt(plazoMeses) > 0
                        ? parseFloat(cantidad) / parseInt(plazoMeses) : 0;
                      setPagadoPrevio(n ? String(Math.round(mensualidad * parseInt(n) * 100) / 100) : "");
                    }} style={inputBase}>
                      <option value="">No, es nuevo — empiezo desde el pago 1</option>
                      {Array.from({ length: parseInt(plazoMeses) - 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>Ya pagué {n} mensualidad{n > 1 ? "es" : ""} antes de usar la app</option>
                      ))}
                    </select>
                  </Field>
                  {pagosPrevios && (
                    <Field label="Monto total ya pagado">
                      <input type="number" inputMode="decimal" value={pagadoPrevio} onChange={(e) => setPagadoPrevio(e.target.value)} style={inputBase} />
                      <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                        Te sugerimos este monto, pero puedes ajustarlo si pagaste distinto. Esto no se contará como gasto del mes, solo actualiza el avance del diferido.
                      </p>
                    </Field>
                  )}
                </>
              )}
            </>
          ) : mov === "Egreso" ? (
            <>
              <Field label="Tipo" error={errors.tipo}>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setErrors((p) => ({ ...p, tipo: false })); }} style={selStyle(errors.tipo)}>
                  <option value="">Selecciona...</option>
                  {catalog.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Categoría" error={errors.categoria}>
                <select value={categoria} onChange={(e) => {
                  const v = e.target.value;
                  setCategoria(v);
                  setErrors((p) => ({ ...p, categoria: false }));
                  if (tipo === "Ahorro") {
                    const aho = (catalog.ahorros || []).find((a) => a.nombre === v);
                    if (aho) setCantidad(String(aho.aportacion));
                  } else if (tipo === "Inversión") {
                    const inv = (catalog.inversiones || []).find((i) => i.nombre === v);
                    if (inv) setCantidad(String(inv.aportacion));
                  }
                }} style={selStyle(errors.categoria)} disabled={!tipo}>
                  <option value="">{tipo ? "Selecciona..." : "Primero elige Tipo"}</option>
                  {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {((tipo === "Ahorro" && (catalog.ahorros || []).some((a) => a.nombre === categoria)) ||
                  (tipo === "Inversión" && (catalog.inversiones || []).some((i) => i.nombre === categoria))) && categoria && (
                  <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                    Te puse la aportación registrada en Cantidad — puedes ajustarla si metiste distinto.
                  </p>
                )}
                {tipo === "Préstamo" && (categoria === "de Tercero" || categoria === "a Tercero") && (
                  <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                    {categoria === "a Tercero" ? "Egreso = le prestaste más dinero a esta persona." : "Egreso = le abonaste / pagaste lo que le debías."}
                  </p>
                )}
              </Field>
              {categoria && subcatsDisponibles.length > 0 && (
                <Field label="Subcategoría" error={errors.subcategoria}>
                  <select value={subcategoria} onChange={(e) => {
                    const v = e.target.value;
                    setSubcategoria(v);
                    setErrors((p) => ({ ...p, subcategoria: false }));
                    if (categoria === "Membresías") {
                      const mem = (catalog.membresias || []).find((m) => m.nombre === v);
                      if (mem) setCantidad(String(mem.costo));
                    } else if (categoria === "Servicios") {
                      const serv = (catalog.servicios || []).find((s) => s.nombre === v);
                      if (serv && !serv.esVariable) setCantidad(String(serv.costo));
                    } else if (categoria === "Seguros") {
                      const seg = (catalog.seguros || []).find((s) => s.nombre === v);
                      if (seg) setCantidad(String(seg.costo));
                    } else if (categoria === "Bancario" || categoria === "Crédito") {
                      const prb = (catalog.prestamosBancarios || []).find((p) => p.nombre === v);
                      if (prb) setCantidad(String(prb.pagoPeriodo || ""));
                    } else if (categoria === "Aportación") {
                      const fam = (catalog.familiares || []).find((f) => f.nombre === v);
                      if (fam && fam.aportacion) setCantidad(String(fam.aportacion));
                    }
                  }} style={selStyle(errors.subcategoria)}>
                    <option value="">Selecciona...</option>
                    {subcatsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {((categoria === "Membresías" && (catalog.membresias || []).some((m) => m.nombre === subcategoria)) ||
                    (categoria === "Servicios" && (catalog.servicios || []).some((s) => s.nombre === subcategoria && !s.esVariable)) ||
                    (categoria === "Seguros" && (catalog.seguros || []).some((s) => s.nombre === subcategoria)) ||
                    ((categoria === "Bancario" || categoria === "Crédito") && (catalog.prestamosBancarios || []).some((p) => p.nombre === subcategoria)) ||
                    (categoria === "Aportación" && (catalog.familiares || []).some((f) => f.nombre === subcategoria && f.aportacion))) && subcategoria && (
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                      Te puse el monto registrado en Cantidad — puedes ajustarlo si pagaste distinto.
                    </p>
                  )}
                  {categoria === "Pago TDC Familiar" && subcategoria && (
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                      Pago a TDC es de monto libre — captura el total que pagaste este mes.
                    </p>
                  )}
                  {categoria === "Servicios" && (catalog.servicios || []).some((s) => s.nombre === subcategoria && s.esVariable) && (
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                      Este servicio es de monto variable — captura el total que pagaste este mes en Cantidad.
                    </p>
                  )}
                </Field>
              )}
            </>
          ) : (
            <>
              <Field label="Tipo" error={errors.ingresoTipo}>
                <select value={ingresoTipo} onChange={(e) => { setIngresoTipo(e.target.value); setErrors((p) => ({ ...p, ingresoTipo: false })); }} style={selStyle(errors.ingresoTipo)}>
                  <option value="">Selecciona...</option>
                  {catalog.ingresoTipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              {ingresoTipo && ingresoSubsDisponibles.length > 0 && (
                <Field label="Detalle" error={errors.ingresoSub}>
                  <select value={ingresoSub} onChange={(e) => { setIngresoSub(e.target.value); setErrors((p) => ({ ...p, ingresoSub: false })); }} style={selStyle(errors.ingresoSub)}>
                    <option value="">Selecciona...</option>
                    {ingresoSubsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {ingresoTipo === "Préstamo" && (ingresoSub === "de Tercero" || ingresoSub === "a Tercero") && (
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                      {ingresoSub === "de Tercero" ? "Ingreso = te prestaron más dinero." : "Ingreso = te abonaron / pagaron lo que te debían."}
                    </p>
                  )}
                </Field>
              )}
              {ingresoTipo === "Préstamo" && (ingresoSub === "de Tercero" || ingresoSub === "a Tercero") && (catalog.subcategorias[ingresoSub] || []).length > 0 && (
                <Field label="Persona" error={errors.ingresoPersonaTercero}>
                  <select value={ingresoPersonaTercero} onChange={(e) => { setIngresoPersonaTercero(e.target.value); setErrors((p) => ({ ...p, ingresoPersonaTercero: false })); }} style={selStyle(errors.ingresoPersonaTercero)}>
                    <option value="">Selecciona...</option>
                    {(catalog.subcategorias[ingresoSub] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              )}
            </>
          )}

          <Field label={esDiferido ? "Costo Total" : "Cantidad"} error={errors.cantidad}>
            <input type="number" inputMode="decimal" placeholder="$0.00" value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setErrors((p) => ({ ...p, cantidad: false })); }}
              style={{ ...inputBase, fontSize: 22, fontWeight: 700, textAlign: "center", border: errors.cantidad ? `2px solid ${SHEET.rojo}` : `2px solid ${bandBorder}`, background: errors.cantidad ? "#fff" : bandColor }} />
          </Field>
          {esDiferido && plazoMeses && cantidad && parseFloat(cantidad) > 0 && parseInt(plazoMeses) > 0 && (
            <p style={{ fontSize: 12, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
              Mensualidad aproximada: {fmt(parseFloat(cantidad) / parseInt(plazoMeses))} x {plazoMeses} meses
            </p>
          )}

          <Field label="Descripción">
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={inputBase} placeholder="Ej. Starbucks" />
          </Field>

          <Field label="Lugar">
            <input type="text" list="lugares-list" value={lugar} onChange={(e) => setLugar(e.target.value)} style={inputBase} placeholder="Ej. Monterrey, NL" />
            <datalist id="lugares-list">{catalog.lugares.map((l) => <option key={l} value={l} />)}</datalist>
          </Field>

          <div style={{ borderTop: `1px solid ${bandBorder}`, marginTop: 4, paddingTop: 10 }}>
            <Field label="Fecha" error={errors.fecha}>
              <div style={{ width: "100%", overflow: "hidden", borderRadius: 2 }}>
                <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setErrors((p) => ({ ...p, fecha: false })); }}
                  style={{
                    display: "block", width: "100%", boxSizing: "border-box", fontFamily: SHEET.fuente,
                    borderRadius: 2, padding: "8px 6px", fontSize: 14, color: SHEET.texto,
                    background: errors.fecha ? "#fff" : bandColor, border: errors.fecha ? `2px solid ${SHEET.rojo}` : `1px solid ${bandBorder}`
                  }} />
              </div>
            </Field>
          </div>

          {Object.keys(errors).some((k) => errors[k]) && (
            <p style={{ fontSize: 12, color: SHEET.rosaBorde, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Completa los campos marcados en rojo antes de guardar
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Btn primary full onClick={handleSave} style={{ flex: 2 }}>
              {saved ? "✓ Guardado" : "Guardar movimiento"}
            </Btn>
            <Btn full onClick={reset} style={{ flex: 1 }}>
              Nuevo
            </Btn>
          </div>
          {saved && (
            <p style={{ fontSize: 11.5, color: SHEET.verdeBorde, fontStyle: "italic", textAlign: "center", margin: "8px 0 0" }}>
              Guardado. Puedes seguir editando o tocar "Nuevo" para capturar otro movimiento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumenTab({ movimientos, catalog }) {
  const [mesFiltro, setMesFiltro] = useState(todayISO().slice(0, 7));
  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    set.add(todayISO().slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [movimientos]);
  const movsMes = useMemo(() => movimientos.filter((m) => m.fecha.slice(0, 7) === mesFiltro), [movimientos, mesFiltro]);
  const totalIngresos = movsMes.filter((m) => m.mov === "Ingreso").reduce((a, m) => a + m.cantidad, 0);
  const totalEgresos = movsMes.filter((m) => m.mov === "Egreso").reduce((a, m) => a + m.cantidad, 0);
  const balance = totalIngresos - totalEgresos;
  const porCategoria = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso" && m.tipo === "G. Variable").forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + m.cantidad; });
    return map;
  }, [movsMes]);
  const presupuestoRows = Object.keys(catalog.presupuestos).map((cat) => {
    const presupuesto = catalog.presupuestos[cat] || 0;
    const usado = porCategoria[cat] || 0;
    const disponible = presupuesto - usado;
    const pct = presupuesto > 0 ? Math.min(100, (usado / presupuesto) * 100) : (usado > 0 ? 100 : 0);
    return { cat, presupuesto, usado, disponible, pct };
  }).filter((r) => r.presupuesto > 0 || r.usado > 0).sort((a, b) => b.usado - a.usado);
  const porCuenta = useMemo(() => {
    const map = {};
    movsMes.filter((m) => m.mov === "Egreso").forEach((m) => { map[m.cuenta] = (map[m.cuenta] || 0) + m.cantidad; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movsMes]);

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Mes">
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ ...inputBase, background: SHEET.azul }}>
          {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </Field>

      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <HeaderBand color={SHEET.azul} borderColor={SHEET.azulBorde}>Flujo de Efectivo</HeaderBand>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff" }}>
          <div style={{ padding: "12px 14px", borderRight: "1px solid " + SHEET.grisBorde }}>
            <p style={{ fontSize: 11, fontStyle: "italic", fontWeight: 700, margin: 0, color: SHEET.verdeBorde }}>Ingresos</p>
            <p style={{ fontSize: 19, fontWeight: 700, margin: "4px 0 0" }}>{fmtShort(totalIngresos)}</p>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <p style={{ fontSize: 11, fontStyle: "italic", fontWeight: 700, margin: 0, color: SHEET.rosaBorde }}>Egresos</p>
            <p style={{ fontSize: 19, fontWeight: 700, margin: "4px 0 0" }}>{fmtShort(totalEgresos)}</p>
          </div>
        </div>
        <div style={{ padding: "10px 14px", background: SHEET.gris, borderTop: "1px solid " + SHEET.grisBorde, textAlign: "center" }}>
          <span style={{ fontSize: 12, fontStyle: "italic", fontWeight: 700, marginRight: 8 }}>Balance:</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: balance >= 0 ? SHEET.verdeBorde : SHEET.rosaBorde }}>{fmt(balance)}</span>
        </div>
      </div>

      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <HeaderBand color={SHEET.rosa} borderColor={SHEET.rosaBorde}>Presupuesto vs. Gastado</HeaderBand>
        <div style={{ background: "#fff", padding: "12px 14px" }}>
          {presupuestoRows.length === 0 && <p style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>Sin movimientos de gasto variable este mes.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {presupuestoRows.map((r) => {
              const over = r.disponible < 0;
              const near = !over && r.pct >= 80;
              const barColor = over ? SHEET.rosaBorde : near ? SHEET.amarilloBorde : SHEET.verdeBorde;
              return (
                <div key={r.cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, fontWeight: 700 }}>
                    <span>{r.cat}</span>
                    <span style={{ color: "#555", fontWeight: 400 }}>{fmtShort(r.usado)} / {fmtShort(r.presupuesto)}</span>
                  </div>
                  <div style={{ height: 9, background: SHEET.gris, border: "1px solid " + SHEET.grisBorde, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${r.pct}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {porCuenta.length > 0 && (
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <HeaderBand color={SHEET.amarillo} borderColor={SHEET.amarilloBorde}>Gasto por Cuenta</HeaderBand>
          <div style={{ background: "#fff" }}>
            {porCuenta.map(([cuenta, monto], i) => (
              <div key={cuenta} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "10px 14px", background: i % 2 === 0 ? "#fff" : SHEET.gris, borderTop: i === 0 ? "none" : "1px solid " + SHEET.grisBorde }}>
                <span style={{ fontWeight: 700 }}>{cuenta}</span>
                <span>{fmt(monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistorialTab({ movimientos, deleteMovimiento }) {
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [movimientos]);
  const filtrados = useMemo(() => {
    return movimientos
      .filter((m) => filtroMes === "todos" || m.fecha.slice(0, 7) === filtroMes)
      .filter((m) => filtroTipo === "todos" || m.mov === filtroTipo)
      .filter((m) => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return (m.descripcion || "").toLowerCase().includes(q) || (m.categoria || "").toLowerCase().includes(q) ||
          (m.subcategoria || "").toLowerCase().includes(q) || (m.cuenta || "").toLowerCase().includes(q) || (m.lugar || "").toLowerCase().includes(q);
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [movimientos, filtroMes, filtroTipo, busqueda]);

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <Field label="Buscar">
        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Categoría, lugar, descripción..." style={inputBase} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={inputBase}>
          <option value="todos">Todos los meses</option>
          {meses.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={inputBase}>
          <option value="todos">Todos</option>
          <option value="Ingreso">Ingresos</option>
          <option value="Egreso">Egresos</option>
        </select>
      </div>

      {filtrados.length === 0 && <p style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "2rem 0", fontStyle: "italic" }}>No hay movimientos que coincidan.</p>}

      <div style={{ border: filtrados.length ? "1px solid " + SHEET.grisBorde : "none", borderRadius: 4, overflow: "hidden" }}>
        {filtrados.map((m, i) => (
          <div key={m.id} style={{
            background: i % 2 === 0 ? "#fff" : SHEET.gris, borderTop: i === 0 ? "none" : "1px solid " + SHEET.grisBorde,
            borderLeft: `3px solid ${m.mov === "Ingreso" ? SHEET.verdeBorde : SHEET.rosaBorde}`, padding: "10px 12px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{m.categoria}{m.subcategoria ? ` · ${m.subcategoria}` : ""}</p>
              <p style={{ fontSize: 11, color: "#555", margin: 0, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fmtDate(m.fecha)} · {m.cuenta}{m.descripcion ? ` · ${m.descripcion}` : ""}{m.lugar && !m.lugar.startsWith("__diferido:") ? ` · ${m.lugar}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{m.mov === "Ingreso" ? "+" : "-"}{fmt(m.cantidad)}</span>
              <button aria-label="Eliminar" onClick={() => deleteMovimiento(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, padding: 4 }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListEditor({ title, items, onAdd, onRemove }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
      <HeaderBand color={SHEET.amarillo} borderColor={SHEET.amarilloBorde}>{title}</HeaderBand>
      <div style={{ background: "#fff", padding: "12px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {items.map((it) => (
            <span key={it} style={{ display: "flex", alignItems: "center", gap: 4, background: SHEET.gris, border: "1px solid " + SHEET.grisBorde, borderRadius: 3, padding: "4px 8px", fontSize: 12 }}>
              {it}
              <button aria-label={`Quitar ${it}`} onClick={() => onRemove(it)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde }}>✕</button>
            </span>
          ))}
          {items.length === 0 && <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin elementos aún</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Agregar nuevo..."
            style={{ ...inputBase, border: `2px solid ${SHEET.rojo}` }}
            onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); } }} />
          <Btn onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}>+</Btn>
        </div>
      </div>
    </div>
  );
}

function CatalogosTab({ catalog, setCatalog, guardarAhora }) {
  const [section, setSection] = useState("cuentas");
  function addToList(path, value) {
    const next = JSON.parse(JSON.stringify(catalog));
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
    const key = path[path.length - 1];
    if (!Array.isArray(ref[key])) ref[key] = [];
    if (!ref[key].includes(value)) ref[key].push(value);
    setCatalog(next);
    guardarAhora(next);
  }
  function removeFromList(path, value) {
    const next = JSON.parse(JSON.stringify(catalog));
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
    const key = path[path.length - 1];
    ref[key] = (ref[key] || []).filter((v) => v !== value);
    setCatalog(next);
    guardarAhora(next);
  }
  const [newCuentaTipo, setNewCuentaTipo] = useState(catalog.metodos[0] || "TDC");
  const [newCatTipo, setNewCatTipo] = useState(Object.keys(catalog.categorias)[0] || "");
  const [newSubcatCategoria, setNewSubcatCategoria] = useState("");
  const [newIngresoTipo, setNewIngresoTipo] = useState(catalog.ingresoTipos[0] || "");
  const [memNombre, setMemNombre] = useState("");
  const [memCategoria, setMemCategoria] = useState("");
  const [memMetodo, setMemMetodo] = useState(catalog.metodos[0] || "TDC");
  const [memCuenta, setMemCuenta] = useState("");
  const [memCosto, setMemCosto] = useState("");
  const [memFrecuencia, setMemFrecuencia] = useState("Mensual");
  const [memTipo, setMemTipo] = useState("Automático");
  const [memDia, setMemDia] = useState("1");
  const [editandoMemId, setEditandoMemId] = useState(null);
  const [servNombre, setServNombre] = useState("");
  const [servCategoria, setServCategoria] = useState("");
  const [servMetodo, setServMetodo] = useState(catalog.metodos[0] || "TDC");
  const [servCuenta, setServCuenta] = useState("");
  const [servCosto, setServCosto] = useState("");
  const [servFrecuencia, setServFrecuencia] = useState("Mensual");
  const [servTipo, setServTipo] = useState("Automático");
  const [servDia, setServDia] = useState("1");
  const [servVariable, setServVariable] = useState(false);
  const [editandoServId, setEditandoServId] = useState(null);
  const [segNombre, setSegNombre] = useState("");
  const [segCategoria, setSegCategoria] = useState("");
  const [segPoliza, setSegPoliza] = useState("");
  const [segMetodo, setSegMetodo] = useState(catalog.metodos[0] || "TDC");
  const [segCuenta, setSegCuenta] = useState("");
  const [segCosto, setSegCosto] = useState("");
  const [segFrecuencia, setSegFrecuencia] = useState("Anual");
  const [segTipo, setSegTipo] = useState("Manual");
  const [segDia, setSegDia] = useState("1");
  const [editandoSegId, setEditandoSegId] = useState(null);
  const [ahoNombre, setAhoNombre] = useState("");
  const [ahoCategoria, setAhoCategoria] = useState("");
  const [ahoDescripcion, setAhoDescripcion] = useState("");
  const [ahoMetodo, setAhoMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [ahoCuenta, setAhoCuenta] = useState("");
  const [ahoMeta, setAhoMeta] = useState("");
  const [ahoPlazo, setAhoPlazo] = useState("");
  const [ahoAportacion, setAhoAportacion] = useState("");
  const [editandoAhoId, setEditandoAhoId] = useState(null);
  const [invNombre, setInvNombre] = useState("");
  const [invCategoria, setInvCategoria] = useState("");
  const [invDescripcion, setInvDescripcion] = useState("");
  const [invObjetivo, setInvObjetivo] = useState("");
  const [invMetodo, setInvMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [invCuenta, setInvCuenta] = useState("");
  const [invMeta, setInvMeta] = useState("");
  const [invPlazo, setInvPlazo] = useState("");
  const [invAportacion, setInvAportacion] = useState("");
  const [editandoInvId, setEditandoInvId] = useState(null);
  const [prbVista, setPrbVista] = useState("bancario");
  const [prbNombre, setPrbNombre] = useState("");
  const [prbCategoria, setPrbCategoria] = useState("Bancario");
  const [prbMetodo, setPrbMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [prbCuenta, setPrbCuenta] = useState("");
  const [prbMontoFinanciado, setPrbMontoFinanciado] = useState("");
  const [prbPagoPeriodo, setPrbPagoPeriodo] = useState("");
  const [prbNumPagos, setPrbNumPagos] = useState("");
  const [prbFrecuencia, setPrbFrecuencia] = useState("Mensual");
  const [prbPagosPrevios, setPrbPagosPrevios] = useState("");
  const [editandoPrbId, setEditandoPrbId] = useState(null);
  const [prtNombre, setPrtNombre] = useState("");
  const [prtDireccion, setPrtDireccion] = useState("a Tercero");
  const [prtNota, setPrtNota] = useState("");
  const [editandoPrtId, setEditandoPrtId] = useState(null);
  const [famNombre, setFamNombre] = useState("");
  const [famParentesco, setFamParentesco] = useState("");
  const [famCategoria, setFamCategoria] = useState("");
  const [famMetodo, setFamMetodo] = useState(catalog.metodos[0] || "Efectivo");
  const [famCuenta, setFamCuenta] = useState("");
  const [famMeta, setFamMeta] = useState("");
  const [famPlazo, setFamPlazo] = useState("");
  const [famAportacion, setFamAportacion] = useState("");
  const [editandoFamId, setEditandoFamId] = useState(null);

  function limpiarFormMembresia() {
    setMemNombre(""); setMemCategoria(""); setMemMetodo(catalog.metodos[0] || "TDC"); setMemCuenta("");
    setMemCosto(""); setMemFrecuencia("Mensual"); setMemTipo("Automático"); setMemDia("1"); setEditandoMemId(null);
  }

  function guardarMembresia() {
    if (!memNombre || !memCosto || parseFloat(memCosto) <= 0) return;
    const mem = {
      id: editandoMemId || uid(), activa: true, nombre: memNombre, categoria: memCategoria,
      metodo: memMetodo, cuenta: memCuenta, costo: parseFloat(memCosto),
      frecuencia: memFrecuencia, tipoPago: memTipo, diaPago: parseInt(memDia) || 1,
      ultimoPago: ""
    };
    const lista = catalog.membresias || [];
    const yaExiste = lista.some((m) => m.id === mem.id);
    const nuevasMembresias = yaExiste ? lista.map((m) => (m.id === mem.id ? { ...m, ...mem } : m)) : [mem, ...lista];
    const subcatsActuales = catalog.subcategorias["Membresías"] || [];
    const nuevasSubcats = subcatsActuales.includes(memNombre) ? subcatsActuales : [...subcatsActuales, memNombre];
    const actualizado = {
      ...catalog,
      membresias: nuevasMembresias,
      subcategorias: { ...catalog.subcategorias, "Membresías": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormMembresia();
  }

  function editarMembresia(m) {
    setEditandoMemId(m.id); setMemNombre(m.nombre); setMemCategoria(m.categoria); setMemMetodo(m.metodo);
    setMemCuenta(m.cuenta); setMemCosto(String(m.costo)); setMemFrecuencia(m.frecuencia); setMemTipo(m.tipoPago); setMemDia(String(m.diaPago));
  }

  function toggleActivaMembresia(id) {
    const actualizado = { ...catalog, membresias: (catalog.membresias || []).map((m) => (m.id === id ? { ...m, activa: !m.activa } : m)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarMembresia(id) {
    const actualizado = { ...catalog, membresias: (catalog.membresias || []).filter((m) => m.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormServicio() {
    setServNombre(""); setServCategoria(""); setServMetodo(catalog.metodos[0] || "TDC"); setServCuenta("");
    setServCosto(""); setServFrecuencia("Mensual"); setServTipo("Automático"); setServDia("1"); setServVariable(false); setEditandoServId(null);
  }

  function guardarServicio() {
    if (!servNombre) return;
    if (!servVariable && (!servCosto || parseFloat(servCosto) <= 0)) return;
    const serv = {
      id: editandoServId || uid(), activa: true, nombre: servNombre, categoria: servCategoria,
      metodo: servMetodo, cuenta: servCuenta, costo: servVariable ? 0 : parseFloat(servCosto), esVariable: servVariable,
      frecuencia: servFrecuencia, tipoPago: servTipo, diaPago: parseInt(servDia) || 1,
      ultimoPago: ""
    };
    const lista = catalog.servicios || [];
    const yaExiste = lista.some((s) => s.id === serv.id);
    const nuevosServicios = yaExiste ? lista.map((s) => (s.id === serv.id ? { ...s, ...serv } : s)) : [serv, ...lista];
    const subcatsActuales = catalog.subcategorias["Servicios"] || [];
    const nuevasSubcats = subcatsActuales.includes(servNombre) ? subcatsActuales : [...subcatsActuales, servNombre];
    const actualizado = {
      ...catalog,
      servicios: nuevosServicios,
      subcategorias: { ...catalog.subcategorias, "Servicios": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormServicio();
  }

  function editarServicio(s) {
    setEditandoServId(s.id); setServNombre(s.nombre); setServCategoria(s.categoria); setServMetodo(s.metodo);
    setServCuenta(s.cuenta); setServCosto(s.esVariable ? "" : String(s.costo)); setServFrecuencia(s.frecuencia); setServTipo(s.tipoPago); setServDia(String(s.diaPago)); setServVariable(!!s.esVariable);
  }

  function toggleActivaServicio(id) {
    const actualizado = { ...catalog, servicios: (catalog.servicios || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarServicio(id) {
    const actualizado = { ...catalog, servicios: (catalog.servicios || []).filter((s) => s.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormSeguro() {
    setSegNombre(""); setSegCategoria(""); setSegPoliza(""); setSegMetodo(catalog.metodos[0] || "TDC"); setSegCuenta("");
    setSegCosto(""); setSegFrecuencia("Anual"); setSegTipo("Manual"); setSegDia("1"); setEditandoSegId(null);
  }

  function guardarSeguro() {
    if (!segNombre || !segCosto || parseFloat(segCosto) <= 0) return;
    const seg = {
      id: editandoSegId || uid(), activa: true, nombre: segNombre, categoria: segCategoria, poliza: segPoliza,
      metodo: segMetodo, cuenta: segCuenta, costo: parseFloat(segCosto),
      frecuencia: segFrecuencia, tipoPago: segTipo, diaPago: parseInt(segDia) || 1,
      ultimoPago: ""
    };
    const lista = catalog.seguros || [];
    const yaExiste = lista.some((s) => s.id === seg.id);
    const nuevosSeguros = yaExiste ? lista.map((s) => (s.id === seg.id ? { ...s, ...seg } : s)) : [seg, ...lista];
    const subcatsActuales = catalog.subcategorias["Seguros"] || [];
    const nuevasSubcats = subcatsActuales.includes(segNombre) ? subcatsActuales : [...subcatsActuales, segNombre];
    const actualizado = {
      ...catalog,
      seguros: nuevosSeguros,
      subcategorias: { ...catalog.subcategorias, "Seguros": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormSeguro();
  }

  function editarSeguro(s) {
    setEditandoSegId(s.id); setSegNombre(s.nombre); setSegCategoria(s.categoria); setSegPoliza(s.poliza || ""); setSegMetodo(s.metodo);
    setSegCuenta(s.cuenta); setSegCosto(String(s.costo)); setSegFrecuencia(s.frecuencia); setSegTipo(s.tipoPago); setSegDia(String(s.diaPago));
  }

  function toggleActivaSeguro(id) {
    const actualizado = { ...catalog, seguros: (catalog.seguros || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarSeguro(id) {
    const actualizado = { ...catalog, seguros: (catalog.seguros || []).filter((s) => s.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormAhorro() {
    setAhoNombre(""); setAhoCategoria(""); setAhoDescripcion(""); setAhoMetodo(catalog.metodos[0] || "Efectivo"); setAhoCuenta("");
    setAhoMeta(""); setAhoPlazo(""); setAhoAportacion(""); setEditandoAhoId(null);
  }

  function guardarAhorro() {
    if (!ahoNombre || !ahoMeta || parseFloat(ahoMeta) <= 0) return;
    const aho = {
      id: editandoAhoId || uid(), activa: true, nombre: ahoNombre, categoria: ahoCategoria, descripcion: ahoDescripcion,
      metodo: ahoMetodo, cuenta: ahoCuenta, meta: parseFloat(ahoMeta), plazoMeses: parseInt(ahoPlazo) || 0,
      aportacion: parseFloat(ahoAportacion) || 0, acumulado: 0, ultimoPago: ""
    };
    const lista = catalog.ahorros || [];
    const yaExiste = lista.some((a) => a.id === aho.id);
    const nuevosAhorros = yaExiste ? lista.map((a) => (a.id === aho.id ? { ...a, ...aho } : a)) : [aho, ...lista];
    const subcatsActuales = catalog.subcategorias["Ahorro"] || [];
    const nuevasSubcats = subcatsActuales.includes(ahoNombre) ? subcatsActuales : [...subcatsActuales, ahoNombre];
    const actualizado = {
      ...catalog,
      ahorros: nuevosAhorros,
      categorias: { ...catalog.categorias, "Ahorro": (catalog.categorias["Ahorro"] || []).includes(ahoNombre) ? catalog.categorias["Ahorro"] : [...(catalog.categorias["Ahorro"] || []), ahoNombre] },
      subcategorias: { ...catalog.subcategorias, "Ahorro": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormAhorro();
  }

  function editarAhorro(a) {
    setEditandoAhoId(a.id); setAhoNombre(a.nombre); setAhoCategoria(a.categoria); setAhoDescripcion(a.descripcion || ""); setAhoMetodo(a.metodo);
    setAhoCuenta(a.cuenta); setAhoMeta(String(a.meta)); setAhoPlazo(String(a.plazoMeses)); setAhoAportacion(String(a.aportacion));
  }

  function toggleActivaAhorro(id) {
    const actualizado = { ...catalog, ahorros: (catalog.ahorros || []).map((a) => (a.id === id ? { ...a, activa: !a.activa } : a)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarAhorro(id) {
    const actualizado = { ...catalog, ahorros: (catalog.ahorros || []).filter((a) => a.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormInversion() {
    setInvNombre(""); setInvCategoria(""); setInvDescripcion(""); setInvObjetivo(""); setInvMetodo(catalog.metodos[0] || "Efectivo"); setInvCuenta("");
    setInvMeta(""); setInvPlazo(""); setInvAportacion(""); setEditandoInvId(null);
  }

  function guardarInversion() {
    if (!invNombre || !invMeta || parseFloat(invMeta) <= 0) return;
    const inv = {
      id: editandoInvId || uid(), activa: true, nombre: invNombre, categoria: invCategoria, descripcion: invDescripcion, objetivo: invObjetivo,
      metodo: invMetodo, cuenta: invCuenta, meta: parseFloat(invMeta), plazoMeses: parseInt(invPlazo) || 0,
      aportacion: parseFloat(invAportacion) || 0, acumulado: 0, ultimoPago: ""
    };
    const lista = catalog.inversiones || [];
    const yaExiste = lista.some((i) => i.id === inv.id);
    const nuevasInversiones = yaExiste ? lista.map((i) => (i.id === inv.id ? { ...i, ...inv } : i)) : [inv, ...lista];
    const subcatsActuales = catalog.subcategorias["Inversión"] || [];
    const nuevasSubcats = subcatsActuales.includes(invNombre) ? subcatsActuales : [...subcatsActuales, invNombre];
    const actualizado = {
      ...catalog,
      inversiones: nuevasInversiones,
      categorias: { ...catalog.categorias, "Inversión": (catalog.categorias["Inversión"] || []).includes(invNombre) ? catalog.categorias["Inversión"] : [...(catalog.categorias["Inversión"] || []), invNombre] },
      subcategorias: { ...catalog.subcategorias, "Inversión": nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormInversion();
  }

  function editarInversion(i) {
    setEditandoInvId(i.id); setInvNombre(i.nombre); setInvCategoria(i.categoria); setInvDescripcion(i.descripcion || ""); setInvObjetivo(i.objetivo || ""); setInvMetodo(i.metodo);
    setInvCuenta(i.cuenta); setInvMeta(String(i.meta)); setInvPlazo(String(i.plazoMeses)); setInvAportacion(String(i.aportacion));
  }

  function toggleActivaInversion(id) {
    const actualizado = { ...catalog, inversiones: (catalog.inversiones || []).map((i) => (i.id === id ? { ...i, activa: !i.activa } : i)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarInversion(id) {
    const actualizado = { ...catalog, inversiones: (catalog.inversiones || []).filter((i) => i.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormPrestamoBancario() {
    setPrbNombre(""); setPrbCategoria("Bancario"); setPrbMetodo(catalog.metodos[0] || "Efectivo"); setPrbCuenta("");
    setPrbMontoFinanciado(""); setPrbPagoPeriodo(""); setPrbNumPagos(""); setPrbFrecuencia("Mensual");
    setPrbPagosPrevios(""); setEditandoPrbId(null);
  }

  function guardarPrestamoBancario() {
    if (!prbNombre || !prbPagoPeriodo || parseFloat(prbPagoPeriodo) <= 0 || !prbNumPagos || parseInt(prbNumPagos) <= 0) return;
    const pagoPeriodo = parseFloat(prbPagoPeriodo);
    const numPagos = parseInt(prbNumPagos);
    const pagosPrevios = Math.min(Math.max(0, parseInt(prbPagosPrevios) || 0), numPagos - 1);
    const totalAPagar = Math.round(pagoPeriodo * numPagos * 100) / 100;
    const acumuladoInicial = Math.round(pagosPrevios * pagoPeriodo * 100) / 100;
    const existente = (catalog.prestamosBancarios || []).find((p) => p.id === editandoPrbId);
    const pb = {
      id: editandoPrbId || uid(), activa: true, nombre: prbNombre, categoria: prbCategoria,
      metodo: prbMetodo, cuenta: prbCuenta,
      montoFinanciado: parseFloat(prbMontoFinanciado) || 0,
      pagoPeriodo, numPagos, frecuencia: prbFrecuencia, totalAPagar, pagosPrevios,
      acumulado: existente ? existente.acumulado : acumuladoInicial,
      ultimoPago: existente ? existente.ultimoPago : ""
    };
    const lista = catalog.prestamosBancarios || [];
    const yaExiste = lista.some((p) => p.id === pb.id);
    const nuevosPrestamos = yaExiste ? lista.map((p) => (p.id === pb.id ? { ...p, ...pb } : p)) : [pb, ...lista];
    const subcatsActuales = catalog.subcategorias[prbCategoria] || [];
    const nuevasSubcats = subcatsActuales.includes(prbNombre) ? subcatsActuales : [...subcatsActuales, prbNombre];
    const actualizado = {
      ...catalog,
      prestamosBancarios: nuevosPrestamos,
      subcategorias: { ...catalog.subcategorias, [prbCategoria]: nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormPrestamoBancario();
  }

  function editarPrestamoBancario(p) {
    setEditandoPrbId(p.id); setPrbNombre(p.nombre); setPrbCategoria(p.categoria); setPrbMetodo(p.metodo);
    setPrbCuenta(p.cuenta); setPrbMontoFinanciado(String(p.montoFinanciado || ""));
    setPrbPagoPeriodo(String(p.pagoPeriodo || "")); setPrbNumPagos(String(p.numPagos || ""));
    setPrbFrecuencia(p.frecuencia || "Mensual"); setPrbPagosPrevios(String(p.pagosPrevios || 0));
  }

  function toggleActivaPrestamoBancario(id) {
    const actualizado = { ...catalog, prestamosBancarios: (catalog.prestamosBancarios || []).map((p) => (p.id === id ? { ...p, activa: !p.activa } : p)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarPrestamoBancario(id) {
    const actualizado = { ...catalog, prestamosBancarios: (catalog.prestamosBancarios || []).filter((p) => p.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormPrestamoTercero() {
    setPrtNombre(""); setPrtDireccion("a Tercero"); setPrtNota(""); setEditandoPrtId(null);
  }

  function guardarPrestamoTercero() {
    if (!prtNombre) return;
    const pt = {
      id: editandoPrtId || uid(), activa: true, nombre: prtNombre, direccion: prtDireccion, nota: prtNota
    };
    const lista = catalog.prestamosTerceros || [];
    const yaExiste = lista.some((p) => p.id === pt.id);
    const nuevosPrestamos = yaExiste ? lista.map((p) => (p.id === pt.id ? { ...p, ...pt } : p)) : [pt, ...lista];
    const subcatsActuales = catalog.subcategorias[prtDireccion] || [];
    const nuevasSubcats = subcatsActuales.includes(prtNombre) ? subcatsActuales : [...subcatsActuales, prtNombre];
    const actualizado = {
      ...catalog,
      prestamosTerceros: nuevosPrestamos,
      subcategorias: { ...catalog.subcategorias, [prtDireccion]: nuevasSubcats }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormPrestamoTercero();
  }

  function editarPrestamoTercero(p) {
    setEditandoPrtId(p.id); setPrtNombre(p.nombre); setPrtDireccion(p.direccion); setPrtNota(p.nota || "");
  }

  function toggleActivaPrestamoTercero(id) {
    const actualizado = { ...catalog, prestamosTerceros: (catalog.prestamosTerceros || []).map((p) => (p.id === id ? { ...p, activa: !p.activa } : p)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarPrestamoTercero(id) {
    const actualizado = { ...catalog, prestamosTerceros: (catalog.prestamosTerceros || []).filter((p) => p.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function limpiarFormFamiliar() {
    setFamNombre(""); setFamParentesco(""); setFamCategoria(""); setFamMetodo(catalog.metodos[0] || "Efectivo");
    setFamCuenta(""); setFamMeta(""); setFamPlazo(""); setFamAportacion(""); setEditandoFamId(null);
  }

  function guardarFamiliar() {
    if (!famNombre || !famMeta || parseFloat(famMeta) <= 0) return;
    const existente = (catalog.familiares || []).find((f) => f.id === editandoFamId);
    const fam = {
      id: editandoFamId || uid(), activa: true, nombre: famNombre, parentesco: famParentesco,
      categoria: famCategoria, metodo: famMetodo, cuenta: famCuenta,
      meta: parseFloat(famMeta), plazoMeses: parseInt(famPlazo) || 0,
      aportacion: parseFloat(famAportacion) || 0,
      acumuladoAport: existente ? existente.acumuladoAport : 0,
      acumuladoTDC: existente ? existente.acumuladoTDC : 0,
      ultimoPago: existente ? existente.ultimoPago : ""
    };
    const lista = catalog.familiares || [];
    const yaExiste = lista.some((f) => f.id === fam.id);
    const nuevosFamiliares = yaExiste ? lista.map((f) => (f.id === fam.id ? { ...f, ...fam } : f)) : [fam, ...lista];
    const subcatsAport = catalog.subcategorias["Aportación"] || [];
    const nuevasSubcatsAport = subcatsAport.includes(famNombre) ? subcatsAport : [...subcatsAport, famNombre];
    const subcatsTDC = catalog.subcategorias["Pago TDC Familiar"] || [];
    const nuevasSubcatsTDC = subcatsTDC.includes(famNombre) ? subcatsTDC : [...subcatsTDC, famNombre];
    const actualizado = {
      ...catalog,
      familiares: nuevosFamiliares,
      subcategorias: { ...catalog.subcategorias, "Aportación": nuevasSubcatsAport, "Pago TDC Familiar": nuevasSubcatsTDC }
    };
    setCatalog(actualizado);
    guardarAhora(actualizado);
    limpiarFormFamiliar();
  }

  function editarFamiliar(f) {
    setEditandoFamId(f.id); setFamNombre(f.nombre); setFamParentesco(f.parentesco || "");
    setFamCategoria(f.categoria || ""); setFamMetodo(f.metodo || catalog.metodos[0] || "Efectivo");
    setFamCuenta(f.cuenta || ""); setFamMeta(String(f.meta || "")); setFamPlazo(String(f.plazoMeses || ""));
    setFamAportacion(String(f.aportacion || ""));
  }

  function toggleActivaFamiliar(id) {
    const actualizado = { ...catalog, familiares: (catalog.familiares || []).map((f) => (f.id === id ? { ...f, activa: !f.activa } : f)) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  function eliminarFamiliar(id) {
    const actualizado = { ...catalog, familiares: (catalog.familiares || []).filter((f) => f.id !== id) };
    setCatalog(actualizado);
    guardarAhora(actualizado);
  }

  const cuentasMemDisponibles = catalog.cuentas[memMetodo] || [];
  const cuentasServDisponibles = catalog.cuentas[servMetodo] || [];
  const cuentasSegDisponibles = catalog.cuentas[segMetodo] || [];
  const cuentasPrbDisponibles = catalog.cuentas[prbMetodo] || [];
  const cuentasFamDisponibles = catalog.cuentas[famMetodo] || [];
  const sections = [
    { id: "cuentas", label: "Cuentas" }, { id: "egresos", label: "Egresos" },
    { id: "ingresos", label: "Ingresos" },
    { id: "lugares", label: "Lugares" }, { id: "presupuestos", label: "Presupuesto" }
  ];
  const categoriasDelTipo = catalog.categorias[newCatTipo] || [];
  const subcatActual = newSubcatCategoria && categoriasDelTipo.includes(newSubcatCategoria) ? newSubcatCategoria : (categoriasDelTipo[0] || "");

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: "6px 10px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: section === s.id ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
            background: section === s.id ? SHEET.azul : "#fff"
          }}>{s.label}</button>
        ))}
      </div>

      {section === "cuentas" && (
        <div>
          <Field label="Método">
            <select value={newCuentaTipo} onChange={(e) => setNewCuentaTipo(e.target.value)} style={inputBase}>
              {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <ListEditor title={`Cuentas / tarjetas de ${newCuentaTipo}`} items={catalog.cuentas[newCuentaTipo] || []}
            onAdd={(v) => addToList(["cuentas", newCuentaTipo], v)} onRemove={(v) => removeFromList(["cuentas", newCuentaTipo], v)} />
        </div>
      )}
      {section === "egresos" && (
        <div>
          <Field label="Tipo de gasto">
            <select value={newCatTipo} onChange={(e) => { setNewCatTipo(e.target.value); setNewSubcatCategoria(""); }} style={inputBase}>
              {Object.keys(catalog.categorias).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {newCatTipo === "Ahorro" ? (
            <div>
              <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                  {editandoAhoId ? "Editar ahorro" : "Agregar ahorro"}
                </p>
                <Field label="Nombre">
                  <input type="text" value={ahoNombre} onChange={(e) => setAhoNombre(e.target.value)} style={inputBase} placeholder="Ej. Laptop, Viaje" />
                </Field>
                <Field label="Categoría">
                  <input type="text" value={ahoCategoria} onChange={(e) => setAhoCategoria(e.target.value)} style={inputBase} placeholder="Ej. Tecnología, Viajes" />
                </Field>
                <Field label="Descripción (opcional)">
                  <input type="text" value={ahoDescripcion} onChange={(e) => setAhoDescripcion(e.target.value)} style={inputBase} />
                </Field>
                <Field label="Método">
                  <select value={ahoMetodo} onChange={(e) => { setAhoMetodo(e.target.value); setAhoCuenta(""); }} style={inputBase}>
                    {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {(catalog.cuentas[ahoMetodo] || []).length > 0 && (
                  <Field label="Cuenta">
                    <select value={ahoCuenta} onChange={(e) => setAhoCuenta(e.target.value)} style={inputBase}>
                      <option value="">Selecciona...</option>
                      {(catalog.cuentas[ahoMetodo] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Meta (monto total a ahorrar)">
                  <input type="number" inputMode="decimal" value={ahoMeta} onChange={(e) => setAhoMeta(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <Field label="Plazo (meses)">
                  <input type="number" inputMode="numeric" value={ahoPlazo} onChange={(e) => setAhoPlazo(e.target.value)} style={inputBase} placeholder="Ej. 12" />
                </Field>
                <Field label="Aportación (cuánto metes cada vez)">
                  <input type="number" inputMode="decimal" value={ahoAportacion} onChange={(e) => setAhoAportacion(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn primary full onClick={guardarAhorro}>{editandoAhoId ? "Guardar cambios" : "Agregar ahorro"}</Btn>
                  {editandoAhoId && <Btn full onClick={limpiarFormAhorro}>Cancelar</Btn>}
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus ahorros</p>
              {(catalog.ahorros || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin ahorros aún.</p>}
              {(catalog.ahorros || []).map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: a.activa ? "#fff" : SHEET.gris }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{a.nombre}</p>
                    <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                      Meta {fmt(a.meta)} · Aportación {fmt(a.aportacion)} · {a.plazoMeses} meses
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => toggleActivaAhorro(a.id)} style={{
                      fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                      border: "1px solid " + SHEET.grisBorde, background: a.activa ? SHEET.verde : "#fff", color: SHEET.texto
                    }}>{a.activa ? "Activa" : "Inactiva"}</button>
                    <button onClick={() => editarAhorro(a)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                    <button onClick={() => eliminarAhorro(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : newCatTipo === "Inversión" ? (
            <div>
              <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                  {editandoInvId ? "Editar inversión" : "Agregar inversión"}
                </p>
                <Field label="Nombre">
                  <input type="text" value={invNombre} onChange={(e) => setInvNombre(e.target.value)} style={inputBase} placeholder="Ej. GBM-1" />
                </Field>
                <Field label="Categoría">
                  <input type="text" value={invCategoria} onChange={(e) => setInvCategoria(e.target.value)} style={inputBase} placeholder="Ej. GBM, Interbrokers" />
                </Field>
                <Field label="Descripción (opcional)">
                  <input type="text" value={invDescripcion} onChange={(e) => setInvDescripcion(e.target.value)} style={inputBase} />
                </Field>
                <Field label="Objetivo (opcional)">
                  <input type="text" value={invObjetivo} onChange={(e) => setInvObjetivo(e.target.value)} style={inputBase} placeholder="Ej. Retiro, Fondo de emergencia" />
                </Field>
                <Field label="Método">
                  <select value={invMetodo} onChange={(e) => { setInvMetodo(e.target.value); setInvCuenta(""); }} style={inputBase}>
                    {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {(catalog.cuentas[invMetodo] || []).length > 0 && (
                  <Field label="Cuenta">
                    <select value={invCuenta} onChange={(e) => setInvCuenta(e.target.value)} style={inputBase}>
                      <option value="">Selecciona...</option>
                      {(catalog.cuentas[invMetodo] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Meta (monto total a invertir)">
                  <input type="number" inputMode="decimal" value={invMeta} onChange={(e) => setInvMeta(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <Field label="Plazo (meses)">
                  <input type="number" inputMode="numeric" value={invPlazo} onChange={(e) => setInvPlazo(e.target.value)} style={inputBase} placeholder="Ej. 24" />
                </Field>
                <Field label="Aportación (cuánto metes cada vez)">
                  <input type="number" inputMode="decimal" value={invAportacion} onChange={(e) => setInvAportacion(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn primary full onClick={guardarInversion}>{editandoInvId ? "Guardar cambios" : "Agregar inversión"}</Btn>
                  {editandoInvId && <Btn full onClick={limpiarFormInversion}>Cancelar</Btn>}
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus inversiones</p>
              {(catalog.inversiones || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin inversiones aún.</p>}
              {(catalog.inversiones || []).map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: i.activa ? "#fff" : SHEET.gris }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{i.nombre}</p>
                    <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                      Meta {fmt(i.meta)} · Aportación {fmt(i.aportacion)} · {i.plazoMeses} meses
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <button onClick={() => toggleActivaInversion(i.id)} style={{
                      fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                      border: "1px solid " + SHEET.grisBorde, background: i.activa ? SHEET.verde : "#fff", color: SHEET.texto
                    }}>{i.activa ? "Activa" : "Inactiva"}</button>
                    <button onClick={() => editarInversion(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                    <button onClick={() => eliminarInversion(i.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : newCatTipo === "Préstamo" ? (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button onClick={() => setPrbVista("bancario")} style={{
                  flex: 1, padding: "7px 0", fontSize: 12.5, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                  border: prbVista === "bancario" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                  background: prbVista === "bancario" ? SHEET.azul : "#fff"
                }}>Debo (Bancario/Crédito)</button>
                <button onClick={() => setPrbVista("terceros")} style={{
                  flex: 1, padding: "7px 0", fontSize: 12.5, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                  border: prbVista === "terceros" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                  background: prbVista === "terceros" ? SHEET.azul : "#fff"
                }}>De/A Terceros</button>
              </div>

              {prbVista === "bancario" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoPrbId ? "Editar préstamo" : "Agregar préstamo"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={prbNombre} onChange={(e) => setPrbNombre(e.target.value)} style={inputBase} placeholder="Ej. Crédito auto BBVA" />
                    </Field>
                    <Field label="Categoría">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Bancario", "Crédito"].map((c) => (
                          <button key={c} onClick={() => setPrbCategoria(c)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: prbCategoria === c ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: prbCategoria === c ? SHEET.azul : "#fff"
                          }}>{c}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Frecuencia de pago">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Mensual", "Quincenal", "Semanal"].map((f) => (
                          <button key={f} onClick={() => setPrbFrecuencia(f)} style={{
                            flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: prbFrecuencia === f ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: prbFrecuencia === f ? SHEET.azul : "#fff"
                          }}>{f}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Monto financiado (lo que te prestaron, sin intereses)">
                      <input type="number" inputMode="decimal" value={prbMontoFinanciado} onChange={(e) => setPrbMontoFinanciado(e.target.value)} style={inputBase} placeholder="$0.00 — solo referencia" />
                    </Field>
                    <Field label="Pago por periodo (lo que pagas cada vez)">
                      <input type="number" inputMode="decimal" value={prbPagoPeriodo} onChange={(e) => setPrbPagoPeriodo(e.target.value)} style={inputBase} placeholder="$0.00" />
                    </Field>
                    <Field label="Número de pagos (plazo total)">
                      <input type="number" inputMode="numeric" value={prbNumPagos} onChange={(e) => setPrbNumPagos(e.target.value)} style={inputBase} placeholder="Ej. 24" />
                    </Field>
                    {prbPagoPeriodo && prbNumPagos && parseFloat(prbPagoPeriodo) > 0 && parseInt(prbNumPagos) > 0 && (
                      <div style={{ background: SHEET.amarillo, border: "1px solid #e6d200", borderRadius: 4, padding: "8px 10px", marginBottom: 10, fontSize: 12 }}>
                        <b>Total a pagar:</b> {fmt(Math.round(parseFloat(prbPagoPeriodo) * parseInt(prbNumPagos) * 100) / 100)}
                        {prbMontoFinanciado && parseFloat(prbMontoFinanciado) > 0 && (
                          <span style={{ color: "#666", marginLeft: 8 }}>
                            · Intereses implícitos: {fmt(Math.round((parseFloat(prbPagoPeriodo) * parseInt(prbNumPagos) - parseFloat(prbMontoFinanciado)) * 100) / 100)}
                          </span>
                        )}
                      </div>
                    )}
                    <Field label="Pagos ya realizados (si ya traes el crédito avanzado)">
                      <input type="number" inputMode="numeric" value={prbPagosPrevios} onChange={(e) => setPrbPagosPrevios(e.target.value)} style={inputBase} placeholder="0" />
                    </Field>
                    {prbPagosPrevios && parseInt(prbPagosPrevios) > 0 && prbPagoPeriodo && parseFloat(prbPagoPeriodo) > 0 && (
                      <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                        Acumulado inicial: {fmt(Math.round(parseInt(prbPagosPrevios) * parseFloat(prbPagoPeriodo) * 100) / 100)}
                      </p>
                    )}
                    <Field label="Método de pago">
                      <select value={prbMetodo} onChange={(e) => { setPrbMetodo(e.target.value); setPrbCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasPrbDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={prbCuenta} onChange={(e) => setPrbCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasPrbDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "0 0 10px" }}>
                      Se liquida automáticamente cuando los pagos registrados alcancen el total a pagar.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarPrestamoBancario}>{editandoPrbId ? "Guardar cambios" : "Agregar préstamo"}</Btn>
                      {editandoPrbId && <Btn full onClick={limpiarFormPrestamoBancario}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus préstamos</p>
                  {(catalog.prestamosBancarios || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin préstamos aún.</p>}
                  {(catalog.prestamosBancarios || []).map((p) => {
                    const pendiente = Math.max(0, (p.totalAPagar || 0) - (p.acumulado || 0));
                    return (
                    <div key={p.id} style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 8, background: p.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre} <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}>({p.categoria})</span></p>
                          <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                            {fmt(p.pagoPeriodo || 0)}/{p.frecuencia || "Mensual"} · {p.numPagos || 0} pagos · Total {fmt(p.totalAPagar || 0)}
                          </p>
                          <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                            Pagado {fmt(p.acumulado || 0)} · Pendiente {fmt(pendiente)}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                          <button onClick={() => toggleActivaPrestamoBancario(p.id)} style={{
                            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: "1px solid " + SHEET.grisBorde, background: p.activa ? SHEET.verde : "#fff", color: SHEET.texto
                          }}>{p.activa ? "Activo" : "Liquidado"}</button>
                        <button onClick={() => editarPrestamoBancario(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarPrestamoBancario(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoPrtId ? "Editar persona" : "Agregar persona"}
                    </p>
                    <Field label="Nombre de la persona">
                      <input type="text" value={prtNombre} onChange={(e) => setPrtNombre(e.target.value)} style={inputBase} placeholder="Ej. Mi hermano, Lupita" />
                    </Field>
                    <Field label="¿Quién debe?">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setPrtDireccion("a Tercero")} style={{
                          flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: prtDireccion === "a Tercero" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: prtDireccion === "a Tercero" ? SHEET.azul : "#fff"
                        }}>Me debe a mí</button>
                        <button onClick={() => setPrtDireccion("de Tercero")} style={{
                          flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: prtDireccion === "de Tercero" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: prtDireccion === "de Tercero" ? SHEET.azul : "#fff"
                        }}>Yo le debo</button>
                      </div>
                    </Field>
                    <Field label="Nota (opcional)">
                      <input type="text" value={prtNota} onChange={(e) => setPrtNota(e.target.value)} style={inputBase} placeholder="Ej. Para el coche" />
                    </Field>
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                      No hay monto fijo — puedes registrar varios préstamos o abonos sueltos a la misma persona y el saldo se calcula solo.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarPrestamoTercero}>{editandoPrtId ? "Guardar cambios" : "Agregar persona"}</Btn>
                      {editandoPrtId && <Btn full onClick={limpiarFormPrestamoTercero}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Personas registradas</p>
                  {(catalog.prestamosTerceros || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin personas aún.</p>}
                  {(catalog.prestamosTerceros || []).map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: "#fff" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {p.direccion === "a Tercero" ? "Me debe a mí" : "Yo le debo"}{p.nota ? ` · ${p.nota}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => editarPrestamoTercero(p)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarPrestamoTercero(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : newCatTipo === "Familia" ? (
            <div>
              <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                  {editandoFamId ? "Editar familiar" : "Agregar familiar"}
                </p>
                <Field label="Nombre">
                  <input type="text" value={famNombre} onChange={(e) => setFamNombre(e.target.value)} style={inputBase} placeholder="Ej. Mamá, Papá" />
                </Field>
                <Field label="Parentesco">
                  <input type="text" value={famParentesco} onChange={(e) => setFamParentesco(e.target.value)} style={inputBase} placeholder="Ej. Madre, Padre, Hermano" />
                </Field>
                <Field label="Categoría (opcional)">
                  <input type="text" value={famCategoria} onChange={(e) => setFamCategoria(e.target.value)} style={inputBase} placeholder="Ej. Nuclear, Papás" />
                </Field>
                <Field label="Método de pago (Aportación)">
                  <select value={famMetodo} onChange={(e) => { setFamMetodo(e.target.value); setFamCuenta(""); }} style={inputBase}>
                    {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {cuentasFamDisponibles.length > 0 && (
                  <Field label="Cuenta / tarjeta">
                    <select value={famCuenta} onChange={(e) => setFamCuenta(e.target.value)} style={inputBase}>
                      <option value="">Selecciona...</option>
                      {cuentasFamDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Meta de aportación (total a dar)">
                  <input type="number" inputMode="decimal" value={famMeta} onChange={(e) => setFamMeta(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <Field label="Plazo (meses)">
                  <input type="number" inputMode="numeric" value={famPlazo} onChange={(e) => setFamPlazo(e.target.value)} style={inputBase} placeholder="Ej. 12" />
                </Field>
                <Field label="Aportación mensual">
                  <input type="number" inputMode="decimal" value={famAportacion} onChange={(e) => setFamAportacion(e.target.value)} style={inputBase} placeholder="$0.00" />
                </Field>
                <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                  Pagos a TDC se registran aparte con monto libre cada vez — no necesitan meta fija.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Btn primary full onClick={guardarFamiliar}>{editandoFamId ? "Guardar cambios" : "Agregar familiar"}</Btn>
                  {editandoFamId && <Btn full onClick={limpiarFormFamiliar}>Cancelar</Btn>}
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus familiares</p>
              {(catalog.familiares || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin familiares aún.</p>}
              {(catalog.familiares || []).map((f) => (
                <div key={f.id} style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 8, background: f.activa ? "#fff" : SHEET.gris }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{f.nombre}
                        {f.parentesco && <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}> · {f.parentesco}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>
                        Meta {fmt(f.meta || 0)} · {f.plazoMeses || 0} meses · Aport. {fmt(f.aportacion || 0)}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <button onClick={() => toggleActivaFamiliar(f.id)} style={{
                        fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3,
                        cursor: "pointer", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
                        background: f.activa ? SHEET.verde : "#fff", color: SHEET.texto
                      }}>{f.activa ? "Activo" : "Inactivo"}</button>
                      <button onClick={() => editarFamiliar(f)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                      <button onClick={() => eliminarFamiliar(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <ListEditor title={`Categorías de ${newCatTipo}`} items={categoriasDelTipo}
                onAdd={(v) => {
                  const next = JSON.parse(JSON.stringify(catalog));
                  if (!Array.isArray(next.categorias[newCatTipo])) next.categorias[newCatTipo] = [];
                  if (!next.categorias[newCatTipo].includes(v)) next.categorias[newCatTipo].push(v);
                  if (!next.subcategorias[v]) next.subcategorias[v] = [];
                  setCatalog(next);
                  guardarAhora(next);
                  setNewSubcatCategoria(v);
                }}
                onRemove={(v) => removeFromList(["categorias", newCatTipo], v)} />
              {categoriasDelTipo.length > 0 && (
                <>
                  <Field label="Categoría">
                <select value={subcatActual} onChange={(e) => setNewSubcatCategoria(e.target.value)} style={inputBase}>
                  {categoriasDelTipo.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {subcatActual === "Seguros" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoSegId ? "Editar seguro" : "Agregar seguro"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={segNombre} onChange={(e) => setSegNombre(e.target.value)} style={inputBase} placeholder="Ej. GNP GMM" />
                    </Field>
                    <Field label="Categoría">
                      <input type="text" value={segCategoria} onChange={(e) => setSegCategoria(e.target.value)} style={inputBase} placeholder="Ej. GMM, Vida, Automotriz" />
                    </Field>
                    <Field label="# de Póliza">
                      <input type="text" value={segPoliza} onChange={(e) => setSegPoliza(e.target.value)} style={inputBase} placeholder="Ej. 00000705567188" />
                    </Field>
                    <Field label="Método de pago">
                      <select value={segMetodo} onChange={(e) => { setSegMetodo(e.target.value); setSegCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasSegDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={segCuenta} onChange={(e) => setSegCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasSegDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Costo">
                      <input type="number" inputMode="decimal" value={segCosto} onChange={(e) => setSegCosto(e.target.value)} style={inputBase} placeholder="$0.00" />
                    </Field>
                    <Field label="Frecuencia">
                      <select value={segFrecuencia} onChange={(e) => setSegFrecuencia(e.target.value)} style={inputBase}>
                        {["Semanal", "Quincenal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="¿Cómo se paga?">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Automático", "Manual"].map((t) => (
                          <button key={t} onClick={() => setSegTipo(t)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: segTipo === t ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: segTipo === t ? SHEET.azul : "#fff"
                          }}>{t}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Día de pago (1-30)">
                      <input type="number" inputMode="numeric" min="1" max="30" value={segDia} onChange={(e) => setSegDia(e.target.value)} style={inputBase} />
                    </Field>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarSeguro}>{editandoSegId ? "Guardar cambios" : "Agregar seguro"}</Btn>
                      {editandoSegId && <Btn full onClick={limpiarFormSeguro}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus seguros</p>
                  {(catalog.seguros || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin seguros aún.</p>}
                  {(catalog.seguros || []).map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: s.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {fmt(s.costo)} · {s.frecuencia} · {s.tipoPago} · día {s.diaPago}{s.poliza ? ` · Póliza ${s.poliza}` : ""}{s.cuenta ? ` · ${s.cuenta}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => toggleActivaSeguro(s.id)} style={{
                          fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto
                        }}>{s.activa ? "Activa" : "Inactiva"}</button>
                        <button onClick={() => editarSeguro(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarSeguro(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : subcatActual === "Servicios" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoServId ? "Editar servicio" : "Agregar servicio"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={servNombre} onChange={(e) => setServNombre(e.target.value)} style={inputBase} placeholder="Ej. CFE, Telmex" />
                    </Field>
                    <Field label="Categoría">
                      <input type="text" value={servCategoria} onChange={(e) => setServCategoria(e.target.value)} style={inputBase} placeholder="Ej. Casa/Hogar" />
                    </Field>
                    <Field label="Método de pago">
                      <select value={servMetodo} onChange={(e) => { setServMetodo(e.target.value); setServCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasServDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={servCuenta} onChange={(e) => setServCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasServDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, padding: "8px 10px", background: SHEET.gris, borderRadius: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic" }}>¿Es de monto variable? (ej. luz, agua, gas)</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setServVariable(true); setServCosto(""); }} style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: servVariable ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: servVariable ? SHEET.azul : "#fff"
                        }}>Sí</button>
                        <button onClick={() => setServVariable(false)} style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: !servVariable ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                          background: !servVariable ? SHEET.azul : "#fff"
                        }}>No</button>
                      </div>
                    </div>
                    {!servVariable && (
                      <Field label="Costo">
                        <input type="number" inputMode="decimal" value={servCosto} onChange={(e) => setServCosto(e.target.value)} style={inputBase} placeholder="$0.00" />
                      </Field>
                    )}
                    <Field label="Frecuencia">
                      <select value={servFrecuencia} onChange={(e) => setServFrecuencia(e.target.value)} style={inputBase}>
                        {["Semanal", "Quincenal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    {servVariable && (
                      <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                        No pasa nada, registra el monto real cada vez que pagues desde Registro.
                      </p>
                    )}
                    <Field label="¿Cómo se paga?">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Automático", "Manual"].map((t) => (
                          <button key={t} onClick={() => setServTipo(t)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: servTipo === t ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: servTipo === t ? SHEET.azul : "#fff"
                          }}>{t}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Día de pago (1-30)">
                      <input type="number" inputMode="numeric" min="1" max="30" value={servDia} onChange={(e) => setServDia(e.target.value)} style={inputBase} />
                    </Field>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarServicio}>{editandoServId ? "Guardar cambios" : "Agregar servicio"}</Btn>
                      {editandoServId && <Btn full onClick={limpiarFormServicio}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus servicios</p>
                  {(catalog.servicios || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin servicios aún.</p>}
                  {(catalog.servicios || []).map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: s.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {s.esVariable ? "Variable" : fmt(s.costo)} · {s.frecuencia} · {s.tipoPago} · día {s.diaPago}{s.cuenta ? ` · ${s.cuenta}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => toggleActivaServicio(s.id)} style={{
                          fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto
                        }}>{s.activa ? "Activa" : "Inactiva"}</button>
                        <button onClick={() => editarServicio(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarServicio(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : subcatActual === "Membresías" ? (
                <div>
                  <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>
                      {editandoMemId ? "Editar membresía" : "Agregar membresía"}
                    </p>
                    <Field label="Nombre">
                      <input type="text" value={memNombre} onChange={(e) => setMemNombre(e.target.value)} style={inputBase} placeholder="Ej. Netflix" />
                    </Field>
                    <Field label="Categoría">
                      <input type="text" value={memCategoria} onChange={(e) => setMemCategoria(e.target.value)} style={inputBase} placeholder="Ej. Entretenimiento" />
                    </Field>
                    <Field label="Método de pago">
                      <select value={memMetodo} onChange={(e) => { setMemMetodo(e.target.value); setMemCuenta(""); }} style={inputBase}>
                        {catalog.metodos.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    {cuentasMemDisponibles.length > 0 && (
                      <Field label="Cuenta / tarjeta">
                        <select value={memCuenta} onChange={(e) => setMemCuenta(e.target.value)} style={inputBase}>
                          <option value="">Selecciona...</option>
                          {cuentasMemDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Costo">
                      <input type="number" inputMode="decimal" value={memCosto} onChange={(e) => setMemCosto(e.target.value)} style={inputBase} placeholder="$0.00" />
                    </Field>
                    <Field label="Frecuencia">
                      <select value={memFrecuencia} onChange={(e) => setMemFrecuencia(e.target.value)} style={inputBase}>
                        {["Semanal", "Quincenal", "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="¿Cómo se paga?">
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Automático", "Manual"].map((t) => (
                          <button key={t} onClick={() => setMemTipo(t)} style={{
                            flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                            border: memTipo === t ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
                            background: memTipo === t ? SHEET.azul : "#fff"
                          }}>{t}</button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Día de pago (1-30)">
                      <input type="number" inputMode="numeric" min="1" max="30" value={memDia} onChange={(e) => setMemDia(e.target.value)} style={inputBase} />
                    </Field>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <Btn primary full onClick={guardarMembresia}>{editandoMemId ? "Guardar cambios" : "Agregar membresía"}</Btn>
                      {editandoMemId && <Btn full onClick={limpiarFormMembresia}>Cancelar</Btn>}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", margin: "0 0 8px" }}>Tus membresías</p>
                  {(catalog.membresias || []).length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin membresías aún.</p>}
                  {(catalog.membresias || []).map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "8px 10px", marginBottom: 6, background: m.activa ? "#fff" : SHEET.gris }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{m.nombre}</p>
                        <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>
                          {fmt(m.costo)} · {m.frecuencia} · {m.tipoPago} · día {m.diaPago}{m.cuenta ? ` · ${m.cuenta}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => toggleActivaMembresia(m.id)} style={{
                          fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
                          border: "1px solid " + SHEET.grisBorde, background: m.activa ? SHEET.verde : "#fff", color: SHEET.texto
                        }}>{m.activa ? "Activa" : "Inactiva"}</button>
                        <button onClick={() => editarMembresia(m)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✎</button>
                        <button onClick={() => eliminarMembresia(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ListEditor title={`Subcategorías de ${subcatActual}`} items={catalog.subcategorias[subcatActual] || []}
                  onAdd={(v) => addToList(["subcategorias", subcatActual], v)} onRemove={(v) => removeFromList(["subcategorias", subcatActual], v)} />
              )}
            </>
          )}
            </>
          )}
        </div>
      )}
      {section === "ingresos" && (
        <div>
          <ListEditor title="Tipos de ingreso" items={catalog.ingresoTipos}
            onAdd={(v) => {
              const next = JSON.parse(JSON.stringify(catalog));
              if (!next.ingresoTipos.includes(v)) next.ingresoTipos.push(v);
              if (!next.ingresoSub[v]) next.ingresoSub[v] = [];
              setCatalog(next);
              guardarAhora(next);
              setNewIngresoTipo(v);
            }}
            onRemove={(v) => removeFromList(["ingresoTipos"], v)} />
          {catalog.ingresoTipos.length > 0 && (
            <>
              <Field label="Tipo de ingreso">
                <select value={newIngresoTipo} onChange={(e) => setNewIngresoTipo(e.target.value)} style={inputBase}>
                  {catalog.ingresoTipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <ListEditor title={`Detalle / subcategoría de ${newIngresoTipo}`} items={catalog.ingresoSub[newIngresoTipo] || []}
                onAdd={(v) => addToList(["ingresoSub", newIngresoTipo], v)} onRemove={(v) => removeFromList(["ingresoSub", newIngresoTipo], v)} />
            </>
          )}
        </div>
      )}
      {section === "lugares" && <ListEditor title="Lugares frecuentes" items={catalog.lugares} onAdd={(v) => addToList(["lugares"], v)} onRemove={(v) => removeFromList(["lugares"], v)} />}

      {section === "presupuestos" && (
        <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, overflow: "hidden" }}>
          <HeaderBand color={SHEET.rosa} borderColor={SHEET.rosaBorde}>Presupuesto mensual por categoría</HeaderBand>
          <div style={{ background: "#fff", padding: "12px 14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.keys(catalog.presupuestos).map((cat, i) => (
                <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", background: i % 2 === 0 ? "#fff" : SHEET.gris }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{cat}</span>
                  <input type="number" value={catalog.presupuestos[cat]}
                    onChange={(e) => { const v = parseFloat(e.target.value) || 0; setCatalog((prev) => ({ ...prev, presupuestos: { ...prev.presupuestos, [cat]: v } })); }}
                    style={{ ...inputBase, width: 110, textAlign: "right", border: `2px solid ${SHEET.rojo}` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiferidosTab({ diferidos, registrarPago, eliminarDiferido, userEmail }) {
  const [pagandoId, setPagandoId] = useState(null);
  const [montoPago, setMontoPago] = useState("");
  const [fechaPago, setFechaPago] = useState(todayISO());

  const activos = diferidos.filter((d) => d.activo);
  const inactivos = diferidos.filter((d) => !d.activo);

  function abrirPago(d) {
    setPagandoId(d.id);
    setMontoPago(String(d.aportacion));
    setFechaPago(todayISO());
  }

  async function confirmarPago() {
    const monto = parseFloat(montoPago);
    if (!monto || monto <= 0 || !fechaPago) return;
    await registrarPago(pagandoId, monto, fechaPago);
    setPagandoId(null);
  }

  function Tarjeta({ d }) {
    const pendiente = Math.round((d.costoTotal - d.pagado) * 100) / 100;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: d.activo ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
              {d.nombre ? d.nombre : `${d.categoria}${d.subcategoria ? ` · ${d.subcategoria}` : ""}`}
            </p>
            {d.nombre && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{d.categoria}{d.subcategoria ? ` · ${d.subcategoria}` : ""}</p>}
            {d.descripcion && <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "1px 0 0" }}>{d.descripcion}</p>}
            <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>{d.tarjeta} · desde {fmtDate(d.inicio)}</p>
          </div>
          <button aria-label="Eliminar" onClick={() => eliminarDiferido(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: SHEET.rosaBorde, padding: 2, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Total</span><br /><b>{fmt(d.costoTotal)}</b></div>
          <div><span style={{ color: "#777" }}>Pagado</span><br /><b>{fmt(d.pagado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic" }}>
          Pago {d.pagos} / {d.plazoMeses} · Mensualidad {fmt(d.aportacion)}{d.ultPago ? ` · Últ. pago ${fmtDate(d.ultPago)}` : ""}
        </p>
        {d.activo && (
          pagandoId === d.id ? (
            <div style={{ marginTop: 8, padding: "8px", background: SHEET.gris, borderRadius: 3 }}>
              <Field label="Monto del pago">
                <input type="number" inputMode="decimal" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} style={inputBase} />
              </Field>
              <Field label="Fecha de pago">
                <div style={{ width: "100%", overflow: "hidden", borderRadius: 2 }}>
                  <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)}
                    style={{ display: "block", width: "100%", boxSizing: "border-box", fontFamily: SHEET.fuente, borderRadius: 2, padding: "8px 6px", fontSize: 14, border: "1px solid " + SHEET.grisBorde }} />
                </div>
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn primary full onClick={confirmarPago}>Confirmar pago</Btn>
                <Btn full onClick={() => setPagandoId(null)}>Cancelar</Btn>
              </div>
            </div>
          ) : (
            <Btn primary full onClick={() => abrirPago(d)} style={{ marginTop: 8 }}>Registrar pago de este mes</Btn>
          )
        )}
      </div>
    );
  }

  function exportarCSV() {
    const headers = ["Activo/Inactivo", "Nombre", "Categoría", "Subcategoría", "Tarjeta", "Costo Total", "Plazo (meses)", "Aportación", "#Pago", "Pagado", "Pendiente", "Últ. Pago", "Inicio", "Notas"];
    const filas = diferidos.map((d) => {
      const pendiente = Math.round((d.costoTotal - d.pagado) * 100) / 100;
      return [
        d.activo ? "Activo" : "Inactivo", d.nombre || "", d.categoria || "", d.subcategoria || "", d.tarjeta || "",
        d.costoTotal, d.plazoMeses, d.aportacion, `${d.pagos}/${d.plazoMeses}`, d.pagado, pendiente,
        d.ultPago ? fmtDate(d.ultPago) : "", d.inicio ? fmtDate(d.inicio) : "", d.descripcion || ""
      ];
    });
    const totalCosto = diferidos.reduce((s, d) => s + d.costoTotal, 0);
    const totalAportacion = diferidos.reduce((s, d) => s + d.aportacion, 0);
    const totalPagado = diferidos.reduce((s, d) => s + d.pagado, 0);
    const totalPendiente = diferidos.reduce((s, d) => s + Math.round((d.costoTotal - d.pagado) * 100) / 100, 0);
    const filaTotal = ["", "Total", "", "", "", totalCosto, "", totalAportacion, "", totalPagado, totalPendiente, "", "", ""];
    const escape = (v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const encabezado = [[`Estado de cuenta de Diferidos TDC`], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Diferidos_TDC_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = diferidos.map((d) => {
      const pendiente = Math.round((d.costoTotal - d.pagado) * 100) / 100;
      return `<tr>
        <td>${d.activo ? "Activo" : "Inactivo"}</td>
        <td>${d.nombre || "-"}</td>
        <td>${d.categoria || ""}${d.subcategoria ? " · " + d.subcategoria : ""}</td>
        <td>${d.tarjeta || ""}</td>
        <td class="num">${fmt(d.costoTotal)}</td>
        <td class="num">${d.plazoMeses}</td>
        <td class="num">${fmt(d.aportacion)}</td>
        <td class="num">${d.pagos}/${d.plazoMeses}</td>
        <td class="num">${fmt(d.pagado)}</td>
        <td class="num">${fmt(pendiente)}</td>
        <td>${d.ultPago ? fmtDate(d.ultPago) : "-"}</td>
        <td>${d.inicio ? fmtDate(d.inicio) : "-"}</td>
      </tr>`;
    }).join("");
    const totalCosto = diferidos.reduce((s, d) => s + d.costoTotal, 0);
    const totalAportacion = diferidos.reduce((s, d) => s + d.aportacion, 0);
    const totalPagado = diferidos.reduce((s, d) => s + d.pagado, 0);
    const totalPendiente = diferidos.reduce((s, d) => s + Math.round((d.costoTotal - d.pagado) * 100) / 100, 0);
    const filaTotal = `<tr class="total">
        <td colspan="4">Total</td>
        <td class="num">${fmt(totalCosto)}</td>
        <td></td>
        <td class="num">${fmt(totalAportacion)}</td>
        <td></td>
        <td class="num">${fmt(totalPagado)}</td>
        <td class="num">${fmt(totalPendiente)}</td>
        <td></td><td></td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pagos Diferidos TDC</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Pagos Diferidos TDC</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Tarjeta</th>
            <th class="num">Costo Total</th><th class="num">Plazo</th><th class="num">Aportación</th>
            <th class="num">#Pago</th><th class="num">Pagado</th><th class="num">Pendiente</th>
            <th>Últ. Pago</th><th>Inicio</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activos</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes diferidos activos. Regístralos desde la pestaña Registro al elegir TDC.</p>}
      {activos.map((d) => <Tarjeta key={d.id} d={d} />)}

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Liquidados</h3>
          {inactivos.map((d) => <Tarjeta key={d.id} d={d} />)}
        </>
      )}
    </div>
  );
}

function MembresiasTab({ membresias, toggleActiva, movimientos, userEmail }) {
  const activas = membresias.filter((m) => m.activa);
  const inactivas = membresias.filter((m) => !m.activa);
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function pagosPorMes(nombreMembresia) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Membresías" && mv.subcategoria === nombreMembresia) {
        const mesIdx = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) totales[mesIdx] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function ultimoPagoDe(nombreMembresia) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Membresías" && mv.subcategoria === nombreMembresia);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "Método", "Costo", "Frecuencia", "Tipo de pago", "Últ. Pago", "Pagado", ...mesesLabel, "Total año"];
    const filas = membresias.map((m) => {
      const porMes = pagosPorMes(m.nombre);
      const totalAnio = porMes.reduce((s, v) => s + v, 0);
      const ultPago = ultimoPagoDe(m.nombre);
      return [
        m.activa ? "Activa" : "Inactiva", m.nombre, m.categoria || "", m.metodo || "", m.costo, m.frecuencia, m.tipoPago,
        ultPago ? fmtDate(ultPago) : "", totalAnio,
        ...porMes.map((v) => (v > 0 ? v : "")), totalAnio
      ];
    });
    const totalesPorMes = mesesLabel.map((_, i) => membresias.reduce((s, m) => s + pagosPorMes(m.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((s, v) => s + v, 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", totalGeneral, ...totalesPorMes, totalGeneral];
    const escape = (v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const encabezado = [["Estado de cuenta de Membresías"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Membresias_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = membresias.map((m) => {
      const porMes = pagosPorMes(m.nombre);
      const totalAnio = porMes.reduce((s, v) => s + v, 0);
      const ultPago = ultimoPagoDe(m.nombre);
      return `<tr>
        <td>${m.activa ? "Activa" : "Inactiva"}</td>
        <td>${m.nombre}</td>
        <td>${m.categoria || "-"}</td>
        <td>${m.metodo || "-"}</td>
        <td class="num">${fmt(m.costo)}</td>
        <td>${m.frecuencia}</td>
        <td>${m.tipoPago}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
        <td class="num">${fmt(totalAnio)}</td>
        ${porMes.map((v) => `<td class="num">${v > 0 ? fmt(v) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAnio)}</td>
      </tr>`;
    }).join("");
    const totalesPorMes = mesesLabel.map((_, i) => membresias.reduce((s, m) => s + pagosPorMes(m.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((s, v) => s + v, 0);
    const filaTotal = `<tr class="total">
        <td colspan="8">Total</td>
        <td class="num">${fmt(totalGeneral)}</td>
        ${totalesPorMes.map((v) => `<td class="num">${fmt(v)}</td>`).join("")}
        <td class="num">${fmt(totalGeneral)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Membresías</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 4px 5px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } table { font-size: 8px; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Membresías</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Método</th>
            <th class="num">Costo</th><th>Frecuencia</th><th>Tipo</th><th>Últ. Pago</th>
            <th class="num">Pagado</th>
            ${mesesLabel.map((m) => `<th class="num">${m}</th>`).join("")}
            <th class="num">Total año</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ m }) {
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: m.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{m.nombre}</p>
            {m.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{m.categoria}</p>}
          </div>
          <button onClick={() => toggleActiva(m.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: m.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{m.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Costo</span><br /><b>{fmt(m.costo)}</b></div>
          <div><span style={{ color: "#777" }}>Frecuencia</span><br /><b>{m.frecuencia}</b></div>
          <div><span style={{ color: "#777" }}>Pago</span><br /><b>{m.tipoPago}</b></div>
          <div><span style={{ color: "#777" }}>Día de pago</span><br /><b>{m.diaPago}</b></div>
        </div>
        <p style={{ fontSize: 11, color: "#555", margin: "8px 0 0" }}>
          {m.metodo}{m.cuenta ? ` · ${m.cuenta}` : ""}{m.ultimoPago ? ` · Últ. pago ${fmtDate(m.ultimoPago)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar un pago, ve a Registro → Egreso → Tipo "G. Fijo" → Categoría "Membresías" → elige la membresía.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activas.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes membresías activas. Agrégalas desde Datos → Egresos → G. Fijo → Membresías.</p>}
      {activas.map((m) => <Tarjeta key={m.id} m={m} />)}

      {inactivas.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivas.map((m) => <Tarjeta key={m.id} m={m} />)}
        </>
      )}
    </div>
  );
}

function ServiciosTab({ servicios, toggleActiva, movimientos, userEmail }) {
  const activos = servicios.filter((s) => s.activa);
  const inactivos = servicios.filter((s) => !s.activa);
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function pagosPorMes(nombreServicio) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Servicios" && mv.subcategoria === nombreServicio) {
        const mesIdx = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) totales[mesIdx] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function ultimoPagoDe(nombreServicio) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Servicios" && mv.subcategoria === nombreServicio);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activo/Inactivo", "Nombre", "Categoría", "Método", "Costo", "Frecuencia", "Tipo de pago", "Últ. Pago", "Pagado", ...mesesLabel, "Total año"];
    const filas = servicios.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return [
        s.activa ? "Activo" : "Inactivo", s.nombre, s.categoria || "", s.metodo || "", s.costo, s.frecuencia, s.tipoPago,
        ultPago ? fmtDate(ultPago) : "", totalAnio,
        ...porMes.map((v) => (v > 0 ? v : "")), totalAnio
      ];
    });
    const totalesPorMes = mesesLabel.map((_, i) => servicios.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", totalGeneral, ...totalesPorMes, totalGeneral];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Servicios"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Servicios_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = servicios.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return `<tr>
        <td>${s.activa ? "Activo" : "Inactivo"}</td>
        <td>${s.nombre}</td>
        <td>${s.categoria || "-"}</td>
        <td>${s.metodo || "-"}</td>
        <td class="num">${s.esVariable ? "Variable" : fmt(s.costo)}</td>
        <td>${s.frecuencia}</td>
        <td>${s.tipoPago}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
        <td class="num">${fmt(totalAnio)}</td>
        ${porMes.map((v) => `<td class="num">${v > 0 ? fmt(v) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAnio)}</td>
      </tr>`;
    }).join("");
    const totalesPorMes = mesesLabel.map((_, i) => servicios.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = `<tr class="total">
        <td colspan="8">Total</td>
        <td class="num">${fmt(totalGeneral)}</td>
        ${totalesPorMes.map((v) => `<td class="num">${fmt(v)}</td>`).join("")}
        <td class="num">${fmt(totalGeneral)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Servicios</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 4px 5px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } table { font-size: 8px; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Servicios</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Método</th>
            <th class="num">Costo</th><th>Frecuencia</th><th>Tipo</th><th>Últ. Pago</th>
            <th class="num">Pagado</th>
            ${mesesLabel.map((m) => `<th class="num">${m}</th>`).join("")}
            <th class="num">Total año</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ s }) {
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: s.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
            {s.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{s.categoria}</p>}
          </div>
          <button onClick={() => toggleActiva(s.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{s.activa ? "Activo" : "Inactivo"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Costo</span><br /><b>{s.esVariable ? "Variable" : fmt(s.costo)}</b></div>
          <div><span style={{ color: "#777" }}>Frecuencia</span><br /><b>{s.frecuencia}</b></div>
          <div><span style={{ color: "#777" }}>Pago</span><br /><b>{s.tipoPago}</b></div>
          <div><span style={{ color: "#777" }}>Día de pago</span><br /><b>{s.diaPago}</b></div>
        </div>
        <p style={{ fontSize: 11, color: "#555", margin: "8px 0 0" }}>
          {s.metodo}{s.cuenta ? ` · ${s.cuenta}` : ""}{s.ultimoPago ? ` · Últ. pago ${fmtDate(s.ultimoPago)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar un pago, ve a Registro → Egreso → Tipo "G. Fijo" → Categoría "Servicios" → elige el servicio.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activos</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes servicios activos. Agrégalos desde Datos → Egresos → G. Fijo → Servicios.</p>}
      {activos.map((s) => <Tarjeta key={s.id} s={s} />)}

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivos</h3>
          {inactivos.map((s) => <Tarjeta key={s.id} s={s} />)}
        </>
      )}
    </div>
  );
}

function SegurosTab({ seguros, toggleActiva, movimientos, userEmail }) {
  const activos = seguros.filter((s) => s.activa);
  const inactivos = seguros.filter((s) => !s.activa);
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function pagosPorMes(nombreSeguro) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Seguros" && mv.subcategoria === nombreSeguro) {
        const mesIdx = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (mesIdx >= 0 && mesIdx < 12) totales[mesIdx] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function ultimoPagoDe(nombreSeguro) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Seguros" && mv.subcategoria === nombreSeguro);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "# de Póliza", "Método", "Costo", "Frecuencia", "Tipo de pago", "Últ. Pago", "Pagado", ...mesesLabel, "Total año"];
    const filas = seguros.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return [
        s.activa ? "Activa" : "Inactiva", s.nombre, s.categoria || "", s.poliza || "", s.metodo || "", s.costo, s.frecuencia, s.tipoPago,
        ultPago ? fmtDate(ultPago) : "", totalAnio,
        ...porMes.map((v) => (v > 0 ? v : "")), totalAnio
      ];
    });
    const totalesPorMes = mesesLabel.map((_, i) => seguros.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", "", totalGeneral, ...totalesPorMes, totalGeneral];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Seguros"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Seguros_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = seguros.map((s) => {
      const porMes = pagosPorMes(s.nombre);
      const totalAnio = porMes.reduce((sum, v) => sum + v, 0);
      const ultPago = ultimoPagoDe(s.nombre);
      return `<tr>
        <td>${s.activa ? "Activa" : "Inactiva"}</td>
        <td>${s.nombre}</td>
        <td>${s.categoria || "-"}</td>
        <td>${s.poliza || "-"}</td>
        <td>${s.metodo || "-"}</td>
        <td class="num">${fmt(s.costo)}</td>
        <td>${s.frecuencia}</td>
        <td>${s.tipoPago}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
        <td class="num">${fmt(totalAnio)}</td>
        ${porMes.map((v) => `<td class="num">${v > 0 ? fmt(v) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAnio)}</td>
      </tr>`;
    }).join("");
    const totalesPorMes = mesesLabel.map((_, i) => seguros.reduce((sum, s) => sum + pagosPorMes(s.nombre)[i], 0));
    const totalGeneral = totalesPorMes.reduce((sum, v) => sum + v, 0);
    const filaTotal = `<tr class="total">
        <td colspan="9">Total</td>
        <td class="num">${fmt(totalGeneral)}</td>
        ${totalesPorMes.map((v) => `<td class="num">${fmt(v)}</td>`).join("")}
        <td class="num">${fmt(totalGeneral)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Seguros</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 4px 5px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } table { font-size: 8px; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Seguros</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th># Póliza</th><th>Método</th>
            <th class="num">Costo</th><th>Frecuencia</th><th>Tipo</th><th>Últ. Pago</th>
            <th class="num">Pagado</th>
            ${mesesLabel.map((m) => `<th class="num">${m}</th>`).join("")}
            <th class="num">Total año</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ s }) {
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: s.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{s.nombre}</p>
            {s.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{s.categoria}{s.poliza ? ` · Póliza ${s.poliza}` : ""}</p>}
          </div>
          <button onClick={() => toggleActiva(s.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: s.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{s.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Costo</span><br /><b>{fmt(s.costo)}</b></div>
          <div><span style={{ color: "#777" }}>Frecuencia</span><br /><b>{s.frecuencia}</b></div>
          <div><span style={{ color: "#777" }}>Pago</span><br /><b>{s.tipoPago}</b></div>
          <div><span style={{ color: "#777" }}>Día de pago</span><br /><b>{s.diaPago}</b></div>
        </div>
        <p style={{ fontSize: 11, color: "#555", margin: "8px 0 0" }}>
          {s.metodo}{s.cuenta ? ` · ${s.cuenta}` : ""}{s.ultimoPago ? ` · Últ. pago ${fmtDate(s.ultimoPago)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar un pago, ve a Registro → Egreso → Tipo "G. Fijo" → Categoría "Seguros" → elige el seguro.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes seguros activos. Agrégalos desde Datos → Egresos → G. Fijo → Seguros.</p>}
      {activos.map((s) => <Tarjeta key={s.id} s={s} />)}

      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivos.map((s) => <Tarjeta key={s.id} s={s} />)}
        </>
      )}
    </div>
  );
}

function PrestamosTab({ prestamosBancarios, prestamosTerceros, toggleActivaBancario, movimientos, userEmail }) {
  const [vista, setVista] = useState("debo");
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function saldoTerceroDe(nombre, direccion) {
    const prestado = movimientos
      .filter((mv) => mv.subcategoria === nombre && mv.categoria === direccion && mv.tipo === "Préstamo" &&
        ((direccion === "a Tercero" && mv.mov === "Egreso") || (direccion === "de Tercero" && mv.mov === "Ingreso")))
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
    const abonado = movimientos
      .filter((mv) => mv.subcategoria === nombre && mv.categoria === direccion && mv.tipo === "Préstamo" &&
        ((direccion === "a Tercero" && mv.mov === "Ingreso") || (direccion === "de Tercero" && mv.mov === "Egreso")))
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
    return { prestado, abonado, saldo: prestado - abonado };
  }

  const bancariosActivos = prestamosBancarios.filter((p) => p.activa);
  const bancariosLiquidados = prestamosBancarios.filter((p) => !p.activa);
  const tercerosMeDeben = prestamosTerceros.filter((p) => p.direccion === "a Tercero");
  const tercerosYoDebo = prestamosTerceros.filter((p) => p.direccion === "de Tercero");

  function exportarCSVBancarios() {
    const headers = ["Estatus", "Nombre", "Categoría", "Frecuencia", "Método", "Monto financiado", "Pago/periodo", "Núm. pagos", "Total a pagar", "Acumulado", "Pendiente", "Últ. Pago"];
    const filas = prestamosBancarios.map((p) => {
      const acumulado = p.acumulado || 0;
      const totalAPagar = p.totalAPagar || 0;
      return [p.activa ? "Activo" : "Liquidado", p.nombre, p.categoria, p.frecuencia || "Mensual", p.metodo || "",
        p.montoFinanciado || 0, p.pagoPeriodo || 0, p.numPagos || 0, totalAPagar, acumulado,
        Math.max(0, totalAPagar - acumulado), p.ultimoPago ? fmtDate(p.ultimoPago) : ""];
    });
    const totalTotal = prestamosBancarios.reduce((s, p) => s + (p.totalAPagar || 0), 0);
    const totalAcumulado = prestamosBancarios.reduce((s, p) => s + (p.acumulado || 0), 0);
    const filaTotal = ["", "Total", "", "", "", "", "", "", totalTotal, totalAcumulado, Math.max(0, totalTotal - totalAcumulado), ""];
    const escape = (v) => { const str = String(v ?? ""); return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str; };
    const encabezado = [["Préstamos Bancario/Crédito"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Prestamos_Bancarios_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function exportarPDFBancarios() {
    const filas = prestamosBancarios.map((p) => {
      const acumulado = p.acumulado || 0;
      const totalAPagar = p.totalAPagar || 0;
      const pendiente = Math.max(0, totalAPagar - acumulado);
      const pagosRestantes = p.pagoPeriodo > 0 ? Math.ceil(pendiente / p.pagoPeriodo) : 0;
      return `<tr>
        <td>${p.activa ? "Activo" : "Liquidado"}</td><td>${p.nombre}</td><td>${p.categoria}</td>
        <td>${p.frecuencia || "Mensual"}</td><td>${p.metodo || "-"}</td>
        <td class="num">${fmt(p.montoFinanciado || 0)}</td><td class="num">${fmt(p.pagoPeriodo || 0)}</td>
        <td class="num">${p.numPagos || 0}</td><td class="num">${fmt(totalAPagar)}</td>
        <td class="num">${fmt(acumulado)}</td><td class="num">${fmt(pendiente)}</td>
        <td class="num">${pagosRestantes}</td><td>${p.ultimoPago ? fmtDate(p.ultimoPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalTotal = prestamosBancarios.reduce((s, p) => s + (p.totalAPagar || 0), 0);
    const totalAcumulado = prestamosBancarios.reduce((s, p) => s + (p.acumulado || 0), 0);
    const filaTotal = `<tr class="total"><td colspan="8">Total</td>
      <td class="num">${fmt(totalTotal)}</td><td class="num">${fmt(totalAcumulado)}</td>
      <td class="num">${fmt(Math.max(0, totalTotal - totalAcumulado))}</td><td></td><td></td></tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Préstamos</title>
      <style>body{font-family:Calibri,Arial,sans-serif;padding:24px}h1{font-size:20px;margin:0 0 4px}p.sub{font-size:12px;color:#555;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;font-size:9px;margin-top:14px}th,td{border:1px solid #999;padding:4px 5px;text-align:left}
      th{background:#F4CCCC;font-weight:700}td.num,th.num{text-align:right}tr.total td{font-weight:700;background:#FFF2CC}@media print{body{padding:0}}</style></head>
      <body><h1>Préstamos Bancario/Crédito</h1><p class="sub">Usuario: ${userEmail || ""}</p><p class="sub">Generado el ${fmtDate(todayISO())}</p>
      <table><thead><tr><th>Estatus</th><th>Nombre</th><th>Cat.</th><th>Frec.</th><th>Método</th>
        <th class="num">Financiado</th><th class="num">Pago/periodo</th><th class="num">Pagos</th>
        <th class="num">Total</th><th class="num">Acumulado</th><th class="num">Pendiente</th><th class="num">Pagos rest.</th><th>Últ. Pago</th>
      </tr></thead><tbody>${filas}${filaTotal}</tbody></table>
      <script>window.onload=()=>{window.print();}</script></body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function exportarCSVTerceros() {
    const headers = ["Persona", "Quién debe", "Nota", "Prestado", "Abonado", "Saldo pendiente"];
    const filas = prestamosTerceros.map((p) => {
      const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
      return [p.nombre, p.direccion === "a Tercero" ? "Me debe a mí" : "Yo le debo", p.nota || "", prestado, abonado, saldo];
    });
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Préstamos de/a Terceros"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Prestamos_Terceros_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDFTerceros() {
    const filas = prestamosTerceros.map((p) => {
      const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
      return `<tr>
        <td>${p.nombre}</td>
        <td>${p.direccion === "a Tercero" ? "Me debe a mí" : "Yo le debo"}</td>
        <td>${p.nota || "-"}</td>
        <td class="num">${fmt(prestado)}</td>
        <td class="num">${fmt(abonado)}</td>
        <td class="num">${fmt(saldo)}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Préstamos de/a Terceros</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Préstamos de/a Terceros</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr><th>Persona</th><th>Quién debe</th><th>Nota</th><th class="num">Prestado</th><th class="num">Abonado</th><th class="num">Saldo</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function TarjetaBancario({ p }) {
    const acumulado = p.acumulado || 0;
    const totalAPagar = p.totalAPagar || 0;
    const pendiente = Math.max(0, totalAPagar - acumulado);
    const pagosRestantes = p.pagoPeriodo > 0 ? Math.ceil(pendiente / p.pagoPeriodo) : 0;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: p.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre} <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}>({p.categoria})</span></p>
            <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{p.frecuencia || "Mensual"} · {p.metodo}{p.cuenta ? ` · ${p.cuenta}` : ""}</p>
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: p.activa ? SHEET.verde : SHEET.amarillo, color: SHEET.texto, flexShrink: 0
          }}>{p.activa ? "Activo" : "Liquidado"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Pago/periodo</span><br /><b>{fmt(p.pagoPeriodo || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Total a pagar</span><br /><b>{fmt(totalAPagar)}</b></div>
          <div><span style={{ color: "#777" }}>Pagos rest.</span><br /><b>{pagosRestantes}</b></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(acumulado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
          {(p.montoFinanciado || 0) > 0 && <div><span style={{ color: "#777" }}>Financiado</span><br /><b>{fmt(p.montoFinanciado)}</b></div>}
        </div>
        {p.ultimoPago && <p style={{ fontSize: 11, color: "#888", margin: "6px 0 0", fontStyle: "italic" }}>Último pago: {fmtDate(p.ultimoPago)}</p>}
      </div>
    );
  }

  function TarjetaTercero({ p }) {
    const { prestado, abonado, saldo } = saldoTerceroDe(p.nombre, p.direccion);
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{p.nombre}</p>
            {p.nota && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{p.nota}</p>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Prestado</span><br /><b>{fmt(prestado)}</b></div>
          <div><span style={{ color: "#777" }}>Abonado</span><br /><b>{fmt(abonado)}</b></div>
          <div><span style={{ color: "#777" }}>Saldo</span><br /><b>{fmt(saldo)}</b></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setVista("debo")} style={{
          flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
          border: vista === "debo" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
          background: vista === "debo" ? SHEET.azul : "#fff"
        }}>Debo</button>
        <button onClick={() => setVista("meDeben")} style={{
          flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 700, fontStyle: "italic", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
          border: vista === "meDeben" ? `1px solid ${SHEET.azulBorde}` : "1px solid " + SHEET.grisBorde,
          background: vista === "meDeben" ? SHEET.azul : "#fff"
        }}>Me deben</button>
      </div>

      {vista === "debo" ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Btn full onClick={exportarPDFBancarios} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
            <Btn full onClick={exportarCSVBancarios} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
          </div>
          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
            Para registrar un pago, ve a Registro → Egreso → Tipo "Préstamo" → Bancario o Crédito → elige el préstamo.
          </p>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Bancario / Crédito</h3>
          {bancariosActivos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes préstamos activos. Agrégalos desde Datos → Egresos → Tipo "Préstamo".</p>}
          {bancariosActivos.map((p) => <TarjetaBancario key={p.id} p={p} />)}

          {bancariosLiquidados.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Liquidados</h3>
              {bancariosLiquidados.map((p) => <TarjetaBancario key={p.id} p={p} />)}
            </>
          )}

          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "20px 0 10px" }}>Yo le debo a un tercero</h3>
          {tercerosYoDebo.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes deudas con terceros registradas.</p>}
          {tercerosYoDebo.map((p) => <TarjetaTercero key={p.id} p={p} />)}
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Btn full onClick={exportarPDFTerceros} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
            <Btn full onClick={exportarCSVTerceros} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
          </div>
          <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
            Para registrar un préstamo o abono, ve a Registro → Egreso o Ingreso → Tipo "Préstamo" → a Tercero / de Tercero → elige la persona.
          </p>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Me deben a mí</h3>
          {tercerosMeDeben.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Nadie te debe dinero registrado. Agrégalos desde Datos → Egresos → Tipo "Préstamo" → De/A Terceros.</p>}
          {tercerosMeDeben.map((p) => <TarjetaTercero key={p.id} p={p} />)}
        </>
      )}
    </div>
  );
}

function AhorroTab({ ahorros, toggleActiva, movimientos, userEmail }) {
  const activas = ahorros.filter((a) => a.activa);
  const inactivas = ahorros.filter((a) => !a.activa);

  function acumuladoDe(nombreAhorro) {
    return movimientos
      .filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreAhorro)
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
  }

  function ultimoPagoDe(nombreAhorro) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreAhorro);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "Descripción", "Método", "Meta", "Plazo (meses)", "Aportación", "Acumulado", "Pendiente", "Últ. Pago"];
    const filas = ahorros.map((a) => {
      const acumulado = acumuladoDe(a.nombre);
      const ultPago = ultimoPagoDe(a.nombre);
      return [a.activa ? "Activa" : "Inactiva", a.nombre, a.categoria || "", a.descripcion || "", a.metodo || "", a.meta, a.plazoMeses, a.aportacion, acumulado, Math.max(0, a.meta - acumulado), ultPago ? fmtDate(ultPago) : ""];
    });
    const totalMeta = ahorros.reduce((s, a) => s + a.meta, 0);
    const totalAcumulado = ahorros.reduce((s, a) => s + acumuladoDe(a.nombre), 0);
    const filaTotal = ["", "Total", "", "", "", totalMeta, "", "", totalAcumulado, Math.max(0, totalMeta - totalAcumulado), ""];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Ahorro"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a");
    a2.href = url; a2.download = `Ahorro_${todayISO()}.csv`;
    document.body.appendChild(a2); a2.click(); document.body.removeChild(a2);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = ahorros.map((a) => {
      const acumulado = acumuladoDe(a.nombre);
      const ultPago = ultimoPagoDe(a.nombre);
      return `<tr>
        <td>${a.activa ? "Activa" : "Inactiva"}</td>
        <td>${a.nombre}</td>
        <td>${a.categoria || "-"}</td>
        <td>${a.metodo || "-"}</td>
        <td class="num">${fmt(a.meta)}</td>
        <td class="num">${a.plazoMeses}</td>
        <td class="num">${fmt(a.aportacion)}</td>
        <td class="num">${fmt(acumulado)}</td>
        <td class="num">${fmt(Math.max(0, a.meta - acumulado))}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalMeta = ahorros.reduce((s, a) => s + a.meta, 0);
    const totalAcumulado = ahorros.reduce((s, a) => s + acumuladoDe(a.nombre), 0);
    const filaTotal = `<tr class="total">
        <td colspan="4">Total</td>
        <td class="num">${fmt(totalMeta)}</td>
        <td></td>
        <td></td>
        <td class="num">${fmt(totalAcumulado)}</td>
        <td class="num">${fmt(Math.max(0, totalMeta - totalAcumulado))}</td>
        <td></td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ahorro</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Ahorro</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Método</th>
            <th class="num">Meta</th><th class="num">Plazo</th><th class="num">Aportación</th>
            <th class="num">Acumulado</th><th class="num">Pendiente</th><th>Últ. Pago</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ a }) {
    const acumulado = acumuladoDe(a.nombre);
    const pendiente = Math.max(0, a.meta - acumulado);
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: a.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{a.nombre}</p>
            {a.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{a.categoria}{a.descripcion ? ` · ${a.descripcion}` : ""}</p>}
          </div>
          <button onClick={() => toggleActiva(a.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: a.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{a.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Meta</span><br /><b>{fmt(a.meta)}</b></div>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(acumulado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic" }}>
          Aportación {fmt(a.aportacion)} · {a.plazoMeses} meses · {a.metodo}{a.cuenta ? ` · ${a.cuenta}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar una aportación, ve a Registro → Egreso → Tipo "Ahorro" → elige el ahorro.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activas.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes ahorros activos. Agrégalos desde Datos → Egresos → Tipo "Ahorro".</p>}
      {activas.map((a) => <Tarjeta key={a.id} a={a} />)}

      {inactivas.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivas.map((a) => <Tarjeta key={a.id} a={a} />)}
        </>
      )}
    </div>
  );
}

function InversionTab({ inversiones, toggleActiva, movimientos, userEmail }) {
  const activas = inversiones.filter((i) => i.activa);
  const inactivas = inversiones.filter((i) => !i.activa);

  function acumuladoDe(nombreInversion) {
    return movimientos
      .filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreInversion)
      .reduce((sum, mv) => sum + Number(mv.cantidad), 0);
  }

  function ultimoPagoDe(nombreInversion) {
    const pagos = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === nombreInversion);
    if (pagos.length === 0) return null;
    return pagos.reduce((max, mv) => (mv.fecha > max ? mv.fecha : max), pagos[0].fecha);
  }

  function exportarCSV() {
    const headers = ["Activa/Inactiva", "Nombre", "Categoría", "Descripción", "Objetivo", "Método", "Meta", "Plazo (meses)", "Aportación", "Acumulado", "Pendiente", "Últ. Pago"];
    const filas = inversiones.map((i) => {
      const acumulado = acumuladoDe(i.nombre);
      const ultPago = ultimoPagoDe(i.nombre);
      return [i.activa ? "Activa" : "Inactiva", i.nombre, i.categoria || "", i.descripcion || "", i.objetivo || "", i.metodo || "", i.meta, i.plazoMeses, i.aportacion, acumulado, Math.max(0, i.meta - acumulado), ultPago ? fmtDate(ultPago) : ""];
    });
    const totalMeta = inversiones.reduce((s, i) => s + i.meta, 0);
    const totalAcumulado = inversiones.reduce((s, i) => s + acumuladoDe(i.nombre), 0);
    const filaTotal = ["", "Total", "", "", "", "", totalMeta, "", "", totalAcumulado, Math.max(0, totalMeta - totalAcumulado), ""];
    const escape = (v) => {
      const str = String(v ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const encabezado = [["Estado de cuenta de Inversión"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas, filaTotal].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Inversion_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = inversiones.map((i) => {
      const acumulado = acumuladoDe(i.nombre);
      const ultPago = ultimoPagoDe(i.nombre);
      return `<tr>
        <td>${i.activa ? "Activa" : "Inactiva"}</td>
        <td>${i.nombre}</td>
        <td>${i.categoria || "-"}</td>
        <td>${i.objetivo || "-"}</td>
        <td>${i.metodo || "-"}</td>
        <td class="num">${fmt(i.meta)}</td>
        <td class="num">${i.plazoMeses}</td>
        <td class="num">${fmt(i.aportacion)}</td>
        <td class="num">${fmt(acumulado)}</td>
        <td class="num">${fmt(Math.max(0, i.meta - acumulado))}</td>
        <td>${ultPago ? fmtDate(ultPago) : "-"}</td>
      </tr>`;
    }).join("");
    const totalMeta = inversiones.reduce((s, i) => s + i.meta, 0);
    const totalAcumulado = inversiones.reduce((s, i) => s + acumuladoDe(i.nombre), 0);
    const filaTotal = `<tr class="total">
        <td colspan="5">Total</td>
        <td class="num">${fmt(totalMeta)}</td>
        <td></td>
        <td></td>
        <td class="num">${fmt(totalAcumulado)}</td>
        <td class="num">${fmt(Math.max(0, totalMeta - totalAcumulado))}</td>
        <td></td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Inversión</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        tr.total td { font-weight: 700; background: #FFF2CC; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>Estado de cuenta de Inversión</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table>
          <thead><tr>
            <th>Estatus</th><th>Nombre</th><th>Categoría</th><th>Objetivo</th><th>Método</th>
            <th class="num">Meta</th><th class="num">Plazo</th><th class="num">Aportación</th>
            <th class="num">Acumulado</th><th class="num">Pendiente</th><th>Últ. Pago</th>
          </tr></thead>
          <tbody>${filas}${filaTotal}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ i }) {
    const acumulado = acumuladoDe(i.nombre);
    const pendiente = Math.max(0, i.meta - acumulado);
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: i.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{i.nombre}</p>
            {i.categoria && <p style={{ fontSize: 11, color: "#555", margin: "1px 0 0" }}>{i.categoria}{i.objetivo ? ` · ${i.objetivo}` : ""}</p>}
          </div>
          <button onClick={() => toggleActiva(i.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontFamily: SHEET.fuente,
            border: "1px solid " + SHEET.grisBorde, background: i.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{i.activa ? "Activa" : "Inactiva"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Meta</span><br /><b>{fmt(i.meta)}</b></div>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(acumulado)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic" }}>
          Aportación {fmt(i.aportacion)} · {i.plazoMeses} meses · {i.metodo}{i.cuenta ? ` · ${i.cuenta}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Para registrar una aportación, ve a Registro → Egreso → Tipo "Inversión" → elige la inversión.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activas</h3>
      {activas.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No tienes inversiones activas. Agrégalas desde Datos → Egresos → Tipo "Inversión".</p>}
      {activas.map((i) => <Tarjeta key={i.id} i={i} />)}

      {inactivas.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivas</h3>
          {inactivas.map((i) => <Tarjeta key={i.id} i={i} />)}
        </>
      )}
    </div>
  );
}

function FamiliaTab({ familiares, toggleActiva, movimientos, userEmail }) {
  const mesesLabel = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const activos = familiares.filter((f) => f.activa);
  const inactivos = familiares.filter((f) => !f.activa);

  function aportPorMes(nombreFamiliar) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Aportación" && mv.subcategoria === nombreFamiliar) {
        const i = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (i >= 0 && i < 12) totales[i] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function tdcPorMes(nombreFamiliar) {
    const totales = new Array(12).fill(0);
    movimientos.forEach((mv) => {
      if (mv.mov === "Egreso" && mv.categoria === "Pago TDC Familiar" && mv.subcategoria === nombreFamiliar) {
        const i = parseInt(mv.fecha.slice(5, 7), 10) - 1;
        if (i >= 0 && i < 12) totales[i] += Number(mv.cantidad);
      }
    });
    return totales;
  }

  function exportarCSV() {
    const headers = ["Familiar", "Parentesco", "Estatus", "Meta", "Plazo", "Aport. mensual", "Acum. Aport.", "Pendiente", "Acum. TDC", "Prom. TDC/mes",
      ...mesesLabel.flatMap((m) => [`${m} Aport.`, `${m} TDC`]), "Total Aport. año", "Total TDC año"];
    const filas = familiares.map((f) => {
      const ap = aportPorMes(f.nombre);
      const td = tdcPorMes(f.nombre);
      const totalAp = ap.reduce((s, v) => s + v, 0);
      const totalTDC = td.reduce((s, v) => s + v, 0);
      const mesesConTDC = td.filter((v) => v > 0).length || 1;
      return [
        f.nombre, f.parentesco || "", f.activa ? "Activo" : "Inactivo",
        f.meta || 0, f.plazoMeses || 0, f.aportacion || 0,
        f.acumuladoAport || 0, Math.max(0, (f.meta || 0) - (f.acumuladoAport || 0)),
        f.acumuladoTDC || 0, Math.round(((f.acumuladoTDC || 0) / mesesConTDC) * 100) / 100,
        ...mesesLabel.flatMap((_, i) => [ap[i] > 0 ? ap[i] : "", td[i] > 0 ? td[i] : ""]),
        totalAp, totalTDC
      ];
    });
    const escape = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    const encabezado = [["Estado de cuenta de Familia"], [`Usuario: ${userEmail || ""}`], [`Generado el: ${fmtDate(todayISO())}`], []];
    const csv = [...encabezado, headers, ...filas].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Familia_${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const filas = familiares.map((f) => {
      const ap = aportPorMes(f.nombre);
      const td = tdcPorMes(f.nombre);
      const totalAp = ap.reduce((s, v) => s + v, 0);
      const totalTDC = td.reduce((s, v) => s + v, 0);
      const pendiente = Math.max(0, (f.meta || 0) - (f.acumuladoAport || 0));
      const mesesConTDC = td.filter((v) => v > 0).length || 1;
      const promTDC = Math.round(((f.acumuladoTDC || 0) / mesesConTDC) * 100) / 100;
      return `<tr>
        <td>${f.nombre}</td><td>${f.parentesco || "-"}</td><td>${f.activa ? "Activo" : "Inactivo"}</td>
        <td class="num">${fmt(f.meta || 0)}</td><td class="num">${f.plazoMeses || 0}</td><td class="num">${fmt(f.aportacion || 0)}</td>
        <td class="num">${fmt(f.acumuladoAport || 0)}</td><td class="num">${fmt(pendiente)}</td>
        <td class="num">${fmt(f.acumuladoTDC || 0)}</td><td class="num">${fmt(promTDC)}</td>
        ${mesesLabel.map((_, i) => `<td class="num">${ap[i] > 0 ? fmt(ap[i]) : "-"}</td><td class="num">${td[i] > 0 ? fmt(td[i]) : "-"}</td>`).join("")}
        <td class="num">${fmt(totalAp)}</td><td class="num">${fmt(totalTDC)}</td>
      </tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Familia</title>
      <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000; }
        h1 { font-size: 20px; margin: 0 0 4px; } p.sub { font-size: 12px; color: #555; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 8px; margin-top: 14px; }
        th, td { border: 1px solid #999; padding: 3px 4px; text-align: left; }
        th { background: #F4CCCC; font-weight: 700; }
        td.num, th.num { text-align: right; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <h1>Estado de cuenta de Familia</h1>
        <p class="sub">Usuario: ${userEmail || ""}</p>
        <p class="sub">Generado el ${fmtDate(todayISO())}</p>
        <table><thead><tr>
          <th>Familiar</th><th>Parentesco</th><th>Estatus</th>
          <th class="num">Meta</th><th class="num">Plazo</th><th class="num">Aport. men.</th>
          <th class="num">Acum. Aport.</th><th class="num">Pendiente</th>
          <th class="num">Acum. TDC</th><th class="num">Prom. TDC</th>
          ${mesesLabel.map((m) => `<th class="num">${m} Ap.</th><th class="num">${m} TDC</th>`).join("")}
          <th class="num">Tot. Aport.</th><th class="num">Tot. TDC</th>
        </tr></thead><tbody>${filas}</tbody></table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>`;
    const ventana = window.open("", "_blank");
    if (ventana) { ventana.document.write(html); ventana.document.close(); }
  }

  function Tarjeta({ f }) {
    const pendiente = Math.max(0, (f.meta || 0) - (f.acumuladoAport || 0));
    const mesesConTDC = movimientos.filter((mv) => mv.mov === "Egreso" && mv.categoria === "Pago TDC Familiar" && mv.subcategoria === f.nombre).length;
    const promTDC = mesesConTDC > 0 ? Math.round(((f.acumuladoTDC || 0) / mesesConTDC) * 100) / 100 : 0;
    return (
      <div style={{ border: "1px solid " + SHEET.grisBorde, borderRadius: 4, padding: "10px 12px", marginBottom: 10, background: f.activa ? "#fff" : SHEET.gris }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{f.nombre}
              {f.parentesco && <span style={{ fontWeight: 400, fontSize: 11, color: "#777" }}> · {f.parentesco}</span>}
            </p>
            {f.categoria && <p style={{ fontSize: 11, color: "#888", margin: "1px 0 0" }}>{f.categoria}</p>}
          </div>
          <button onClick={() => toggleActiva(f.id)} style={{
            fontSize: 10.5, fontWeight: 700, fontStyle: "italic", padding: "4px 8px", borderRadius: 3,
            cursor: "pointer", fontFamily: SHEET.fuente, border: "1px solid " + SHEET.grisBorde,
            background: f.activa ? SHEET.verde : "#fff", color: SHEET.texto, flexShrink: 0
          }}>{f.activa ? "Activo" : "Inactivo"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Meta aport.</span><br /><b>{fmt(f.meta || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Acumulado</span><br /><b>{fmt(f.acumuladoAport || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Pendiente</span><br /><b>{fmt(pendiente)}</b></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6, fontSize: 11.5 }}>
          <div><span style={{ color: "#777" }}>Acum. TDC</span><br /><b>{fmt(f.acumuladoTDC || 0)}</b></div>
          <div><span style={{ color: "#777" }}>Prom. TDC/mes</span><br /><b>{fmt(promTDC)}</b></div>
          <div><span style={{ color: "#777" }}>Aport. mensual</span><br /><b>{fmt(f.aportacion || 0)}</b></div>
        </div>
        <p style={{ fontSize: 11.5, margin: "8px 0 0", fontStyle: "italic", color: "#555" }}>
          {f.plazoMeses || 0} meses · {f.metodo}{f.cuenta ? ` · ${f.cuenta}` : ""}
          {f.ultimoPago ? ` · Últ. pago ${fmtDate(f.ultimoPago)}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SHEET.fuente }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Btn full onClick={exportarPDF} style={{ flex: 1 }}>📄 Descargar PDF</Btn>
        <Btn full onClick={exportarCSV} style={{ flex: 1 }}>📊 Descargar Excel</Btn>
      </div>
      <p style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 14 }}>
        Registro → Egreso → Tipo "Familia" → "Aportación" o "Pago TDC Familiar" → elige el familiar.
      </p>
      <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "0 0 10px" }}>Activos</h3>
      {activos.length === 0 && <p style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Sin familiares activos. Agrégalos desde Datos → Egresos → Tipo "Familia".</p>}
      {activos.map((f) => <Tarjeta key={f.id} f={f} />)}
      {inactivos.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontStyle: "italic", margin: "16px 0 10px" }}>Inactivos</h3>
          {inactivos.map((f) => <Tarjeta key={f.id} f={f} />)}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("registrar");
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [movimientos, setMovimientos] = useState([]);
  const catalogRef = useRef(catalog);
  useEffect(() => { catalogRef.current = catalog; }, [catalog]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id || null;

  async function guardarCatalogoAhora(catalogoAGuardar) {
    if (!userId) return;
    await supabase.from("catalogos").update({ data: catalogoAGuardar, updated_at: new Date().toISOString() }).eq("user_id", userId);
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoaded(false);
      const { data: cat } = await supabase.from("catalogos").select("data").eq("user_id", userId).maybeSingle();
      if (cat && cat.data && Object.keys(cat.data).length > 0) {
        const datosCargados = { ...cat.data };
        if (Array.isArray(datosCargados.familiares) && datosCargados.familiares.some((f) => typeof f === "string")) {
          datosCargados.familiares = datosCargados.familiares.map((f) =>
            typeof f === "string" ? { id: uid(), nombre: f, parentesco: "" } : f
          );
        }
        const tiposFusionados = Array.from(new Set([...(DEFAULT_CATALOG.tipos), ...(datosCargados.tipos || [])]));
        const categoriasFusionadas = { ...DEFAULT_CATALOG.categorias };
        Object.keys(datosCargados.categorias || {}).forEach((k) => {
          categoriasFusionadas[k] = datosCargados.categorias[k];
        });
        const subcategoriasFusionadas = { ...DEFAULT_CATALOG.subcategorias };
        Object.keys(datosCargados.subcategorias || {}).forEach((k) => {
          subcategoriasFusionadas[k] = datosCargados.subcategorias[k];
        });
        const ingresoSubFusionado = { ...DEFAULT_CATALOG.ingresoSub };
        Object.keys(datosCargados.ingresoSub || {}).forEach((k) => {
          ingresoSubFusionado[k] = datosCargados.ingresoSub[k];
        });
        setCatalog({
          ...DEFAULT_CATALOG, ...datosCargados,
          tipos: tiposFusionados, categorias: categoriasFusionadas,
          subcategorias: subcategoriasFusionadas, ingresoSub: ingresoSubFusionado
        });
      } else {
        await supabase.from("catalogos").insert({ user_id: userId, data: DEFAULT_CATALOG });
        setCatalog(DEFAULT_CATALOG);
      }
      const { data: movs } = await supabase.from("movimientos").select("*").eq("user_id", userId).order("fecha", { ascending: false });
      setMovimientos((movs || []).map((m) => ({ ...m, cantidad: Number(m.cantidad) })));
      setLoaded(true);
    })();
  }, [userId]);

  useEffect(() => {
    if (!loaded || !userId) return;
    const timer = setTimeout(() => {
      supabase.from("catalogos").update({ data: catalog, updated_at: new Date().toISOString() }).eq("user_id", userId);
    }, 600);
    return () => clearTimeout(timer);
  }, [catalog, loaded, userId]);

  async function addMovimiento(entry) {
    const { data, error } = await supabase.from("movimientos").insert({ ...entry, user_id: session.user.id }).select().single();
    if (!error && data) {
      setMovimientos((prev) => [{ ...data, cantidad: Number(data.cantidad) }, ...prev]);
      if (entry.mov === "Egreso" && (entry.categoria === "Bancario" || entry.categoria === "Crédito") && entry.subcategoria) {
        const lista = catalogRef.current.prestamosBancarios || [];
        const prestamo = lista.find((p) => p.nombre === entry.subcategoria && p.categoria === entry.categoria);
        if (prestamo) {
          const nuevoAcumulado = Math.round((Number(prestamo.acumulado || 0) + Number(entry.cantidad)) * 100) / 100;
          const liquidado = nuevoAcumulado >= (prestamo.totalAPagar || 0);
          const actualizado = {
            ...catalogRef.current,
            prestamosBancarios: lista.map((p) => (p.id === prestamo.id ? { ...p, acumulado: nuevoAcumulado, ultimoPago: entry.fecha, activa: !liquidado } : p))
          };
          setCatalog(actualizado);
          guardarCatalogoAhora(actualizado);
        }
      }
      if (entry.mov === "Egreso" && (entry.categoria === "Aportación" || entry.categoria === "Pago TDC Familiar") && entry.subcategoria) {
        const lista = catalogRef.current.familiares || [];
        const fam = lista.find((f) => f.nombre === entry.subcategoria);
        if (fam) {
          const campo = entry.categoria === "Aportación" ? "acumuladoAport" : "acumuladoTDC";
          const nuevo = Math.round((Number(fam[campo] || 0) + Number(entry.cantidad)) * 100) / 100;
          const actualizado = {
            ...catalogRef.current,
            familiares: lista.map((f) => (f.id === fam.id ? { ...f, [campo]: nuevo, ultimoPago: entry.fecha } : f))
          };
          setCatalog(actualizado);
          guardarCatalogoAhora(actualizado);
        }
      }
    }
  }

  async function deleteMovimiento(id) {
    const mov = movimientos.find((m) => m.id === id);
    await supabase.from("movimientos").delete().eq("id", id);
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    if (mov && mov.lugar && mov.lugar.startsWith("__diferido:")) {
      const diferidoId = mov.lugar.slice("__diferido:".length);
      const monto = Number(mov.cantidad);
      const actualizado = {
        ...catalogRef.current,
        diferidos: (catalogRef.current.diferidos || []).map((d) => {
          if (d.id !== diferidoId) return d;
          const pagosNuevos = Math.max(0, d.pagos - 1);
          const pagadoNuevo = Math.max(0, Math.round((d.pagado - monto) * 100) / 100);
          return { ...d, pagos: pagosNuevos, pagado: pagadoNuevo, activo: true };
        })
      };
      setCatalog(actualizado);
      guardarCatalogoAhora(actualizado);
    } else if (mov && mov.mov === "Egreso" && (mov.categoria === "Bancario" || mov.categoria === "Crédito") && mov.subcategoria) {
      const lista = catalogRef.current.prestamosBancarios || [];
      const prestamo = lista.find((p) => p.nombre === mov.subcategoria && p.categoria === mov.categoria);
      if (prestamo) {
        const nuevoAcumulado = Math.max(0, Math.round((Number(prestamo.acumulado || 0) - Number(mov.cantidad)) * 100) / 100);
        const actualizado = {
          ...catalogRef.current,
          prestamosBancarios: lista.map((p) => (p.id === prestamo.id ? { ...p, acumulado: nuevoAcumulado, activa: true } : p))
        };
        setCatalog(actualizado);
        guardarCatalogoAhora(actualizado);
      }
    } else if (mov && mov.mov === "Egreso" && (mov.categoria === "Aportación" || mov.categoria === "Pago TDC Familiar") && mov.subcategoria) {
      const lista = catalogRef.current.familiares || [];
      const fam = lista.find((f) => f.nombre === mov.subcategoria);
      if (fam) {
        const campo = mov.categoria === "Aportación" ? "acumuladoAport" : "acumuladoTDC";
        const nuevo = Math.max(0, Math.round((Number(fam[campo] || 0) - Number(mov.cantidad)) * 100) / 100);
        const actualizado = {
          ...catalogRef.current,
          familiares: lista.map((f) => (f.id === fam.id ? { ...f, [campo]: nuevo } : f))
        };
        setCatalog(actualizado);
        guardarCatalogoAhora(actualizado);
      }
    }
  }

  function addDiferido({ nombre, tarjeta, categoria, subcategoria, descripcion, costoTotal, plazoMeses, inicio, pagosPrevios = 0, pagadoPrevio = 0 }) {
    const pagosIniciales = Math.min(Math.max(0, pagosPrevios), plazoMeses - 1);
    const pagadoInicial = Math.max(0, pagadoPrevio);
    const nuevo = {
      id: uid(), activo: pagosIniciales < plazoMeses, nombre: nombre || "", tarjeta, categoria, subcategoria: subcategoria || "", descripcion: descripcion || "",
      costoTotal, plazoMeses, aportacion: Math.round((costoTotal / plazoMeses) * 100) / 100,
      pagos: pagosIniciales, pagado: pagadoInicial, ultPago: "", inicio
    };
    const actualizado = { ...catalogRef.current, diferidos: [nuevo, ...(catalogRef.current.diferidos || [])] };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  async function registrarPagoDiferido(diferidoId, monto, fecha) {
    const dif = (catalogRef.current.diferidos || []).find((d) => d.id === diferidoId);
    if (!dif) return;
    const etiqueta = dif.nombre || `${dif.categoria}${dif.subcategoria ? " · " + dif.subcategoria : ""}`;
    await addMovimiento({
      mov: "Egreso", metodo: "TDC", cuenta: dif.tarjeta,
      tipo: "Pago TDC", categoria: "Pago TDC", subcategoria: dif.tarjeta,
      descripcion: `Diferido: ${etiqueta}${dif.descripcion ? " · " + dif.descripcion : ""}`,
      lugar: `__diferido:${diferidoId}`, fecha, cantidad: monto
    });
    const actualizado = {
      ...catalogRef.current,
      diferidos: (catalogRef.current.diferidos || []).map((d) => {
        if (d.id !== diferidoId) return d;
        const pagosNuevos = d.pagos + 1;
        const pagadoNuevo = Math.round((d.pagado + monto) * 100) / 100;
        return { ...d, pagos: pagosNuevos, pagado: pagadoNuevo, ultPago: fecha, activo: pagosNuevos < d.plazoMeses };
      })
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function eliminarDiferido(diferidoId) {
    const actualizado = { ...catalogRef.current, diferidos: (catalogRef.current.diferidos || []).filter((d) => d.id !== diferidoId) };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaMembresiaApp(id) {
    const actualizado = {
      ...catalogRef.current,
      membresias: (catalogRef.current.membresias || []).map((m) => (m.id === id ? { ...m, activa: !m.activa } : m))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaServicioApp(id) {
    const actualizado = {
      ...catalogRef.current,
      servicios: (catalogRef.current.servicios || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaSeguroApp(id) {
    const actualizado = {
      ...catalogRef.current,
      seguros: (catalogRef.current.seguros || []).map((s) => (s.id === id ? { ...s, activa: !s.activa } : s))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaAhorroApp(id) {
    const actualizado = {
      ...catalogRef.current,
      ahorros: (catalogRef.current.ahorros || []).map((a) => (a.id === id ? { ...a, activa: !a.activa } : a))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaInversionApp(id) {
    const actualizado = {
      ...catalogRef.current,
      inversiones: (catalogRef.current.inversiones || []).map((i) => (i.id === id ? { ...i, activa: !i.activa } : i))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaPrestamoBancarioApp(id) {
    const actualizado = {
      ...catalogRef.current,
      prestamosBancarios: (catalogRef.current.prestamosBancarios || []).map((p) => (p.id === id ? { ...p, activa: !p.activa } : p))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  function toggleActivaFamiliarApp(id) {
    const actualizado = {
      ...catalogRef.current,
      familiares: (catalogRef.current.familiares || []).map((f) => (f.id === id ? { ...f, activa: !f.activa } : f))
    };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (!session) return <LoginScreen />;

  if (!loaded) {
    return <p style={{ fontSize: 13, color: "#666", textAlign: "center", padding: "2rem 0", fontFamily: SHEET.fuente, fontStyle: "italic" }}>Cargando tus datos...</p>;
  }

  const sinDatosPropios = !catalog._bannerVisto && (catalog.cuentas.TDC || []).length === 0 &&
    (catalog.cuentas.TDD || []).length === 0 &&
    (catalog.lugares || []).length === 0;

  function cerrarBanner() {
    const actualizado = { ...catalogRef.current, _bannerVisto: true };
    setCatalog(actualizado);
    guardarCatalogoAhora(actualizado);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#fff", padding: "12px 8px", fontFamily: SHEET.fuente, minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontStyle: "italic", fontSize: 19 }}>Finanzas Personales</h2>
        <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0", fontStyle: "italic" }}>{session.user.email} · {movimientos.length} movimientos</p>
      </div>
      <TabBar tab={tab} setTab={setTab} onLogout={handleLogout} />
      {sinDatosPropios && tab !== "catalogos" && (
        <div style={{
          position: "relative", background: SHEET.amarillo, border: `1px solid ${SHEET.amarilloBorde}`, borderRadius: 4,
          padding: "10px 30px 10px 12px", marginBottom: 12, fontSize: 12.5, fontStyle: "italic", lineHeight: 1.4
        }}>
          <button aria-label="Cerrar aviso" onClick={cerrarBanner} style={{
            position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer",
            color: SHEET.amarilloBorde, fontSize: 14, fontWeight: 700, lineHeight: 1, padding: 4
          }}>✕</button>
          👋 Antes de registrar movimientos, ve a la pestaña <b>Datos</b> y agrega tus tarjetas, cuentas y lugares frecuentes. Así los catálogos estarán listos a la hora de capturar.{" "}
          <button onClick={() => setTab("catalogos")} style={{
            background: "none", border: "none", textDecoration: "underline", cursor: "pointer",
            fontStyle: "italic", fontWeight: 700, fontFamily: SHEET.fuente, fontSize: 12.5, padding: 0
          }}>Ir a Datos →</button>
        </div>
      )}
      {tab === "registrar" && <RegistrarTab catalog={catalog} addMovimiento={addMovimiento} addDiferido={addDiferido} />}
      {tab === "resumen" && <ResumenTab movimientos={movimientos} catalog={catalog} />}
      {tab === "historial" && <HistorialTab movimientos={movimientos} deleteMovimiento={deleteMovimiento} />}
      {tab === "catalogos" && <CatalogosTab catalog={catalog} setCatalog={setCatalog} guardarAhora={guardarCatalogoAhora} />}
      {tab === "diferidos" && <DiferidosTab diferidos={catalog.diferidos || []} registrarPago={registrarPagoDiferido} eliminarDiferido={eliminarDiferido} userEmail={session.user.email} />}
      {tab === "membresias" && <MembresiasTab membresias={catalog.membresias || []} toggleActiva={toggleActivaMembresiaApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "servicios" && <ServiciosTab servicios={catalog.servicios || []} toggleActiva={toggleActivaServicioApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "seguros" && <SegurosTab seguros={catalog.seguros || []} toggleActiva={toggleActivaSeguroApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "prestamos" && <PrestamosTab prestamosBancarios={catalog.prestamosBancarios || []} prestamosTerceros={catalog.prestamosTerceros || []} toggleActivaBancario={toggleActivaPrestamoBancarioApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "familia" && <FamiliaTab familiares={catalog.familiares || []} toggleActiva={toggleActivaFamiliarApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "ahorro" && <AhorroTab ahorros={catalog.ahorros || []} toggleActiva={toggleActivaAhorroApp} movimientos={movimientos} userEmail={session.user.email} />}
      {tab === "inversion" && <InversionTab inversiones={catalog.inversiones || []} toggleActiva={toggleActivaInversionApp} movimientos={movimientos} userEmail={session.user.email} />}
    </div>
  );
}
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
  tipos: ["G. Fijo", "G. Variable", "Préstamo", "Inversión", "Ahorro", "Otro(a)", "Pago TDC"],
  categorias: {
    "G. Fijo": ["Seguros", "Membresías", "Servicios", "Familia"],
    "G. Variable": ["Comidas", "Compras Online", "Educación", "Entretenimiento", "Gastos Personales", "Intereses TDC", "Mascotas", "Otro(a)", "Regalos y Festejos", "Ropa y Accesorios", "Salud y Bienestar", "Supermercado", "Tecnología", "Tienda de Conveniencia", "Transporte", "Viajes y Vacaciones", "Vivienda"],
    "Préstamo": ["Bancario", "Crédito", "de Tercero", "a Tercero"],
    "Inversión": [],
    "Ahorro": ["Viaje", "Tecnología", "Entretenimiento", "Transporte", "Casa/Hogar"],
    "Otro(a)": ["Otro(a)"],
    "Pago TDC": []
  },
  subcategorias: {
    "Seguros": [],
    "Membresías": [],
    "Servicios": [],
    "Familia": [],
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
  prestamos: [],
  familiares: [],
  diferidos: [],
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
  useEffect(() => { if (metodo !== "TDC") setEsDiferido(false); }, [metodo]);
  useEffect(() => { if (mov !== "Egreso") setEsDiferido(false); }, [mov]);
  useEffect(() => { setPagosPrevios(""); setPagadoPrevio(""); }, [plazoMeses]);

  function reset() {
    setMetodo(""); setCuenta(""); setTipo(""); setCategoria(""); setSubcategoria("");
    setIngresoTipo(""); setIngresoSub(""); setDescripcion(""); setLugar(""); setCantidad("");
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
        subcategoria: mov === "Egreso" ? subcategoria : "",
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



          <Field label={esDiferido ? "Costo Total" : "Cantidad"} error={errors.cantidad}>
            <input type="number" inputMode="decimal" placeholder="$0.00" value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setErrors((p) => ({ ...p, cantidad: false })); }}
              style={{ ...inputBase, fontSize: 22, fontWeight: 700, textAlign: "center", border: errors.cantidad ? `2px solid ${SHEET.rojo}` : `2px solid ${bandBorder}`, background: errors.cantidad ? "#fff" : bandColor }} />
          </Field>

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
              {plazoMeses && cantidad && parseFloat(cantidad) > 0 && parseInt(plazoMeses) > 0 && (
                <p style={{ fontSize: 12, color: "#555", fontStyle: "italic", margin: "-4px 0 10px" }}>
                  Mensualidad aproximada: {fmt(parseFloat(cantidad) / parseInt(plazoMeses))} x {plazoMeses} meses
                </p>
              )}
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
                <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setErrors((p) => ({ ...p, categoria: false })); }} style={selStyle(errors.categoria)} disabled={!tipo}>
                  <option value="">{tipo ? "Selecciona..." : "Primero elige Tipo"}</option>
                  {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
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
                    }
                  }} style={selStyle(errors.subcategoria)}>
                    <option value="">Selecciona...</option>
                    {subcatsDisponibles.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {((categoria === "Membresías" && (catalog.membresias || []).some((m) => m.nombre === subcategoria)) ||
                    (categoria === "Servicios" && (catalog.servicios || []).some((s) => s.nombre === subcategoria && !s.esVariable)) ||
                    (categoria === "Seguros" && (catalog.seguros || []).some((s) => s.nombre === subcategoria))) && subcategoria && (
                    <p style={{ fontSize: 11.5, color: "#555", fontStyle: "italic", margin: "4px 0 0" }}>
                      Te puse el costo registrado en Cantidad — puedes ajustarlo si pagaste distinto.
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
                </Field>
              )}
            </>
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

  const cuentasMemDisponibles = catalog.cuentas[memMetodo] || [];
  const cuentasServDisponibles = catalog.cuentas[servMetodo] || [];
  const cuentasSegDisponibles = catalog.cuentas[segMetodo] || [];
  const sections = [
    { id: "cuentas", label: "Cuentas" }, { id: "egresos", label: "Egresos" },
    { id: "ingresos", label: "Ingresos" },
    { id: "lugares", label: "Lugares" }, { id: "presupuestos", label: "Presupuesto" }, { id: "familiares", label: "Familia" }
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

      {section === "familiares" && <ListEditor title="Familiares" items={catalog.familiares} onAdd={(v) => addToList(["familiares"], v)} onRemove={(v) => removeFromList(["familiares"], v)} />}
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
        setCatalog({ ...DEFAULT_CATALOG, ...cat.data });
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
    if (!error && data) setMovimientos((prev) => [{ ...data, cantidad: Number(data.cantidad) }, ...prev]);
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
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import DirectorioOdpes from './components/DirectorioOdpes';
import TablaTecnicos from './components/TablaTecnicos';

interface Incidencia {
  id: number;
  tipo_problema: string;
  equipo_afectado: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  usuario_a_cargo: string;
  estado: string;
  descripcion: string;
  odpe_nombre: string;
  supervisor: string;
  tecnico_nombre: string;
  tecnico_dni: string;
  tecnico_celular: string;
  creado_por?: string;
  created_at: string;
  en_papelera: boolean;
}

interface PerfilUsuario {
  correo: string;
  nombre: string;
  rol: 'Admin' | 'Supervisor' | 'Visitante';
}

export default function Home() {
  // Autenticación State
  const [sesion, setSesion] = useState<any>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Navegación Sidebar
  const [seccionActiva, setSeccionActiva] = useState<'dashboard' | 'incidentes' | 'odpes' | 'tecnicos' | 'reportes' | 'historial'>('incidentes');

  // App State
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaPapelera, setVistaPapelera] = useState(false);
  const [modalVer, setModalVer] = useState<Incidencia | null>(null);

  // Catálogos
  const [listaOdpes, setListaOdpes] = useState<string[]>(['ODPE LIMA CENTRO', 'ODPE CUSCO', 'ODPE SANTA', 'ODPE AREQUIPA']);
  const [listaSupervisores, setListaSupervisores] = useState<string[]>(['Juan Pérez', 'Carlos Gómez']);
  const [listaEquipos, setListaEquipos] = useState<string[]>(['CPU', 'MONITOR', 'GRUPO ELECTROGENO', 'AIRE ACONDICIONADO']);
  const [listaEstados, setListaEstados] = useState<string[]>(['Reportado', 'En Proceso', 'Almacén', 'Resuelto']);

  const [modalCatalogos, setModalCatalogos] = useState<string | null>(null);
  const [inputNuevoCatalog, setInputNuevoCatalog] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroEquipo, setFiltroEquipo] = useState('Todos');
  const [inputBusqueda, setInputBusqueda] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');

  // Formulario
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [odpeSeleccionada, setOdpeSeleccionada] = useState('ODPE LIMA CENTRO');
  const [supervisor, setSupervisor] = useState('');
  const [tecnicoNombre, setTecnicoNombre] = useState('');
  const [tecnicoDni, setTecnicoDni] = useState('');
  const [tecnicoCelular, setTecnicoCelular] = useState('');
  const [tipoProblema, setTipoProblema] = useState('Hardware');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('CPU');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [estado, setEstado] = useState('Reportado');
  const [descripcion, setDescripcion] = useState('');

  // Detectar Sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      if (session) cargarPerfil(session.user.id, session.user.email!);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      if (session) cargarPerfil(session.user.id, session.user.email!);
      else setPerfil(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-fill al cambiar ODPE
  const cargarDatosOdpe = async (nombreOdpe: string) => {
    if (!nombreOdpe) return;
    const { data } = await supabase
      .from('incidencias')
      .select('supervisor, tecnico_nombre, tecnico_dni, tecnico_celular')
      .eq('odpe_nombre', nombreOdpe)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSupervisor(data.supervisor || '');
      setTecnicoNombre(data.tecnico_nombre || '');
      setTecnicoDni(data.tecnico_dni || '');
      setTecnicoCelular(data.tecnico_celular || '');
    } else {
      setSupervisor('');
      setTecnicoNombre('');
      setTecnicoDni('');
      setTecnicoCelular('');
    }
  };

  useEffect(() => {
    if (sesion && odpeSeleccionada && !editandoId) {
      cargarDatosOdpe(odpeSeleccionada);
    }
  }, [odpeSeleccionada, sesion, editandoId]);

  const cargarPerfil = async (userId: string, email: string) => {
    try {
      let { data } = await supabase.from('perfiles').select('nombre, rol, correo').eq('id', userId).maybeSingle();
      if (!data) {
        const resp = await supabase.from('perfiles').select('nombre, rol, correo').eq('correo', email).maybeSingle();
        data = resp.data;
      }

      if (data && data.rol) {
        setPerfil({
          correo: data.correo || email,
          nombre: data.nombre || 'Usuario',
          rol: data.rol as 'Admin' | 'Supervisor' | 'Visitante',
        });
      } else {
        await supabase.from('perfiles').upsert([{ id: userId, correo: email, nombre: 'Kenet (Admin)', rol: 'Admin' }]);
        setPerfil({ correo: email, nombre: 'Kenet (Admin)', rol: 'Admin' });
      }
    } catch (err) {
      setPerfil({ correo: email, nombre: 'Usuario', rol: 'Admin' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) alert('Error: ' + error.message);
    else if (data.session) await cargarPerfil(data.session.user.id, data.session.user.email!);
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchIncidencias = async () => {
    setLoading(true);
    const { data } = await supabase.from('incidencias').select('*').order('created_at', { ascending: false });
    if (data) {
      setIncidencias(data);
      const odpesBD = Array.from(new Set(data.map(i => i.odpe_nombre).filter(Boolean)));
      setListaOdpes(prev => Array.from(new Set([...prev, ...odpesBD])));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (sesion) fetchIncidencias();
  }, [sesion]);

  const agregarAlCatalogo = (tipo: string) => {
    if (!inputNuevoCatalog.trim()) return;
    const val = inputNuevoCatalog.trim();

    if (tipo === 'odpe' && !listaOdpes.includes(val)) {
      setListaOdpes([...listaOdpes, val.toUpperCase()]);
      setOdpeSeleccionada(val.toUpperCase());
    }
    if (tipo === 'supervisor' && !listaSupervisores.includes(val)) {
      setListaSupervisores([...listaSupervisores, val]);
      setSupervisor(val);
    }
    if (tipo === 'equipo' && !listaEquipos.includes(val)) setListaEquipos([...listaEquipos, val.toUpperCase()]);
    if (tipo === 'estado' && !listaEstados.includes(val)) setListaEstados([...listaEstados, val]);

    setInputNuevoCatalog('');
    setModalCatalogos(null);
  };

  const eliminarDelCatalogo = (tipo: string, valor: string) => {
    if (perfil?.rol !== 'Admin') return alert('Solo el Administrador puede eliminar elementos.');
    if (confirm(`¿Eliminar "${valor}" de la lista?`)) {
      if (tipo === 'odpe') setListaOdpes(listaOdpes.filter(o => o !== valor));
      if (tipo === 'supervisor') setListaSupervisores(listaSupervisores.filter(s => s !== valor));
      if (tipo === 'equipo') setListaEquipos(listaEquipos.filter(e => e !== valor));
      if (tipo === 'estado') setListaEstados(listaEstados.filter(es => es !== valor));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (perfil?.rol === 'Visitante') return alert('Acceso de solo lectura.');

    const payload = {
      odpe_nombre: odpeSeleccionada,
      supervisor: supervisor,
      tecnico_nombre: tecnicoNombre,
      tecnico_dni: tecnicoDni,
      tecnico_celular: tecnicoCelular.replace(/\s+/g, ''),
      tipo_problema: tipoProblema,
      equipo_afectado: equipoSeleccionado,
      marca,
      modelo,
      serie,
      estado,
      descripcion,
      usuario_a_cargo: tecnicoNombre || supervisor || 'S/N',
    };

    if (editandoId) {
      await supabase.from('incidencias').update(payload).eq('id', editandoId);
      limpiarFormulario();
      fetchIncidencias();
    } else {
      await supabase.from('incidencias').insert([{ ...payload, creado_por: perfil?.correo, en_papelera: false }]);
      limpiarFormulario();
      fetchIncidencias();
    }
  };

  const moverAPapelera = async (id: number, enviarAPapelera: boolean) => {
    if (perfil?.rol === 'Visitante') return alert('Acción no permitida.');
    await supabase.from('incidencias').update({ en_papelera: enviarAPapelera }).eq('id', id);
    fetchIncidencias();
  };

  const eliminarDefinitivo = async (id: number) => {
    if (perfil?.rol !== 'Admin') return alert('Solo el rol Administrador puede eliminar registros definitivamente.');
    if (confirm('¿Eliminar registro de forma permanente?')) {
      await supabase.from('incidencias').delete().eq('id', id);
      fetchIncidencias();
    }
  };

  const cargarParaEditar = (item: Incidencia) => {
    setEditandoId(item.id);
    setOdpeSeleccionada(item.odpe_nombre);
    setSupervisor(item.supervisor || '');
    setTecnicoNombre(item.tecnico_nombre || '');
    setTecnicoDni(item.tecnico_dni || '');
    setTecnicoCelular(item.tecnico_celular || '');
    setEquipoSeleccionado(item.equipo_afectado);
    setMarca(item.marca || '');
    setModelo(item.modelo || '');
    setSerie(item.serie || '');
    setTipoProblema(item.tipo_problema);
    setEstado(item.estado);
    setDescripcion(item.descripcion);
  };

  const copiarResumen = (item: Incidencia) => {
    const texto = `[INCIDENCIA #${item.id}] ${item.odpe_nombre} | Equipo: ${item.equipo_afectado} (${item.marca || 'S/M'} - Serie: ${item.serie || 'S/S'}) | Estado: ${item.estado} | Téco: ${item.tecnico_nombre} (${item.tecnico_celular})`;
    navigator.clipboard.writeText(texto);
    alert('Resumen copiado');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setMarca('');
    setModelo('');
    setSerie('');
    setDescripcion('');
    setEstado('Reportado');
  };

  const exportarCSV = () => {
    if (incidencias.length === 0) return alert('No hay datos para exportar');
    const sep = ';';
    const columnas = ['ID', 'FECHA', 'ODPE', 'EQUIPO', 'MARCA', 'MODELO', 'SERIE', 'ESTADO', 'TECNICO', 'CELULAR', 'CREADO_POR'];
    const filas = incidenciasFiltradas.map(i => [
      i.id,
      new Date(i.created_at).toLocaleDateString(),
      `"${i.odpe_nombre}"`,
      `"${i.equipo_afectado}"`,
      `"${i.marca || ''}"`,
      `"${i.modelo || ''}"`,
      `"${i.serie || ''}"`,
      `"${i.estado}"`,
      `"${i.tecnico_nombre || ''}"`,
      `"${i.tecnico_celular || ''}"`,
      `"${i.creado_por || ''}"`
    ].join(sep));

    const csvContent = '\uFEFF' + [columnas.join(sep), ...filas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_ODPE_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const incidenciasFiltradas = incidencias.filter(item => {
    const coincidePapelera = vistaPapelera ? item.en_papelera : !item.en_papelera;
    const coincideEstado = filtroEstado === 'Todos' || item.estado === filtroEstado;
    const coincideEquipo = filtroEquipo === 'Todos' || item.equipo_afectado === filtroEquipo;
    const coincideBusqueda = (item.id.toString()).includes(busquedaActiva) ||
                             (item.equipo_afectado || '').toLowerCase().includes(busquedaActiva.toLowerCase()) ||
                             (item.odpe_nombre || '').toLowerCase().includes(busquedaActiva.toLowerCase()) ||
                             (item.descripcion || '').toLowerCase().includes(busquedaActiva.toLowerCase());
    return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda;
  });

  // Métricas para Dashboard
  const totalActivos = incidencias.filter(i => !i.en_papelera).length;
  const totalReportados = incidencias.filter(i => !i.en_papelera && i.estado === 'Reportado').length;
  const totalEnProceso = incidencias.filter(i => !i.en_papelera && i.estado === 'En Proceso').length;
  const totalAlmacen = incidencias.filter(i => !i.en_papelera && i.estado === 'Almacén').length;
  const totalResueltos = incidencias.filter(i => !i.en_papelera && i.estado === 'Resuelto').length;

  if (!sesion) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-block bg-blue-600 text-white font-black text-2xl px-4 py-2 rounded-xl mb-2">ODPE</div>
            <h1 className="text-2xl font-bold tracking-wide">Acceso al Sistema</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Correo" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200" />
            <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Contraseña" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200" />
            <button type="submit" disabled={loadingAuth} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl">
              {loadingAuth ? 'Ingresando...' : 'Ingresar al Panel'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-800">
      
      {/* SIDEBAR NAVEGACIÓN */}
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between p-4 shadow-xl border-r border-slate-800">
        <div className="space-y-6">
          
          {/* Logo Sidebar */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800">
            <div className="bg-blue-600 text-white font-black text-xl p-2 rounded-xl">POLLITOS DE MARLENE</div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">APP PARA GESTIONAR ODPES</h2>
              <p className="text-[10px] text-slate-400">SUPERS</p>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="space-y-1 text-xs">
            <button 
              onClick={() => setSeccionActiva('dashboard')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                seccionActiva === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>🏠</span> Dashboard
            </button>

            <button 
              onClick={() => setSeccionActiva('incidentes')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                seccionActiva === 'incidentes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>📝</span> Incidentes
            </button>

            <button 
              onClick={() => setSeccionActiva('odpes')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                seccionActiva === 'odpes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>🌐</span> Directorio ODPEs
            </button>

            <button 
              onClick={() => setSeccionActiva('tecnicos')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                seccionActiva === 'tecnicos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>👤</span> Técnicos & Personal
            </button>

            <button 
              onClick={() => setSeccionActiva('reportes')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                seccionActiva === 'reportes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>📈</span> Reportes & Excel
            </button>

            <button 
              onClick={() => setSeccionActiva('historial')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                seccionActiva === 'historial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>📜</span> Historial
            </button>
          </nav>
        </div>

        {/* Perfil Footer Sidebar */}
        <div className="border-t border-slate-800 pt-3 text-xs space-y-2">
          <div className="px-2">
            <p className="font-bold text-white truncate">{perfil?.nombre}</p>
            <p className="text-[10px] text-slate-400 truncate">{perfil?.correo}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold ${
              perfil?.rol === 'Admin' ? 'bg-purple-900/60 text-purple-300 border border-purple-700' :
              perfil?.rol === 'Supervisor' ? 'bg-blue-900/60 text-blue-300 border border-blue-700' :
              'bg-slate-800 text-slate-400'
            }`}>
              ROL: {perfil?.rol}
            </span>
          </div>
          <button onClick={handleLogout} className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-2 rounded-xl text-center transition-all border border-red-800/40">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        
        {/* Header Superior */}
        <header className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase">{seccionActiva}</h1>
            <p className="text-xs text-slate-500">Monitoreo centralizado para 125 sedes regionales</p>
          </div>
          <button onClick={() => setVistaPapelera(!vistaPapelera)} className={`px-3 py-2 rounded-xl text-xs font-semibold ${vistaPapelera ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'}`}>
            {vistaPapelera ? '📋 Ver Activos' : '🗑️ Papelera'}
          </button>
        </header>

        {/* 1. SECCIÓN DASHBOARD */}
        {seccionActiva === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Sedes</span>
                <p className="text-2xl font-black text-slate-800">125</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Reportados</span>
                <p className="text-2xl font-black text-red-600">{totalReportados}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">En Proceso</span>
                <p className="text-2xl font-black text-amber-600">{totalEnProceso}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">En Almacén</span>
                <p className="text-2xl font-black text-purple-600">{totalAlmacen}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Resueltos</span>
                <p className="text-2xl font-black text-emerald-600">{totalResueltos}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Últimas Incidencias Registradas</h3>
              <div className="space-y-2">
                {incidencias.slice(0, 5).map(i => (
                  <div key={i.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                    <div>
                      <span className="font-bold text-blue-600">#{i.id} - {i.odpe_nombre}</span>
                      <p className="text-slate-600">{i.equipo_afectado} ({i.marca || 'S/M'})</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200">{i.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. SECCIÓN INCIDENTES (TU FORMULARIO Y TABLA) */}
        {seccionActiva === 'incidentes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Formulario */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {editandoId ? '✏️ Editar Registro' : '➕ Nueva Incidencia'}
                </h2>
                {editandoId && <button onClick={limpiarFormulario} className="text-xs text-red-500 underline">Cancelar</button>}
              </div>

              {perfil?.rol === 'Visitante' ? (
                <div className="p-4 bg-slate-50 border rounded-xl text-xs text-slate-500">
                  🔒 El rol <strong>Visitante</strong> solo tiene permisos de lectura.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  
                  {/* ODPE Selector */}
                  <div>
                    <label className="block font-semibold mb-1 text-slate-600">ODPE AFECTADA</label>
                    <div className="flex gap-1.5">
                      <select value={odpeSeleccionada} onChange={(e) => setOdpeSeleccionada(e.target.value)} className="w-full rounded-lg p-2.5 border border-slate-300 bg-white">
                        {listaOdpes.map((o, idx) => <option key={idx} value={o}>{o}</option>)}
                      </select>
                      {(perfil?.rol === 'Admin' || perfil?.rol === 'Supervisor') && (
                        <button type="button" onClick={() => setModalCatalogos('odpe')} title="Agregar ODPE" className="bg-blue-600 text-white px-2.5 rounded-lg font-bold">+</button>
                      )}
                      {perfil?.rol === 'Admin' && (
                        <button type="button" onClick={() => eliminarDelCatalogo('odpe', odpeSeleccionada)} title="Eliminar" className="bg-red-100 text-red-600 px-2 rounded-lg">🗑️</button>
                      )}
                    </div>
                  </div>

                  {/* Responsables */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="block font-bold text-[11px] uppercase text-slate-500">Responsables (Auto-fill por ODPE)</span>
                    
                    <div className="flex gap-1.5">
                      <select value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className="w-full rounded-md p-2 border border-slate-300 bg-white">
                        <option value="">-- Supervisor --</option>
                        {listaSupervisores.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                      </select>
                      {perfil?.rol === 'Admin' && (
                        <>
                          <button type="button" onClick={() => setModalCatalogos('supervisor')} className="bg-blue-600 text-white px-2 rounded font-bold">+</button>
                          {supervisor && <button type="button" onClick={() => eliminarDelCatalogo('supervisor', supervisor)} className="bg-red-100 text-red-600 px-1.5 rounded">🗑️</button>}
                        </>
                      )}
                    </div>

                    <input type="text" placeholder="Nombre Técnico" value={tecnicoNombre} onChange={(e) => setTecnicoNombre(e.target.value)} className="w-full rounded-md p-2 border border-slate-300 bg-white" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="DNI (8 dígitos)" maxLength={8} value={tecnicoDni} onChange={(e) => setTecnicoDni(e.target.value)} className="rounded-md p-2 border border-slate-300 bg-white" />
                      <input type="text" placeholder="Celular (9 dígitos)" maxLength={9} value={tecnicoCelular} onChange={(e) => setTecnicoCelular(e.target.value)} className="rounded-md p-2 border border-slate-300 bg-white" />
                    </div>
                  </div>

                  {/* Selección de Equipo */}
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      <select value={equipoSeleccionado} onChange={(e) => setEquipoSeleccionado(e.target.value)} className="w-full rounded-lg p-2.5 border border-slate-300 bg-white">
                        {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
                      </select>
                      {perfil?.rol === 'Admin' && (
                        <>
                          <button type="button" onClick={() => setModalCatalogos('equipo')} className="bg-blue-600 text-white px-2.5 rounded-lg font-bold">+</button>
                          <button type="button" onClick={() => eliminarDelCatalogo('equipo', equipoSeleccionado)} className="bg-red-100 text-red-600 px-2 rounded-lg">🗑️</button>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <input type="text" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="rounded p-1.5 text-[11px] border border-slate-300 bg-white" />
                      <input type="text" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="rounded p-1.5 text-[11px] border border-slate-300 bg-white" />
                      <input type="text" placeholder="N° Serie" value={serie} onChange={(e) => setSerie(e.target.value)} className="rounded p-1.5 text-[11px] border border-slate-300 bg-white" />
                    </div>
                  </div>

                  {/* Tipo y Estado */}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={tipoProblema} onChange={(e) => setTipoProblema(e.target.value)} className="w-full rounded-lg p-2 border border-slate-300 bg-white">
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Red">Red</option>
                    </select>

                    <div className="flex gap-1">
                      <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-lg p-2 border border-slate-300 bg-white">
                        {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                      </select>
                      {perfil?.rol === 'Admin' && (
                        <>
                          <button type="button" onClick={() => setModalCatalogos('estado')} className="bg-blue-600 text-white px-2 rounded-lg font-bold">+</button>
                          <button type="button" onClick={() => eliminarDelCatalogo('estado', estado)} className="bg-red-100 text-red-600 px-1.5 rounded-lg">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>

                  <textarea rows={2} placeholder="Observaciones..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full rounded-lg p-2 border border-slate-300 bg-white" />

                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 font-bold py-2.5 rounded-xl text-white transition-all shadow-md">
                    {editandoId ? 'Actualizar Registro' : 'Guardar Incidencia'}
                  </button>
                </form>
              )}
            </div>

            {/* Tabla de Resultados */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b pb-4">
                <form onSubmit={(e) => { e.preventDefault(); setBusquedaActiva(inputBusqueda); }}>
                  <input type="text" placeholder="🔍 Buscar por ID, ODPE..." value={inputBusqueda} onChange={(e) => setInputBusqueda(e.target.value)} className="w-full rounded-xl p-2 text-xs border border-slate-300 bg-slate-50" />
                </form>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full rounded-xl p-2 text-xs border border-slate-300 bg-slate-50">
                  <option value="Todos">Todos los Estados</option>
                  {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                </select>
                <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="w-full rounded-xl p-2 text-xs border border-slate-300 bg-slate-50">
                  <option value="Todos">Todos los Equipos</option>
                  {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
                </select>
              </div>

              {loading ? (
                <p className="text-xs py-8 text-center text-slate-400">Cargando...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="font-bold border-b uppercase text-slate-500 bg-slate-50">
                      <tr>
                        <th className="py-3 px-3">ID / ODPE</th>
                        <th className="py-3 px-3">Equipo</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incidenciasFiltradas.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono text-blue-600 font-bold">#{item.id}</span>
                            <p className="font-bold text-slate-800">{item.odpe_nombre}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-700">{item.equipo_afectado}</p>
                            <p className="text-[10px] text-slate-400">Serie: {item.serie || 'S/S'}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              item.estado === 'En Proceso' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              item.estado === 'Almacén' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                              'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {item.estado}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            <button onClick={() => setModalVer(item)} className="bg-slate-800 text-white px-2 py-1 rounded">🔍</button>
                            <button onClick={() => copiarResumen(item)} title="Copiar" className="bg-slate-200 text-slate-800 px-2 py-1 rounded">📋</button>

                            {perfil?.rol !== 'Visitante' && !vistaPapelera && (
                              <>
                                <button onClick={() => cargarParaEditar(item)} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">✏️</button>
                                <button onClick={() => moverAPapelera(item.id, true)} className="bg-amber-100 text-amber-800 px-2 py-1 rounded">🗑️ Papelera</button>
                              </>
                            )}

                            {perfil?.rol === 'Admin' && vistaPapelera && (
                              <button onClick={() => eliminarDefinitivo(item.id)} className="bg-red-600 text-white px-2 py-1 rounded font-bold">❌ Borrar</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. SECCIÓN ODPES */}
        {seccionActiva === 'odpes' && (
          <DirectorioOdpes 
            listaOdpes={listaOdpes} 
            incidencias={incidencias} 
            onUpdate={fetchIncidencias} 
          />
        )}

        {/* 4. SECCIÓN TÉCNICOS */}
        {seccionActiva === 'tecnicos' && (
          <TablaTecnicos incidencias={incidencias} />
        )}

        {/* 5. SECCIÓN REPORTES */}
        {seccionActiva === 'reportes' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-center py-12">
            <h3 className="font-bold text-lg text-slate-800">Generar Reportes Oficiales</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Descarga un consolidado completo en formato CSV/Excel con las fechas, responsables y estados de cada ODPE.</p>
            <button onClick={exportarCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all text-xs">
              📊 Descargar Excel Completo
            </button>
          </div>
        )}

        {/* 6. SECCIÓN HISTORIAL */}
        {seccionActiva === 'historial' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 uppercase">Historial de Registros</h3>
            <div className="space-y-2 text-xs">
              {incidencias.map(i => (
                <div key={i.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">Incidencia #{i.id} creada por {i.creado_por || 'Sistema'}</p>
                    <p className="text-slate-500">{i.odpe_nombre} - {i.equipo_afectado}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(i.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Modal Catálogos */}
      {modalCatalogos && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 text-xs border border-slate-200">
            <h3 className="text-sm font-bold uppercase">Agregar nuevo item a: {modalCatalogos}</h3>
            <input 
              type="text" 
              autoFocus
              placeholder="Ingresa la nueva opción..." 
              value={inputNuevoCatalog} 
              onChange={(e) => setInputNuevoCatalog(e.target.value)} 
              className="w-full rounded-xl p-2.5 border border-slate-300 outline-none bg-slate-50"
            />
            <div className="flex gap-2">
              <button onClick={() => agregarAlCatalogo(modalCatalogos)} className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Agregar</button>
              <button onClick={() => setModalCatalogos(null)} className="w-full bg-slate-200 text-slate-800 font-bold py-2 rounded-xl">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Ficha */}
      {modalVer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800">DETALLE TÉCNICO #{modalVer.id}</h3>
              <button onClick={() => setModalVer(null)} className="font-bold">✕</button>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2 border-b pb-2 text-[11px]">
                <p><strong>ODPE:</strong> {modalVer.odpe_nombre}</p>
                <p><strong>Estado:</strong> <span className="font-bold text-blue-600">{modalVer.estado}</span></p>
                <p><strong>Creado por:</strong> <span className="font-semibold text-purple-600">{modalVer.creado_por || perfil?.correo || 'Sistema'}</span></p>
                <p><strong>Fecha y Hora:</strong> {new Date(modalVer.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' })}</p>
              </div>

              <div className="space-y-1 pt-1">
                <p><strong>Equipo:</strong> {modalVer.equipo_afectado} ({modalVer.marca || 'S/M'} - {modalVer.modelo || 'S/M'})</p>
                <p><strong>N° Serie:</strong> <span className="font-mono">{modalVer.serie || 'N/A'}</span></p>
                <p><strong>Supervisor ODPE:</strong> {modalVer.supervisor || 'N/A'}</p>
                <p><strong>Técnico Responsable:</strong> {modalVer.tecnico_nombre || 'N/A'} (DNI: {modalVer.tecnico_dni || 'S/N'} / Cel: {modalVer.tecnico_celular || 'S/N'})</p>
                <p><strong>Observaciones:</strong> {modalVer.descripcion || 'Sin observaciones'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copiarResumen(modalVer)} className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl">Copiar Ficha</button>
              <button onClick={() => setModalVer(null)} className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl">Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
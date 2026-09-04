'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PortalTecnico from '@/app/components/PortalTecnico';
import TablaTecnicos from '@/app/components/TablaTecnicos';
import { Toaster, toast } from 'sonner';
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Globe,
  Users,
  BarChart3,
  History,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  Trash2,
  Copy,
  LogOut,
  Camera,
  Filter,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

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
  foto_1?: string;
  foto_2?: string;
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
  const [sesion, setSesion] = useState<any>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  const [modoReportePublico, setModoReportePublico] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<'dashboard' | 'incidentes' | 'soportes' | 'odpes' | 'tecnicos' | 'reportes' | 'historial'>('incidentes');

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaPapelera, setVistaPapelera] = useState(false);
  const [modalVer, setModalVer] = useState<Incidencia | null>(null);

  // Modal Edición Rápida Soportes
  const [modalEditarSoporte, setModalEditarSoporte] = useState<Incidencia | null>(null);
  const [nuevoEstadoSoporte, setNuevoEstadoSoporte] = useState('Resuelto');
  const [nuevasObsSoporte, setNuevasObsSoporte] = useState('');
  const [guardandoSoporte, setGuardandoSoporte] = useState(false);

  // Catálogos
  const [listaPadron, setListaPadron] = useState<any[]>([]);
  const [busquedaOdpeInput, setBusquedaOdpeInput] = useState('');
  const [busquedaDirectorioInput, setBusquedaDirectorioInput] = useState('');
  const [listaSupervisores, setListaSupervisores] = useState<string[]>([]);
  const [listaEquipos, setListaEquipos] = useState<string[]>(['CPU', 'MONITOR', 'IMPRESORA', 'GRUPO ELECTROGENO', 'AIRE ACONDICIONADO', 'SWITCH/ROUTER']);
  const [listaEstados, setListaEstados] = useState<string[]>(['Reportado', 'En Proceso', 'Almacén', 'Resuelto']);

  const [modalCatalogos, setModalCatalogos] = useState<'supervisor' | 'equipo' | null>(null);
  const [inputNuevoCatalog, setInputNuevoCatalog] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('Todos los Estados');
  const [filtroEquipo, setFiltroEquipo] = useState('Todos los Equipos');
  const [inputBusqueda, setInputBusqueda] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');

  // Formulario Admin
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [odpeSeleccionada, setOdpeSeleccionada] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [tecnicoNombre, setTecnicoNombre] = useState('');
  const [tecnicoDni, setTecnicoDni] = useState('');
  const [tecnicoCelular, setTecnicoCelular] = useState('');
  const [datosTecnicoExiste, setDatosTecnicoExiste] = useState(false);

  const [tipoProblema, setTipoProblema] = useState('Hardware');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('CPU');
  const [otroEquipoAdmin, setOtroEquipoAdmin] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [estado, setEstado] = useState('Reportado');
  const [descripcion, setDescripcion] = useState('');

  const [archivoFoto1, setArchivoFoto1] = useState<File | null>(null);
  const [archivoFoto2, setArchivoFoto2] = useState<File | null>(null);
  const [enviandoAdmin, setEnviandoAdmin] = useState(false);

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

  const fetchPadronOdpes = async () => {
    const { data } = await supabase.from('padron_odpes').select('*').order('odpe_nombre', { ascending: true });
    if (data && data.length > 0) {
      setListaPadron(data);
      if (!odpeSeleccionada) {
        const primera = data[0];
        setOdpeSeleccionada(primera.odpe_nombre);
        autoRellenarDesdePadron(primera);
      }
      const supers = Array.from(new Set(data.map(d => d.supervisor_nombre).filter(Boolean)));
      setListaSupervisores(supers as string[]);
    }
  };

  const autoRellenarDesdePadron = (itemPadron: any) => {
    if (itemPadron) {
      setSupervisor(itemPadron.supervisor_nombre || '');
      setTecnicoNombre(itemPadron.tecnico_nombre || '');
      setTecnicoDni(itemPadron.dni || '');
      setTecnicoCelular(itemPadron.tecnico_celular || '');
      setDatosTecnicoExiste(true);
    }
  };

  const handleCambioOdpe = (nombreOdpe: string) => {
    setOdpeSeleccionada(nombreOdpe);
    const coincidencia = listaPadron.find(p => p.odpe_nombre === nombreOdpe);
    if (coincidencia) autoRellenarDesdePadron(coincidencia);
    else setDatosTecnicoExiste(false);
  };

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
          nombre: data.nombre || (data.rol === 'Admin' ? 'Administrador' : 'Usuario'),
          rol: data.rol as 'Admin' | 'Supervisor' | 'Visitante',
        });
      } else {
        await supabase.from('perfiles').upsert([{ id: userId, correo: email, nombre: 'Administrador', rol: 'Admin' }]);
        setPerfil({ correo: email, nombre: 'Administrador', rol: 'Admin' });
      }
    } catch (err) {
      setPerfil({ correo: email, nombre: 'Administrador', rol: 'Admin' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) toast.error('Error de credenciales: ' + error.message);
    else if (data.session) {
      toast.success('¡Bienvenido al sistema!');
      await cargarPerfil(data.session.user.id, data.session.user.email!);
    }
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info('Sesión cerrada');
  };

  const fetchIncidencias = async () => {
    setLoading(true);
    const { data } = await supabase.from('incidencias').select('*').order('created_at', { ascending: false });
    if (data) setIncidencias(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidencias();
    fetchPadronOdpes();
  }, []);

  const subirImagen = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `admin/${fileName}`;

    const { error } = await supabase.storage.from('incidencias-fotos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('incidencias-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const agregarAlCatalogo = (tipo: 'supervisor' | 'equipo') => {
    if (!inputNuevoCatalog.trim()) return;
    const val = inputNuevoCatalog.trim();

    if (tipo === 'supervisor' && !listaSupervisores.includes(val)) {
      setListaSupervisores([...listaSupervisores, val]);
      setSupervisor(val);
      toast.success(`Supervisor ${val} añadido`);
    }
    if (tipo === 'equipo' && !listaEquipos.includes(val)) {
      setListaEquipos([...listaEquipos, val.toUpperCase()]);
      setEquipoSeleccionado(val.toUpperCase());
      toast.success(`Equipo ${val.toUpperCase()} añadido`);
    }

    setInputNuevoCatalog('');
    setModalCatalogos(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (perfil?.rol === 'Visitante') return toast.error('Acceso de solo lectura.');

    setEnviandoAdmin(true);
    try {
      let urlFoto1 = '';
      let urlFoto2 = '';

      if (archivoFoto1) urlFoto1 = await subirImagen(archivoFoto1);
      if (archivoFoto2) urlFoto2 = await subirImagen(archivoFoto2);

      const equipoFinal = equipoSeleccionado === 'OTRO' ? (otroEquipoAdmin.trim().toUpperCase() || 'OTRO EQUIPO') : equipoSeleccionado;

      const payload = {
        odpe_nombre: odpeSeleccionada,
        supervisor: supervisor,
        tecnico_nombre: tecnicoNombre,
        tecnico_dni: tecnicoDni,
        tecnico_celular: tecnicoCelular.replace(/\s+/g, ''),
        tipo_problema: tipoProblema,
        equipo_afectado: equipoFinal,
        marca,
        modelo,
        serie,
        estado,
        descripcion,
        foto_1: urlFoto1 || undefined,
        foto_2: urlFoto2 || undefined,
        usuario_a_cargo: tecnicoNombre || supervisor || 'S/N',
      };

      if (editandoId) {
        await supabase.from('incidencias').update(payload).eq('id', editandoId);
        toast.success('Incidencia actualizada correctamente');
        limpiarFormulario();
        fetchIncidencias();
      } else {
        await supabase.from('incidencias').insert([{ ...payload, creado_por: perfil?.correo, en_papelera: false }]);
        toast.success('Incidencia registrada con éxito');
        limpiarFormulario();
        fetchIncidencias();
      }
    } catch (err: any) {
      toast.error('Error al subir imágenes: ' + err.message);
    }
    setEnviandoAdmin(false);
  };

  const handleActualizarEstadoSoporte = async () => {
    if (!modalEditarSoporte) return;
    setGuardandoSoporte(true);

    const observacionActualizada = `${modalEditarSoporte.descripcion}\n\n[ACTUALIZACIÓN ATENCIÓN]: ${nuevasObsSoporte.trim()}`;

    const { error } = await supabase.from('incidencias').update({
      estado: nuevoEstadoSoporte,
      descripcion: nuevasObsSoporte.trim() ? observacionActualizada : modalEditarSoporte.descripcion
    }).eq('id', modalEditarSoporte.id);

    if (error) {
      toast.error('Error al actualizar soporte: ' + error.message);
    } else {
      toast.success('Reporte de soporte actualizado');
      setModalEditarSoporte(null);
      setNuevasObsSoporte('');
      fetchIncidencias();
    }
    setGuardandoSoporte(false);
  };

  const moverAPapelera = async (id: number, enviarAPapelera: boolean) => {
    if (perfil?.rol === 'Visitante') return toast.error('Acción no permitida.');
    await supabase.from('incidencias').update({ en_papelera: enviarAPapelera }).eq('id', id);
    toast.info(enviarAPapelera ? 'Movido a papelera' : 'Restaurado');
    fetchIncidencias();
  };

  const eliminarDefinitivo = async (id: number) => {
    if (perfil?.rol !== 'Admin') return toast.error('Solo el rol Administrador puede eliminar registros.');
    if (confirm('¿Eliminar registro de forma permanente?')) {
      await supabase.from('incidencias').delete().eq('id', id);
      toast.success('Registro eliminado definitivamente');
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
    toast.success('Resumen copiado al portapapeles');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setMarca('');
    setModelo('');
    setSerie('');
    setDescripcion('');
    setOtroEquipoAdmin('');
    setArchivoFoto1(null);
    setArchivoFoto2(null);
    setEstado('Reportado');
  };

  const exportarCSV = () => {
    if (incidencias.length === 0) return toast.error('No hay datos para exportar');
    const sep = ';';
    const columnas = ['ID', 'FECHA', 'ODPE', 'EQUIPO', 'MARCA', 'MODELO', 'SERIE', 'ESTADO', 'TECNICO', 'CELULAR', 'FOTO1', 'FOTO2', 'CREADO_POR'];
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
      `"${i.foto_1 || ''}"`,
      `"${i.foto_2 || ''}"`,
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
    toast.success('Reporte descargado');
  };

  const odpesFiltradasPadron = listaPadron.filter(p =>
    p.odpe_nombre.toLowerCase().includes(busquedaOdpeInput.toLowerCase())
  );

  const directorioOdpesFiltrado = listaPadron.filter(p =>
    p.odpe_nombre.toLowerCase().includes(busquedaDirectorioInput.toLowerCase()) ||
    (p.tecnico_nombre || '').toLowerCase().includes(busquedaDirectorioInput.toLowerCase()) ||
    (p.supervisor_nombre || '').toLowerCase().includes(busquedaDirectorioInput.toLowerCase()) ||
    (p.dni || '').includes(busquedaDirectorioInput)
  );

  const incidenciasFiltradas = incidencias.filter(item => {
    const coincidePapelera = vistaPapelera ? item.en_papelera : !item.en_papelera;
    const coincideEstado = filtroEstado === 'Todos los Estados' || item.estado === filtroEstado;
    const coincideEquipo = filtroEquipo === 'Todos los Equipos' || item.equipo_afectado === filtroEquipo;
    const coincideBusqueda = (item.id.toString()).includes(busquedaActiva) ||
                             (item.equipo_afectado || '').toLowerCase().includes(busquedaActiva.toLowerCase()) ||
                             (item.odpe_nombre || '').toLowerCase().includes(busquedaActiva.toLowerCase()) ||
                             (item.descripcion || '').toLowerCase().includes(busquedaActiva.toLowerCase());
    
    const esReporteSoporte = item.creado_por?.includes('(Técnico de Campo)') || item.creado_por?.includes('Técnico');
    
    if (seccionActiva === 'soportes') return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda && esReporteSoporte;
    if (seccionActiva === 'incidentes') return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda && !esReporteSoporte;

    return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda;
  });

  const totalReportados = incidencias.filter(i => !i.en_papelera && i.estado === 'Reportado').length;
  const totalEnProceso = incidencias.filter(i => !i.en_papelera && i.estado === 'En Proceso').length;
  const totalAlmacen = incidencias.filter(i => !i.en_papelera && i.estado === 'Almacén').length;
  const totalResueltos = incidencias.filter(i => !i.en_papelera && i.estado === 'Resuelto').length;

  if (!sesion) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <Toaster position="top-center" richColors />
        {!modoReportePublico ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black text-xl px-4 py-2 rounded-2xl mb-2">
                <ShieldCheck className="w-6 h-6 text-blue-400" /> ODPE TRACKER
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">Acceso Administrativo</h1>
              <p className="text-xs text-slate-400">Ingresa tus credenciales institucionales</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Correo Electrónico</label>
                <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="usuario@onpe.gob.pe" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-200 focus:border-blue-500 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[10px]">Contraseña</label>
                <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-200 focus:border-blue-500 focus:outline-none transition-all" />
              </div>

              <button type="submit" disabled={loadingAuth} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-xs">
                {loadingAuth ? 'Validando...' : 'Ingresar al Panel'}
              </button>
            </form>

            <div className="relative border-t border-slate-800 pt-4 text-center">
              <button onClick={() => setModoReportePublico(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-slate-700">
                <Wrench className="w-4 h-4 text-emerald-400" /> Acceso Técnicos de Campo (DNI)
              </button>
            </div>
          </div>
        ) : (
          <PortalTecnico onVolver={() => setModoReportePublico(false)} onIncidenciaCreada={fetchIncidencias} />
        )}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100">
      <Toaster position="bottom-right" richColors />
      
      {/* SIDEBAR NAVEGACIÓN MODERNO */}
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between p-4 shadow-2xl border-r border-slate-800/80">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800">
            <div className="bg-blue-600/20 border border-blue-500/30 text-blue-400 p-2 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide text-white">ODPE TRACKER</h2>
              <p className="text-[10px] text-slate-400 font-medium">Gestión Electoral Regional</p>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs font-semibold">
            <button onClick={() => setSeccionActiva('dashboard')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => setSeccionActiva('incidentes')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'incidentes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <FileText className="w-4 h-4" /> Incidentes Generales
            </button>
            <button onClick={() => setSeccionActiva('soportes')} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'soportes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <span className="flex items-center gap-2.5"><Wrench className="w-4 h-4" /> Reportes Soportes</span>
              <span className="bg-emerald-950/80 text-[9px] px-2 py-0.5 rounded-full text-emerald-400 border border-emerald-800/60 font-bold">Campo</span>
            </button>
            <button onClick={() => setSeccionActiva('odpes')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'odpes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <Globe className="w-4 h-4" /> Directorio ODPEs ({listaPadron.length})
            </button>
            <button onClick={() => setSeccionActiva('tecnicos')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'tecnicos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <Users className="w-4 h-4" /> Personal
            </button>
            <button onClick={() => setSeccionActiva('reportes')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'reportes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" /> Exportar Excel
            </button>
            <button onClick={() => setSeccionActiva('historial')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${seccionActiva === 'historial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
              <History className="w-4 h-4" /> Historial
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800/80 pt-3 text-xs space-y-2">
          <div className="px-2">
            <p className="font-bold text-white truncate">{perfil?.nombre}</p>
            <p className="text-[10px] text-slate-400 truncate">{perfil?.correo}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-900/40 text-purple-300 border border-purple-700/50">ROL: {perfil?.rol}</span>
          </div>
          <button onClick={handleLogout} className="w-full bg-red-950/30 hover:bg-red-900/40 text-red-400 font-bold py-2 rounded-xl border border-red-800/40 flex items-center justify-center gap-2 transition-all">
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <header className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              {seccionActiva === 'soportes' ? <Wrench className="w-5 h-5 text-emerald-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
              {seccionActiva === 'soportes' ? 'Solicitudes Enviadas por Soportes de Campo' : seccionActiva}
            </h1>
            <p className="text-xs text-slate-400 font-medium">Monitoreo y auditoría técnica para {listaPadron.length || 126} sedes regionales</p>
          </div>
          <button onClick={() => setVistaPapelera(!vistaPapelera)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${vistaPapelera ? 'bg-amber-950/50 text-amber-300 border-amber-800' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
            <Archive className="w-4 h-4" /> {vistaPapelera ? 'Ver Activos' : 'Papelera'}
          </button>
        </header>

        {seccionActiva === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Sedes</span>
                <p className="text-3xl font-black text-white">{listaPadron.length}</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl text-center">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">Reportados</span>
                <p className="text-3xl font-black text-red-500">{totalReportados}</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">En Proceso</span>
                <p className="text-3xl font-black text-amber-500">{totalEnProceso}</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl text-center">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">En Almacén</span>
                <p className="text-3xl font-black text-purple-400">{totalAlmacen}</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Resueltos</span>
                <p className="text-3xl font-black text-emerald-500">{totalResueltos}</p>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Últimas Incidencias Registradas
              </h3>
              <div className="space-y-2">
                {incidencias.slice(0, 5).map(i => (
                  <div key={i.id} className="flex justify-between items-center p-3.5 bg-slate-950/60 rounded-xl text-xs border border-slate-800/60">
                    <div>
                      <span className="font-mono text-blue-400 font-bold">#{i.id} - {i.odpe_nombre}</span>
                      <p className="text-slate-300 font-semibold">{i.equipo_afectado} ({i.marca || 'S/M'})</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">{i.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA REPORTES DE SOPORTES */}
        {seccionActiva === 'soportes' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-800 pb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input type="text" placeholder="Buscar requerimiento..." value={inputBusqueda} onChange={(e) => setInputBusqueda(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-9 text-xs text-white focus:outline-none focus:border-blue-500" />
              </div>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200">
                <option value="Todos los Estados">Todos los Estados</option>
                {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
              </select>
              <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200">
                <option value="Todos los Equipos">Todos los Equipos</option>
                {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="font-bold border-b border-slate-800 uppercase text-slate-400 bg-slate-950/50">
                  <tr>
                    <th className="py-3.5 px-3">ID / ODPE</th>
                    <th className="py-3.5 px-3">Equipo</th>
                    <th className="py-3.5 px-3">Técnico de Campo</th>
                    <th className="py-3.5 px-3">Evidencia</th>
                    <th className="py-3.5 px-3">Estado</th>
                    <th className="py-3.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {incidenciasFiltradas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-blue-400 font-bold">#{item.id}</span>
                        <p className="font-bold text-white">{item.odpe_nombre}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-200">{item.equipo_afectado}</p>
                        <p className="text-[10px] text-slate-400">Serie: {item.serie || 'S/S'}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-200">{item.tecnico_nombre}</p>
                        <p className="text-[10px] text-slate-400">Cel: {item.tecnico_celular || 'S/N'}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        {item.foto_1 || item.foto_2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                            <Camera className="w-3 h-3" /> {item.foto_1 && item.foto_2 ? '2 Fotos' : '1 Foto'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Sin foto</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.estado === 'Resuelto' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                          item.estado === 'En Proceso' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                          item.estado === 'Almacén' ? 'bg-purple-950/80 text-purple-300 border border-purple-800' :
                          'bg-red-950/80 text-red-300 border border-red-800'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-1.5">
                        <button onClick={() => setModalVer(item)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg font-bold transition-all" title="Ver Detalles">🔍 Ver</button>
                        <button onClick={() => { setModalEditarSoporte(item); setNuevoEstadoSoporte(item.estado); }} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all" title="Atender">✏️ Atender</button>
                        <button onClick={() => moverAPapelera(item.id, true)} className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 px-2.5 py-1.5 rounded-lg border border-amber-800/60 font-bold transition-all" title="Papelera">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA INCIDENTES GENERALES */}
        {seccionActiva === 'incidentes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" /> {editandoId ? 'Editar Registro' : 'Nueva Incidencia'}
                </h2>
                {editandoId && <button onClick={limpiarFormulario} className="text-xs text-red-400 underline">Cancelar</button>}
              </div>

              {perfil?.rol === 'Visitante' ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">🔒 Permisos de solo lectura.</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">ODPE AFECTADA</label>
                    <input
                      type="text"
                      placeholder="Filtrar ODPE..."
                      value={busquedaOdpeInput}
                      onChange={(e) => setBusquedaOdpeInput(e.target.value)}
                      className="w-full rounded-lg p-2 text-xs border border-slate-800 bg-slate-950 text-white mb-1 focus:border-blue-500"
                    />
                    <select
                      value={odpeSeleccionada}
                      onChange={(e) => handleCambioOdpe(e.target.value)}
                      className="w-full rounded-lg p-2.5 border border-slate-800 bg-slate-950 font-bold text-white uppercase focus:border-blue-500"
                    >
                      {odpesFiltradasPadron.map((p) => (
                        <option key={p.dni} value={p.odpe_nombre}>
                          {p.odpe_nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="block font-bold text-[10px] uppercase text-slate-400">Responsables de Sede</span>
                      {datosTecnicoExiste && <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-bold px-1.5 py-0.5 rounded-full">✓ Auto-rellenado</span>}
                    </div>
                    
                    <input type="text" placeholder="Supervisor" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className="w-full rounded-lg p-2 border border-slate-800 bg-slate-900 text-white font-semibold" />
                    <input type="text" placeholder="Nombre Técnico" value={tecnicoNombre} onChange={(e) => setTecnicoNombre(e.target.value)} className="w-full rounded-lg p-2 border border-slate-800 bg-slate-900 text-white font-semibold" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="DNI" maxLength={8} value={tecnicoDni} onChange={(e) => setTecnicoDni(e.target.value)} className="rounded-lg p-2 border border-slate-800 bg-slate-900 text-white font-mono" />
                      <input type="text" placeholder="Celular" maxLength={9} value={tecnicoCelular} onChange={(e) => setTecnicoCelular(e.target.value)} className="rounded-lg p-2 border border-slate-800 bg-slate-900 text-white font-mono" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-slate-400">EQUIPO AFECTADO</label>
                      <button type="button" onClick={() => setModalCatalogos('equipo')} className="text-[10px] text-blue-400 hover:underline font-bold">+ Agregar Tipo</button>
                    </div>
                    <select value={equipoSeleccionado} onChange={(e) => setEquipoSeleccionado(e.target.value)} className="w-full rounded-lg p-2.5 border border-slate-800 bg-slate-950 text-white">
                      {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
                      <option value="OTRO">⚠️ OTRO EQUIPO...</option>
                    </select>

                    {equipoSeleccionado === 'OTRO' && (
                      <input
                        type="text"
                        required
                        placeholder="Nombre del equipo..."
                        value={otroEquipoAdmin}
                        onChange={(e) => setOtroEquipoAdmin(e.target.value)}
                        className="w-full rounded-lg p-2 border border-amber-500 bg-amber-950/40 text-amber-300 uppercase font-bold"
                      />
                    )}

                    <div className="grid grid-cols-3 gap-1.5">
                      <input type="text" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="rounded-lg p-2 text-[11px] border border-slate-800 bg-slate-950 text-white" />
                      <input type="text" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="rounded-lg p-2 text-[11px] border border-slate-800 bg-slate-950 text-white" />
                      <input type="text" placeholder="N° Serie" value={serie} onChange={(e) => setSerie(e.target.value)} className="rounded-lg p-2 text-[11px] border border-slate-800 bg-slate-950 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select value={tipoProblema} onChange={(e) => setTipoProblema(e.target.value)} className="w-full rounded-lg p-2 border border-slate-800 bg-slate-950 text-white">
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Red">Red</option>
                    </select>

                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-lg p-2 border border-slate-800 bg-slate-950 text-white">
                      {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                    </select>
                  </div>

                  <textarea rows={2} placeholder="Observaciones..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full rounded-xl p-2.5 border border-slate-800 bg-slate-950 text-white" />

                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">📷 Adjuntar Fotos (Opcional - Máx 2)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input type="file" accept="image/*" onChange={(e) => setArchivoFoto1(e.target.files?.[0] || null)} className="text-[9px] text-slate-400 w-full" />
                      <input type="file" accept="image/*" onChange={(e) => setArchivoFoto2(e.target.files?.[0] || null)} className="text-[9px] text-slate-400 w-full" />
                    </div>
                  </div>

                  <button type="submit" disabled={enviandoAdmin} className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-xl text-white shadow-lg shadow-blue-600/20 transition-all">
                    {enviandoAdmin ? 'Guardando...' : editandoId ? 'Actualizar Registro' : 'Guardar Incidencia'}
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-800 pb-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input type="text" placeholder="Buscar..." value={inputBusqueda} onChange={(e) => setInputBusqueda(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-9 text-xs text-white" />
                </div>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200">
                  <option value="Todos los Estados">Todos los Estados</option>
                  {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                </select>
                <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200">
                  <option value="Todos los Equipos">Todos los Equipos</option>
                  {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
                </select>
              </div>

              {loading ? (
                <p className="text-xs py-8 text-center text-slate-500">Cargando...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="font-bold border-b border-slate-800 uppercase text-slate-400 bg-slate-950/50">
                      <tr>
                        <th className="py-3.5 px-3">ID / ODPE</th>
                        <th className="py-3.5 px-3">Equipo</th>
                        <th className="py-3.5 px-3">Estado</th>
                        <th className="py-3.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {incidenciasFiltradas.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-3">
                            <span className="font-mono text-blue-400 font-bold">#{item.id}</span>
                            <p className="font-bold text-white">{item.odpe_nombre}</p>
                            <p className="text-[10px] text-slate-500">Por: {item.creado_por || 'Sistema'}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-semibold text-slate-200">{item.equipo_afectado}</p>
                            <p className="text-[10px] text-slate-400">Serie: {item.serie || 'S/S'}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.estado === 'Resuelto' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' :
                              item.estado === 'En Proceso' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                              item.estado === 'Almacén' ? 'bg-purple-950/80 text-purple-300 border border-purple-800' :
                              'bg-red-950/80 text-red-300 border border-red-800'
                            }`}>
                              {item.estado}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right space-x-1.5">
                            <button onClick={() => setModalVer(item)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded font-bold">🔍</button>
                            <button onClick={() => copiarResumen(item)} title="Copiar" className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-bold">📋</button>

                            {perfil?.rol !== 'Visitante' && !vistaPapelera && (
                              <>
                                <button onClick={() => cargarParaEditar(item)} className="bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-800 px-2 py-1 rounded font-bold">✏️</button>
                                <button onClick={() => moverAPapelera(item.id, true)} className="bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-800 px-2 py-1 rounded font-bold">🗑️</button>
                              </>
                            )}

                            {perfil?.rol === 'Admin' && vistaPapelera && (
                              <button onClick={() => eliminarDefinitivo(item.id)} className="bg-red-600 text-white px-2 py-1 rounded font-bold">❌</button>
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

        {/* PESTAÑA DIRECTORIO ODPES */}
        {seccionActiva === 'odpes' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-800 pb-3">
              <h2 className="font-bold text-sm text-white uppercase flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Directorio Oficial ({directorioOdpesFiltrado.length} de {listaPadron.length} Sedes)
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar ODPE, Técnico, DNI..."
                  value={busquedaDirectorioInput}
                  onChange={(e) => setBusquedaDirectorioInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 pl-9 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {directorioOdpesFiltrado.map((p) => (
                <div key={p.dni} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5 text-xs hover:border-blue-500/50 transition-all">
                  <span className="font-black text-blue-400 block text-sm tracking-wide">{p.odpe_nombre}</span>
                  <p className="text-slate-300"><strong>Técnico:</strong> {p.tecnico_nombre || 'Sin asignar'}</p>
                  <p className="text-slate-400 font-mono"><strong>DNI:</strong> {p.dni} | <strong>Celular:</strong> {p.tecnico_celular || 'S/N'}</p>
                  <p className="text-slate-400"><strong>Supervisor:</strong> {p.supervisor_nombre || 'S/N'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {seccionActiva === 'tecnicos' && (
          <TablaTecnicos incidencias={incidencias} />
        )}

        {seccionActiva === 'reportes' && (
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl space-y-4 text-center py-16 max-w-xl mx-auto">
            <BarChart3 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-xl text-white">Consolidado Oficial de Incidentes</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">Descarga un reporte completo en formato CSV/Excel con las fechas, responsables y estados de cada ODPE.</p>
            <button onClick={exportarCSV} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-xs">📊 Descargar Excel Completo</button>
          </div>
        )}

        {seccionActiva === 'historial' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" /> Historial de Actividad
            </h3>
            <div className="space-y-2 text-xs">
              {incidencias.map(i => (
                <div key={i.id} className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">Incidencia #{i.id} creada por {i.creado_por || 'Sistema'}</p>
                    <p className="text-slate-400">{i.odpe_nombre} - {i.equipo_afectado}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(i.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDITAR SOPORTE */}
      {modalEditarSoporte && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs border border-slate-800 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Atender Solicitud #{modalEditarSoporte.id} ({modalEditarSoporte.odpe_nombre})</h3>
              <button onClick={() => setModalEditarSoporte(null)} className="font-bold text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Cambiar Estado:</label>
                <select
                  value={nuevoEstadoSoporte}
                  onChange={(e) => setNuevoEstadoSoporte(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white"
                >
                  {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Observaciones de la Solución:</label>
                <textarea
                  rows={3}
                  placeholder="Detalla cómo se resolvió..."
                  value={nuevasObsSoporte}
                  onChange={(e) => setNuevasObsSoporte(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleActualizarEstadoSoporte}
                  disabled={guardandoSoporte}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  {guardandoSoporte ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button onClick={() => setModalEditarSoporte(null)} className="w-full bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES FICHA */}
      {modalVer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs border border-slate-800 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">DETALLE TÉCNICO #{modalVer.id}</h3>
              <button onClick={() => setModalVer(null)} className="font-bold text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2 text-[11px]">
                <p><strong>ODPE:</strong> <span className="text-blue-400 font-bold">{modalVer.odpe_nombre}</span></p>
                <p><strong>Estado:</strong> <span className="font-bold text-emerald-400">{modalVer.estado}</span></p>
                <p><strong>Creado por:</strong> <span className="font-semibold text-purple-400">{modalVer.creado_por || 'Sistema'}</span></p>
                <p><strong>Fecha:</strong> {new Date(modalVer.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' })}</p>
              </div>

              <div className="space-y-1.5 pt-1">
                <p><strong>Equipo:</strong> {modalVer.equipo_afectado} ({modalVer.marca || 'S/M'} - {modalVer.modelo || 'S/M'})</p>
                <p><strong>N° Serie:</strong> <span className="font-mono text-slate-300">{modalVer.serie || 'N/A'}</span></p>
                <p><strong>Supervisor:</strong> {modalVer.supervisor || 'N/A'}</p>
                <p><strong>Técnico Responsable:</strong> {modalVer.tecnico_nombre || 'N/A'}</p>
                <p><strong>DNI / Celular Técnico:</strong> <span className="font-mono text-slate-300">{modalVer.tecnico_dni || 'S/N'} / {modalVer.tecnico_celular || 'S/N'}</span></p>
                <p><strong>Observaciones:</strong> {modalVer.descripcion || 'Sin observaciones'}</p>
              </div>

              {(modalVer.foto_1 || modalVer.foto_2) && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">📷 Evidencia Fotográfica:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {modalVer.foto_1 && (
                      <a href={modalVer.foto_1} target="_blank" rel="noopener noreferrer" className="block border border-slate-800 rounded-xl overflow-hidden hover:opacity-80">
                        <img src={modalVer.foto_1} alt="Evidencia 1" className="w-full h-28 object-cover" />
                      </a>
                    )}
                    {modalVer.foto_2 && (
                      <a href={modalVer.foto_2} target="_blank" rel="noopener noreferrer" className="block border border-slate-800 rounded-xl overflow-hidden hover:opacity-80">
                        <img src={modalVer.foto_2} alt="Evidencia 2" className="w-full h-28 object-cover" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => copiarResumen(modalVer)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-600/20">Copiar Ficha</button>
              <button onClick={() => setModalVer(null)} className="w-full bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
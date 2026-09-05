'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PortalTecnico from '@/app/components/PortalTecnico';
import SeccionPagos from '@/app/components/SeccionPagos';
import { Toaster, toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import {
  LayoutDashboard,
  FileText,
  Wrench,
  Globe,
  BarChart3,
  History,
  Search,
  PlusCircle,
  Archive,
  LogOut,
  ShieldCheck,
  Palette,
  Sun,
  Moon,
  Coffee,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  DollarSign
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
  supervisor_asignado?: string;
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

type Tema = 'calido-claro' | 'calido-oscuro' | 'corporativo-limpio';

export default function Home() {
  const [sesion, setSesion] = useState<any>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // ESTADO DE TEMA (PALETA DE COLORES)
  const [tema, setTema] = useState<Tema>('calido-claro');

  const [modoReportePublico, setModoReportePublico] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState<'dashboard' | 'incidentes' | 'soportes' | 'pagos' | 'odpes' | 'supervisores' | 'reportes' | 'historial'>('incidentes');

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaPapelera, setVistaPapelera] = useState(false);
  const [modalVer, setModalVer] = useState<Incidencia | null>(null);

  // PAGINACIÓN (20 por página)
  const [paginaActualIncidentes, setPaginaActualIncidentes] = useState(1);
  const [paginaActualSoportes, setPaginaActualSoportes] = useState(1);
  const [paginaActualOdpes, setPaginaActualOdpes] = useState(1);
  const elementosPorPagina = 20;

  // Modal Edición Rápida Soportes / Delegación
  const [modalEditarSoporte, setModalEditarSoporte] = useState<Incidencia | null>(null);
  const [nuevoEstadoSoporte, setNuevoEstadoSoporte] = useState('Resuelto');
  const [nuevoSupervisorAsignado, setNuevoSupervisorAsignado] = useState('');
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

  // Supervisor seleccionado para ver sus tareas asignadas en detalle
  const [supervisorDetalleSeleccionado, setSupervisorDetalleSeleccionado] = useState<string | null>(null);

  // Formulario Admin
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [odpeSeleccionada, setOdpeSeleccionada] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [supervisorAsignadoAdmin, setSupervisorAsignadoAdmin] = useState('');
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

  // Guardar/Recuperar Tema Preferido
  useEffect(() => {
    const temaGuardado = localStorage.getItem('odpe_tracker_tema') as Tema;
    if (temaGuardado) setTema(temaGuardado);
  }, []);

  const cambiarTema = (nuevoTema: Tema) => {
    setTema(nuevoTema);
    localStorage.setItem('odpe_tracker_tema', nuevoTema);
    toast.success(`Tema cambiado a ${nuevoTema.replace('-', ' ')}`);
  };

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

    const canalSincronizacion = supabase.channel('realtime-incidencias')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => {
        fetchIncidencias();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalSincronizacion);
    };
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
        supervisor_asignado: supervisorAsignadoAdmin || null,
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
      } else {
        await supabase.from('incidencias').insert([{ ...payload, creado_por: perfil?.correo, en_papelera: false }]);
        toast.success('Incidencia registrada con éxito');
        limpiarFormulario();
      }
    } catch (err: any) {
      toast.error('Error al subir imágenes: ' + err.message);
    }
    setEnviandoAdmin(false);
  };

  const handleActualizarEstadoSoporte = async () => {
    if (!modalEditarSoporte) return;
    setGuardandoSoporte(true);

    const observacionActualizada = nuevasObsSoporte.trim()
      ? `${modalEditarSoporte.descripcion}\n\n[ACTUALIZACIÓN ATENCIÓN]: ${nuevasObsSoporte.trim()}`
      : modalEditarSoporte.descripcion;

    const { error } = await supabase.from('incidencias').update({
      estado: nuevoEstadoSoporte,
      supervisor_asignado: nuevoSupervisorAsignado || null,
      descripcion: observacionActualizada
    }).eq('id', modalEditarSoporte.id);

    if (error) {
      toast.error('Error al actualizar soporte: ' + error.message);
    } else {
      toast.success('Reporte de soporte y delegación actualizados');
      setModalEditarSoporte(null);
      setNuevasObsSoporte('');
    }
    setGuardandoSoporte(false);
  };

  const moverAPapelera = async (id: number, enviarAPapelera: boolean) => {
    if (perfil?.rol === 'Visitante') return toast.error('Acción no permitida.');
    await supabase.from('incidencias').update({ en_papelera: enviarAPapelera }).eq('id', id);
    toast.info(enviarAPapelera ? 'Movido a papelera' : 'Restaurado');
  };

  const eliminarDefinitivo = async (id: number) => {
    if (perfil?.rol !== 'Admin') return toast.error('Solo el rol Administrador puede eliminar registros.');
    if (confirm('¿Eliminar registro de forma permanente?')) {
      await supabase.from('incidencias').delete().eq('id', id);
      toast.success('Registro eliminado definitivamente');
    }
  };

  const cargarParaEditar = (item: Incidencia) => {
    setEditandoId(item.id);
    setOdpeSeleccionada(item.odpe_nombre);
    setSupervisor(item.supervisor || '');
    setSupervisorAsignadoAdmin(item.supervisor_asignado || '');
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

  const limpiarFormulario = () => {
    setEditandoId(null);
    setMarca('');
    setModelo('');
    setSerie('');
    setDescripcion('');
    setSupervisorAsignadoAdmin('');
    setOtroEquipoAdmin('');
    setArchivoFoto1(null);
    setArchivoFoto2(null);
    setEstado('Reportado');
  };

  const exportarExcelProfesional = () => {
    if (incidencias.length === 0) return toast.error('No hay datos para exportar');

    const datosFormateados = incidencias.map(i => ({
      ID: i.id,
      Fecha: new Date(i.created_at).toLocaleString('es-PE'),
      ODPE: i.odpe_nombre,
      Equipo: i.equipo_afectado,
      Marca: i.marca || 'S/M',
      Modelo: i.modelo || 'S/M',
      Serie: i.serie || 'S/S',
      Estado: i.estado,
      'Supervisor Asignado': i.supervisor_asignado || 'Sin delegar',
      'Técnico Sede': i.tecnico_nombre || 'S/N',
      Celular: i.tecnico_celular || 'S/N',
      Observaciones: i.descripcion || 'Sin observaciones'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);

    const estiloHeader = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2C2825' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    const estiloCeldas = {
      font: { name: 'Calibri', sz: 10 },
      alignment: { vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'D3D3D3' } },
        bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
        left: { style: 'thin', color: { rgb: 'D3D3D3' } },
        right: { style: 'thin', color: { rgb: 'D3D3D3' } }
      }
    };

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[headerCell]) worksheet[headerCell].s = estiloHeader;
    }

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (worksheet[cellAddress]) worksheet[cellAddress].s = estiloCeldas;
      }
    }

    worksheet['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 18 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 14 },
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 35 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado ODPE');

    XLSX.writeFile(workbook, `Consolidado_ODPE_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('¡Reporte Excel profesional descargado con éxito!');
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
                             (item.supervisor_asignado || '').toLowerCase().includes(busquedaActiva.toLowerCase()) ||
                             (item.descripcion || '').toLowerCase().includes(busquedaActiva.toLowerCase());
    
    const esReporteSoporte = item.creado_por?.includes('(Técnico de Campo)') || item.creado_por?.includes('Técnico');
    
    if (seccionActiva === 'soportes') return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda && esReporteSoporte;
    if (seccionActiva === 'incidentes') return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda && !esReporteSoporte;

    return coincidePapelera && coincideEstado && coincideEquipo && coincideBusqueda;
  });

  // PAGINACIÓN CÁLCULOS
  const totalPaginasIncidentes = Math.ceil(incidenciasFiltradas.length / elementosPorPagina) || 1;
  const indexUltimoIncidente = paginaActualIncidentes * elementosPorPagina;
  const indexPrimerIncidente = indexUltimoIncidente - elementosPorPagina;
  const incidenciasPaginadas = incidenciasFiltradas.slice(indexPrimerIncidente, indexUltimoIncidente);

  const totalPaginasOdpes = Math.ceil(directorioOdpesFiltrado.length / elementosPorPagina) || 1;
  const indexUltimaOdpe = paginaActualOdpes * elementosPorPagina;
  const indexPrimeraOdpe = indexUltimaOdpe - elementosPorPagina;
  const odpesPaginadas = directorioOdpesFiltrado.slice(indexPrimeraOdpe, indexUltimaOdpe);

  const totalReportados = incidencias.filter(i => !i.en_papelera && i.estado === 'Reportado').length;
  const totalEnProceso = incidencias.filter(i => !i.en_papelera && i.estado === 'En Proceso').length;
  const totalAlmacen = incidencias.filter(i => !i.en_papelera && i.estado === 'Almacén').length;
  const totalResueltos = incidencias.filter(i => !i.en_papelera && i.estado === 'Resuelto').length;

  const estilosTema = {
    'calido-claro': {
      bgMain: 'bg-[#FBF9F1] text-stone-900',
      bgCard: 'bg-[#F3EFE0] border-stone-300 shadow-stone-200/50',
      bgInput: 'bg-[#FFFDF7] border-stone-300 text-stone-900 focus:border-amber-700',
      bgSidebar: 'bg-[#2C2825] text-amber-50 border-stone-800',
      accentPrimary: 'bg-amber-700 hover:bg-amber-600 text-white',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      subtext: 'text-stone-600'
    },
    'calido-oscuro': {
      bgMain: 'bg-[#181615] text-stone-100',
      bgCard: 'bg-[#221F1E] border-stone-800 shadow-black/40',
      bgInput: 'bg-[#141211] border-stone-800 text-stone-100 focus:border-amber-500',
      bgSidebar: 'bg-[#1C1A19] text-stone-200 border-stone-800',
      accentPrimary: 'bg-amber-600 hover:bg-amber-500 text-white',
      badge: 'bg-amber-950/60 text-amber-300 border-amber-800',
      subtext: 'text-stone-300'
    },
    'corporativo-limpio': {
      bgMain: 'bg-slate-100 text-slate-900',
      bgCard: 'bg-white border-slate-200 shadow-slate-200/50',
      bgInput: 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600',
      bgSidebar: 'bg-slate-900 text-slate-100 border-slate-800',
      accentPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
      badge: 'bg-blue-100 text-blue-900 border-blue-200',
      subtext: 'text-slate-600'
    }
  }[tema];

  if (!sesion) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 font-sans text-sm ${estilosTema.bgMain}`}>
        <Toaster position="top-center" richColors />
        {!modoReportePublico ? (
          <div className={`${estilosTema.bgCard} border p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6`}>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-600/20 text-amber-700 font-black text-lg px-4 py-2 rounded-2xl mb-2">
                <ShieldCheck className="w-6 h-6 text-amber-700" /> Gestor ODPE
              </div>
              <h1 className="text-2xl font-black tracking-tight">Team Supers</h1>
              <p className={`text-xs ${estilosTema.subtext}`}>Ingresa tus credenciales</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className={`block font-bold mb-1 uppercase text-[11px] ${estilosTema.subtext}`}>Correo Electrónico</label>
                <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="usuario@gmail.com" className={`w-full rounded-xl p-3.5 text-sm ${estilosTema.bgInput} focus:outline-none transition-all`} />
              </div>
              <div>
                <label className={`block font-bold mb-1 uppercase text-[11px] ${estilosTema.subtext}`}>Contraseña</label>
                <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="••••••••" className={`w-full rounded-xl p-3.5 text-sm ${estilosTema.bgInput} focus:outline-none transition-all`} />
              </div>

              <button type="submit" disabled={loadingAuth} className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg text-sm ${estilosTema.accentPrimary}`}>
                {loadingAuth ? 'Validando...' : 'Ingresar al Panel'}
              </button>
            </form>

            <div className="relative border-t border-stone-300/40 pt-4 text-center">
              <button onClick={() => setModoReportePublico(true)} className={`w-full font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border ${estilosTema.bgCard}`}>
                <Wrench className="w-4 h-4 text-emerald-600" /> Acceso Técnicos de Campo (DNI)
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
    <div className={`min-h-screen flex font-sans text-sm ${estilosTema.bgMain}`}>
      <Toaster position="bottom-right" richColors />
      
      {/* SIDEBAR NAVEGACIÓN */}
      <aside className={`w-64 ${estilosTema.bgSidebar} flex flex-col justify-between p-5 shadow-xl border-r`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-stone-700/50">
            <div className="bg-amber-600/20 border border-amber-500/30 text-amber-500 p-2.5 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-wide">ODPE TRACKER</h2>
              <p className="text-[11px] opacity-70 font-medium">Gestión Electoral Regional</p>
            </div>
          </div>

          <nav className="space-y-2 text-xs font-semibold">
            <button onClick={() => setSeccionActiva('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'dashboard' ? estilosTema.accentPrimary : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => setSeccionActiva('incidentes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'incidentes' ? estilosTema.accentPrimary : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <FileText className="w-4 h-4" /> Incidentes Generales
            </button>
            <button onClick={() => setSeccionActiva('soportes')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'soportes' ? 'bg-emerald-700 text-white' : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <span className="flex items-center gap-3"><Wrench className="w-4 h-4" /> Reportes Soportes</span>
              <span className="bg-emerald-950/80 text-[10px] px-2 py-0.5 rounded-full text-emerald-300 border border-emerald-700/60 font-bold">Campo</span>
            </button>
            <button onClick={() => setSeccionActiva('pagos')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'pagos' ? 'bg-amber-600 text-white' : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <span className="flex items-center gap-3"><DollarSign className="w-4 h-4" /> Pagos y Reembolsos</span>
              <span className="bg-amber-950/80 text-[10px] px-2 py-0.5 rounded-full text-amber-300 border border-amber-700/60 font-bold">Junior</span>
            </button>
            <button onClick={() => setSeccionActiva('supervisores')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'supervisores' ? estilosTema.accentPrimary : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <UserCheck className="w-4 h-4" /> Supervisores 👥
            </button>
            <button onClick={() => setSeccionActiva('odpes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'odpes' ? estilosTema.accentPrimary : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <Globe className="w-4 h-4" /> Directorio ODPEs ({listaPadron.length})
            </button>
            <button onClick={() => setSeccionActiva('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'reportes' ? estilosTema.accentPrimary : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <BarChart3 className="w-4 h-4" /> Exportar Excel
            </button>
            <button onClick={() => setSeccionActiva('historial')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs ${seccionActiva === 'historial' ? estilosTema.accentPrimary : 'opacity-70 hover:opacity-100 hover:bg-stone-800/40'}`}>
              <History className="w-4 h-4" /> Historial
            </button>
          </nav>
        </div>

        {/* SELECTOR DE TEMAS EN EL SIDEBAR */}
        <div className="space-y-3 border-t border-stone-700/50 pt-4 text-xs">
          <div className="px-2 space-y-1.5">
            <span className="text-[11px] font-bold uppercase opacity-70 flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> Paleta de Color
            </span>
            <div className="grid grid-cols-3 gap-1 bg-stone-900/50 p-1.5 rounded-xl border border-stone-800">
              <button onClick={() => cambiarTema('calido-claro')} title="Cálido Claro" className={`p-2 rounded-lg flex justify-center ${tema === 'calido-claro' ? 'bg-amber-700 text-white' : 'opacity-60'}`}>
                <Sun className="w-4 h-4" />
              </button>
              <button onClick={() => cambiarTema('calido-oscuro')} title="Cálido Café Oscuro" className={`p-2 rounded-lg flex justify-center ${tema === 'calido-oscuro' ? 'bg-amber-600 text-white' : 'opacity-60'}`}>
                <Coffee className="w-4 h-4" />
              </button>
              <button onClick={() => cambiarTema('corporativo-limpio')} title="Corporativo Limpio" className={`p-2 rounded-lg flex justify-center ${tema === 'corporativo-limpio' ? 'bg-blue-600 text-white' : 'opacity-60'}`}>
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-2 pt-2">
            <p className="font-bold text-xs truncate">{perfil?.nombre}</p>
            <p className="text-[11px] opacity-70 truncate">{perfil?.correo}</p>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/40 text-amber-300 border border-amber-700/50">ROL: {perfil?.rol}</span>
          </div>
          <button onClick={handleLogout} className="w-full bg-red-900/20 hover:bg-red-800/30 text-red-400 font-bold py-2.5 rounded-xl border border-red-800/30 flex items-center justify-center gap-2 transition-all text-xs">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        <header className={`flex justify-between items-center ${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm`}>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2.5">
            {seccionActiva === 'soportes' ? <Wrench className="w-6 h-6 text-emerald-600" /> : seccionActiva === 'pagos' ? <DollarSign className="w-6 h-6 text-amber-600" /> : seccionActiva === 'supervisores' ? <UserCheck className="w-6 h-6 text-amber-700" /> : <FileText className="w-6 h-6 text-amber-700" />}
            {seccionActiva === 'soportes' ? 'Solicitudes Enviadas por Soportes de Campo' : seccionActiva === 'pagos' ? 'Gestión de Pagos y Reembolsos a Técnicos' : seccionActiva === 'supervisores' ? 'Gestión y Asignación de Supervisores' : seccionActiva}
          </h1>
          <p className={`text-xs mt-1 ${estilosTema.subtext}`}>Monitoreo y auditoría técnica para {listaPadron.length || 126} sedes regionales</p>
        </div>

        {seccionActiva !== 'pagos' && (
          <button onClick={() => setVistaPapelera(!vistaPapelera)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${vistaPapelera ? 'bg-amber-200/80 text-amber-900 border-amber-400' : `${estilosTema.bgCard} border-stone-300`}`}>
            <Archive className="w-4 h-4" /> {vistaPapelera ? 'Ver Activos' : 'Papelera'}
          </button>
        )}
      </header>

        {seccionActiva === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
              <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm text-center`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${estilosTema.subtext}`}>Total Sedes</span>
                <p className="text-3xl font-black">{listaPadron.length}</p>
              </div>
              <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm text-center`}>
                <span className={`text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1`}>Reportados</span>
                <p className="text-3xl font-black text-red-600">{totalReportados}</p>
              </div>
              <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm text-center`}>
                <span className={`text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1`}>En Proceso</span>
                <p className="text-3xl font-black text-amber-600">{totalEnProceso}</p>
              </div>
              <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm text-center`}>
                <span className={`text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1`}>En Almacén</span>
                <p className="text-3xl font-black text-purple-600">{totalAlmacen}</p>
              </div>
              <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm text-center`}>
                <span className={`text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1`}>Resueltos</span>
                <p className="text-3xl font-black text-emerald-600">{totalResueltos}</p>
              </div>
            </div>

            <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm`}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-700" /> Últimas Incidencias Registradas
              </h3>
              <div className="space-y-2.5">
                {incidencias.slice(0, 5).map(i => (
                  <div key={i.id} className={`flex justify-between items-center p-4 rounded-xl text-xs border ${estilosTema.bgCard}`}>
                    <div>
                      <span className="font-mono text-amber-700 font-bold text-sm">#{i.id} - {i.odpe_nombre}</span>
                      <p className="font-semibold mt-0.5">{i.equipo_afectado} ({i.marca || 'S/M'}) {i.supervisor_asignado ? `| Delegado a: ${i.supervisor_asignado}` : ''}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase border bg-stone-200/50 border-stone-300">{i.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COMPONENTE MODULARIZADO DE PAGOS */}
        {seccionActiva === 'pagos' && (
          <SeccionPagos estilosTema={estilosTema} perfil={perfil} />
        )}

        {/* PESTAÑA SUPERVISORES */}
        {seccionActiva === 'supervisores' && (
          <div className="space-y-6">
            {!supervisorDetalleSeleccionado ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800">Seleccione un Supervisor para ver su carga asignada:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {listaSupervisores.map((sup, idx) => {
                    const asignadas = incidencias.filter(i => !i.en_papelera && i.supervisor_asignado === sup);
                    const pendientes = asignadas.filter(i => i.estado !== 'Resuelto').length;
                    const resueltas = asignadas.filter(i => i.estado === 'Resuelto').length;

                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSupervisorDetalleSeleccionado(sup)}
                        className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm cursor-pointer hover:border-amber-600 transition-all space-y-4`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-black text-sm text-amber-800">{sup}</h4>
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
                            {asignadas.length} Tareas
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-300/40 text-xs">
                          <p className="text-amber-700 font-bold">Pendientes: {pendientes}</p>
                          <p className="text-emerald-600 font-bold">Resueltas: {resueltas}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-4`}>
                <div className="flex justify-between items-center border-b border-stone-300/40 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-amber-800">Tareas asignadas a: {supervisorDetalleSeleccionado}</h3>
                    <p className={`text-xs mt-0.5 ${estilosTema.subtext}`}>Listado completo de incidencias bajo su responsabilidad</p>
                  </div>
                  <button 
                    onClick={() => setSupervisorDetalleSeleccionado(null)} 
                    className="bg-stone-300/60 hover:bg-stone-300 px-3.5 py-2 rounded-xl font-bold text-xs"
                  >
                    ← Volver a Supervisores
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`font-bold border-b uppercase ${estilosTema.subtext}`}>
                      <tr>
                        <th className="py-4 px-4">ID / ODPE</th>
                        <th className="py-4 px-4">Equipo</th>
                        <th className="py-4 px-4">Técnico Sede</th>
                        <th className="py-4 px-4">Estado</th>
                        <th className="py-4 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300/40">
                      {incidencias.filter(i => !i.en_papelera && i.supervisor_asignado === supervisorDetalleSeleccionado).map(item => (
                        <tr key={item.id} className="hover:bg-stone-500/10 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-mono text-amber-700 font-bold text-sm">#{item.id}</span>
                            <p className="font-bold mt-0.5">{item.odpe_nombre}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold">{item.equipo_afectado}</p>
                            <p className={`text-[11px] ${estilosTema.subtext}`}>Serie: {item.serie || 'S/S'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-semibold">{item.tecnico_nombre || 'S/N'}</p>
                            <p className={`text-[11px] ${estilosTema.subtext}`}>Cel: {item.tecnico_celular || 'S/N'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                              item.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                              item.estado === 'En Proceso' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              'bg-red-100 text-red-900 border border-red-300'
                            }`}>
                              {item.estado}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <button onClick={() => setModalVer(item)} className="bg-stone-300/60 hover:bg-stone-300 px-3 py-2 rounded-xl font-bold">🔍 Ver</button>
                            <button onClick={() => { setModalEditarSoporte(item); setNuevoEstadoSoporte(item.estado); setNuevoSupervisorAsignado(item.supervisor_asignado || ''); }} className={`px-3 py-2 rounded-xl font-bold ${estilosTema.accentPrimary}`}>✏️ Atender</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA REPORTES DE SOPORTES */}
        {seccionActiva === 'soportes' && (
          <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-5`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-stone-300/40 pb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 opacity-50" />
                <input 
                  type="text" 
                  placeholder="Buscar requerimiento..." 
                  value={inputBusqueda} 
                  onChange={(e) => {
                    setInputBusqueda(e.target.value);
                    setBusquedaActiva(e.target.value);
                    setPaginaActualSoportes(1);
                  }} 
                  className={`w-full rounded-xl p-3 pl-10 text-xs focus:outline-none ${estilosTema.bgInput}`} 
                />
              </div>
              <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActualSoportes(1); }} className={`w-full rounded-xl p-3 text-xs font-semibold ${estilosTema.bgInput}`}>
                <option value="Todos los Estados">Todos los Estados</option>
                {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
              </select>
              <select value={filtroEquipo} onChange={(e) => { setFiltroEquipo(e.target.value); setPaginaActualSoportes(1); }} className={`w-full rounded-xl p-3 text-xs font-semibold ${estilosTema.bgInput}`}>
                <option value="Todos los Equipos">Todos los Equipos</option>
                {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`font-bold border-b uppercase ${estilosTema.subtext}`}>
                  <tr>
                    <th className="py-4 px-4">ID / ODPE</th>
                    <th className="py-4 px-4">Equipo</th>
                    <th className="py-4 px-4">Técnico de Campo</th>
                    <th className="py-4 px-4">Delegado A</th>
                    <th className="py-4 px-4">Estado</th>
                    <th className="py-4 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300/40">
                  {incidenciasFiltradas.slice((paginaActualSoportes - 1) * elementosPorPagina, paginaActualSoportes * elementosPorPagina).map((item) => (
                    <tr key={item.id} className="hover:bg-stone-500/10 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono text-amber-700 font-bold text-sm">#{item.id}</span>
                        <p className="font-bold mt-0.5">{item.odpe_nombre}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold">{item.equipo_afectado}</p>
                        <p className={`text-[11px] ${estilosTema.subtext}`}>Serie: {item.serie || 'S/S'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold">{item.tecnico_nombre}</p>
                        <p className={`text-[11px] ${estilosTema.subtext}`}>Cel: {item.tecnico_celular || 'S/N'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-amber-700">{item.supervisor_asignado || 'Sin delegar'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          item.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          item.estado === 'En Proceso' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          item.estado === 'Almacén' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                          'bg-red-100 text-red-900 border border-red-300'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button onClick={() => setModalVer(item)} className="bg-stone-300/60 hover:bg-stone-300 px-3.5 py-2 rounded-xl font-bold transition-all" title="Ver Detalles">🔍 Ver</button>
                        <button onClick={() => { setModalEditarSoporte(item); setNuevoEstadoSoporte(item.estado); setNuevoSupervisorAsignado(item.supervisor_asignado || ''); }} className={`px-3.5 py-2 rounded-xl font-bold shadow-md transition-all ${estilosTema.accentPrimary}`} title="Atender">✏️ Atender</button>
                        <button onClick={() => moverAPapelera(item.id, true)} className="bg-amber-100 text-amber-900 px-3.5 py-2 rounded-xl border border-amber-300 font-bold transition-all" title="Papelera">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN - SOPORTES */}
            {Math.ceil(incidenciasFiltradas.length / elementosPorPagina) > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-stone-300/40 text-xs">
                <span className={estilosTema.subtext}>
                  Mostrando página {paginaActualSoportes} de {Math.ceil(incidenciasFiltradas.length / elementosPorPagina)} ({incidenciasFiltradas.length} registros en total)
                </span>
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={() => setPaginaActualSoportes(p => Math.max(p - 1, 1))}
                    disabled={paginaActualSoportes === 1}
                    className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>

                  <div className="flex gap-1 px-2">
                    {Array.from({ length: Math.ceil(incidenciasFiltradas.length / elementosPorPagina) }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => setPaginaActualSoportes(num)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs ${paginaActualSoportes === num ? estilosTema.accentPrimary : 'border border-stone-300 bg-stone-100'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPaginaActualSoportes(p => Math.min(p + 1, Math.ceil(incidenciasFiltradas.length / elementosPorPagina)))}
                    disabled={paginaActualSoportes === Math.ceil(incidenciasFiltradas.length / elementosPorPagina)}
                    className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA INCIDENTES GENERALES */}
        {seccionActiva === 'incidentes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-4`}>
              <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> {editandoId ? 'Editar Registro' : 'Nueva Incidencia'}
                </h2>
                {editandoId && <button onClick={limpiarFormulario} className="text-xs text-red-600 underline font-bold">Cancelar</button>}
              </div>

              {perfil?.rol === 'Visitante' ? (
                <div className={`p-4 rounded-xl text-xs ${estilosTema.bgInput}`}>🔒 Permisos de solo lectura.</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1.5">
                    <label className={`font-semibold ${estilosTema.subtext}`}>ODPE AFECTADA (Búsqueda Rápida)</label>
                    <input
                      type="text"
                      placeholder="Escribe para buscar ODPE..."
                      value={busquedaOdpeInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBusquedaOdpeInput(val);
                        const filtradas = listaPadron.filter(p => p.odpe_nombre.toLowerCase().includes(val.toLowerCase()));
                        if (filtradas.length > 0) {
                          handleCambioOdpe(filtradas[0].odpe_nombre);
                        }
                      }}
                      className={`w-full rounded-xl p-3 text-xs mb-1.5 ${estilosTema.bgInput}`}
                    />
                    <select
                      value={odpeSeleccionada}
                      onChange={(e) => handleCambioOdpe(e.target.value)}
                      className={`w-full rounded-xl p-3 font-bold uppercase ${estilosTema.bgInput}`}
                    >
                      {odpesFiltradasPadron.map((p) => (
                        <option key={p.dni} value={p.odpe_nombre}>
                          {p.odpe_nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={`p-4 rounded-2xl border border-stone-300/50 space-y-3`}>
                    <div className="flex justify-between items-center">
                      <span className={`block font-bold text-[11px] uppercase ${estilosTema.subtext}`}>Responsables de Sede</span>
                      {datosTecnicoExiste && <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">✓ Auto-rellenado</span>}
                    </div>
                    
                    <input type="text" placeholder="Supervisor" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className={`w-full rounded-xl p-3 font-semibold ${estilosTema.bgInput}`} />
                    
                    <div>
                      <label className={`block font-[11px] uppercase font-bold mb-1 ${estilosTema.subtext}`}>Delegar a Supervisor:</label>
                      <select
                        value={supervisorAsignadoAdmin}
                        onChange={(e) => setSupervisorAsignadoAdmin(e.target.value)}
                        className={`w-full rounded-xl p-3 font-bold ${estilosTema.bgInput}`}
                      >
                        <option value="">-- Sin delegar --</option>
                        {listaSupervisores.map((sup, idx) => (
                          <option key={idx} value={sup}>{sup}</option>
                        ))}
                      </select>
                    </div>

                    <input type="text" placeholder="Nombre Técnico" value={tecnicoNombre} onChange={(e) => setTecnicoNombre(e.target.value)} className={`w-full rounded-xl p-3 font-semibold ${estilosTema.bgInput}`} />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input type="text" placeholder="DNI" maxLength={8} value={tecnicoDni} onChange={(e) => setTecnicoDni(e.target.value)} className={`rounded-xl p-3 font-mono ${estilosTema.bgInput}`} />
                      <input type="text" placeholder="Celular" maxLength={9} value={tecnicoCelular} onChange={(e) => setTecnicoCelular(e.target.value)} className={`rounded-xl p-3 font-mono ${estilosTema.bgInput}`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className={`font-semibold ${estilosTema.subtext}`}>EQUIPO AFECTADO</label>
                      <button type="button" onClick={() => setModalCatalogos('equipo')} className="text-[11px] text-amber-700 hover:underline font-bold">+ Agregar Tipo</button>
                    </div>
                    <select value={equipoSeleccionado} onChange={(e) => setEquipoSeleccionado(e.target.value)} className={`w-full rounded-xl p-3 ${estilosTema.bgInput}`}>
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
                        className="w-full rounded-xl p-3 border border-amber-500 bg-amber-50 text-amber-900 uppercase font-bold"
                      />
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className={`rounded-xl p-3 text-xs ${estilosTema.bgInput}`} />
                      <input type="text" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className={`rounded-xl p-3 text-xs ${estilosTema.bgInput}`} />
                      <input type="text" placeholder="N° Serie" value={serie} onChange={(e) => setSerie(e.target.value)} className={`rounded-xl p-3 text-xs ${estilosTema.bgInput}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <select value={tipoProblema} onChange={(e) => setTipoProblema(e.target.value)} className={`w-full rounded-xl p-3 ${estilosTema.bgInput}`}>
                      <option value="Hardware">Hardware</option>
                      <option value="Software">Software</option>
                      <option value="Red">Red</option>
                    </select>

                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`w-full rounded-xl p-3 ${estilosTema.bgInput}`}>
                      {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                    </select>
                  </div>

                  <textarea rows={3} placeholder="Observaciones..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`w-full rounded-xl p-3 ${estilosTema.bgInput}`} />

                  <div className={`p-3.5 rounded-2xl border border-stone-300/40 space-y-2`}>
                    <label className={`block text-[11px] font-bold uppercase ${estilosTema.subtext}`}>📷 Adjuntar Fotos (Opcional - Máx 2)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="file" accept="image/*" onChange={(e) => setArchivoFoto1(e.target.files?.[0] || null)} className="text-[10px] w-full" />
                      <input type="file" accept="image/*" onChange={(e) => setArchivoFoto2(e.target.files?.[0] || null)} className="text-[10px] w-full" />
                    </div>
                  </div>

                  <button type="submit" disabled={enviandoAdmin} className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all text-xs ${estilosTema.accentPrimary}`}>
                    {enviandoAdmin ? 'Guardando...' : editandoId ? 'Actualizar Registro' : 'Guardar Incidencia'}
                  </button>
                </form>
              )}
            </div>

            <div className={`lg:col-span-2 ${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-5 flex flex-col justify-between`}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-stone-300/40 pb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 opacity-50" />
                    <input 
                      type="text" 
                      placeholder="Buscar en vivo..." 
                      value={inputBusqueda} 
                      onChange={(e) => {
                        setInputBusqueda(e.target.value);
                        setBusquedaActiva(e.target.value);
                        setPaginaActualIncidentes(1);
                      }} 
                      className={`w-full rounded-xl p-3 pl-10 text-xs ${estilosTema.bgInput}`} 
                    />
                  </div>
                  <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActualIncidentes(1); }} className={`w-full rounded-xl p-3 text-xs font-semibold ${estilosTema.bgInput}`}>
                    <option value="Todos los Estados">Todos los Estados</option>
                    {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                  </select>
                  <select value={filtroEquipo} onChange={(e) => { setFiltroEquipo(e.target.value); setPaginaActualIncidentes(1); }} className={`w-full rounded-xl p-3 text-xs font-semibold ${estilosTema.bgInput}`}>
                    <option value="Todos los Equipos">Todos los Equipos</option>
                    {listaEquipos.map((eq, idx) => <option key={idx} value={eq}>{eq}</option>)}
                  </select>
                </div>

                {loading ? (
                  <p className={`text-xs py-12 text-center ${estilosTema.subtext}`}>Cargando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`font-bold border-b uppercase ${estilosTema.subtext}`}>
                        <tr>
                          <th className="py-4 px-4">ID / ODPE</th>
                          <th className="py-4 px-4">Equipo</th>
                          <th className="py-4 px-4">Delegado A</th>
                          <th className="py-4 px-4">Estado</th>
                          <th className="py-4 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-300/40">
                        {incidenciasPaginadas.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-500/10 transition-colors">
                            <td className="py-4 px-4">
                              <span className="font-mono text-amber-700 font-bold text-sm">#{item.id}</span>
                              <p className="font-bold mt-0.5">{item.odpe_nombre}</p>
                              <p className={`text-[11px] ${estilosTema.subtext}`}>Por: {item.creado_por || 'Sistema'}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-semibold">{item.equipo_afectado}</p>
                              <p className={`text-[11px] ${estilosTema.subtext}`}>Serie: {item.serie || 'S/S'}</p>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-bold text-amber-700">{item.supervisor_asignado || 'Sin delegar'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                item.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                item.estado === 'En Proceso' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                item.estado === 'Almacén' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                                'bg-red-100 text-red-900 border border-red-300'
                              }`}>
                                {item.estado}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right space-x-2">
                              <button onClick={() => setModalVer(item)} className="bg-stone-300/60 hover:bg-stone-300 px-3 py-2 rounded-xl font-bold">🔍</button>

                              {perfil?.rol !== 'Visitante' && !vistaPapelera && (
                                <>
                                  <button onClick={() => cargarParaEditar(item)} className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl font-bold">✏️</button>
                                  <button onClick={() => moverAPapelera(item.id, true)} className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl font-bold">🗑️</button>
                                </>
                              )}

                              {perfil?.rol === 'Admin' && vistaPapelera && (
                                <button onClick={() => eliminarDefinitivo(item.id)} className="bg-red-600 text-white px-3 py-2 rounded-xl font-bold">❌</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* CONTROLES DE PAGINACIÓN - INCIDENTES GENERALES */}
              {totalPaginasIncidentes > 1 && (
                <div className="flex justify-between items-center pt-4 border-t border-stone-300/40 text-xs">
                  <span className={estilosTema.subtext}>
                    Mostrando página {paginaActualIncidentes} de {totalPaginasIncidentes} ({incidenciasFiltradas.length} registros)
                  </span>
                  <div className="flex gap-1.5 items-center">
                    <button
                      onClick={() => setPaginaActualIncidentes(p => Math.max(p - 1, 1))}
                      disabled={paginaActualIncidentes === 1}
                      className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>

                    <div className="flex gap-1 px-2">
                      {Array.from({ length: totalPaginasIncidentes }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setPaginaActualIncidentes(num)}
                          className={`w-8 h-8 rounded-xl font-bold text-xs ${paginaActualIncidentes === num ? estilosTema.accentPrimary : 'border border-stone-300 bg-stone-100'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setPaginaActualIncidentes(p => Math.min(p + 1, totalPaginasIncidentes))}
                      disabled={paginaActualIncidentes === totalPaginasIncidentes}
                      className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1"
                    >
                      Siguiente <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA DIRECTORIO ODPES */}
        {seccionActiva === 'odpes' && (
          <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-5 flex flex-col justify-between`}>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-stone-300/40 pb-4">
                <h2 className="font-bold text-sm uppercase flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-700" /> Directorio Oficial ({directorioOdpesFiltrado.length} de {listaPadron.length} Sedes)
                </h2>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 opacity-50" />
                  <input
                    type="text"
                    placeholder="Buscar ODPE, Técnico, DNI..."
                    value={busquedaDirectorioInput}
                    onChange={(e) => {
                      setBusquedaDirectorioInput(e.target.value);
                      setPaginaActualOdpes(1);
                    }}
                    className={`w-full rounded-xl p-3 pl-10 text-xs font-semibold ${estilosTema.bgInput}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {odpesPaginadas.map((p) => (
                  <div key={p.dni} className={`p-5 rounded-2xl space-y-2 text-xs border transition-all ${estilosTema.bgCard}`}>
                    <span className="font-black text-amber-800 block text-sm tracking-wide">{p.odpe_nombre}</span>
                    <p><strong>Técnico:</strong> {p.tecnico_nombre || 'Sin asignar'}</p>
                    <p className="font-mono"><strong>DNI:</strong> {p.dni} | <strong>Celular:</strong> {p.tecnico_celular || 'S/N'}</p>
                    <p><strong>Supervisor:</strong> {p.supervisor_nombre || 'S/N'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTROLES DE PAGINACIÓN - DIRECTORIO ODPES */}
            {totalPaginasOdpes > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-stone-300/40 text-xs">
                <span className={estilosTema.subtext}>
                  Mostrando página {paginaActualOdpes} de {totalPaginasOdpes} ({directorioOdpesFiltrado.length} sedes)
                </span>
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={() => setPaginaActualOdpes(p => Math.max(p - 1, 1))}
                    disabled={paginaActualOdpes === 1}
                    className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>

                  <div className="flex gap-1 px-2">
                    {Array.from({ length: totalPaginasOdpes }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => setPaginaActualOdpes(num)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs ${paginaActualOdpes === num ? estilosTema.accentPrimary : 'border border-stone-300 bg-stone-100'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPaginaActualOdpes(p => Math.min(p + 1, totalPaginasOdpes))}
                    disabled={paginaActualOdpes === totalPaginasOdpes}
                    className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA EXPORTAR EXCEL */}
        {seccionActiva === 'reportes' && (
          <div className={`${estilosTema.bgCard} p-10 rounded-2xl border shadow-sm space-y-5 text-center py-20 max-w-xl mx-auto`}>
            <BarChart3 className="w-14 h-14 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-xl">Consolidado Oficial de Incidentes</h3>
            <p className={`text-xs ${estilosTema.subtext} max-w-md mx-auto`}>Descarga un reporte profesional en formato Excel (`.xlsx`) con cabeceras estilizadas, anchos adaptados y bordes limpios.</p>
            <button onClick={exportarExcelProfesional} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all text-xs">📊 Descargar Excel Profesional</button>
          </div>
        )}

        {seccionActiva === 'historial' && (
          <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-4`}>
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-amber-700" /> Historial de Actividad
            </h3>
            <div className="space-y-3 text-xs">
              {incidencias.map(i => (
                <div key={i.id} className={`p-4 rounded-xl flex justify-between items-center border ${estilosTema.bgCard}`}>
                  <div>
                    <p className="font-bold">Incidencia #{i.id} creada por {i.creado_por || 'Sistema'}</p>
                    <p className={estilosTema.subtext}>{i.odpe_nombre} - {i.equipo_afectado}</p>
                  </div>
                  <span className="text-[11px] font-mono opacity-70">{new Date(i.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDITAR SOPORTE Y DELEGACIÓN */}
      {modalEditarSoporte && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${estilosTema.bgCard} rounded-3xl max-w-lg w-full p-8 space-y-5 text-xs border shadow-2xl`}>
            <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide">Atender / Delegar Solicitud #{modalEditarSoporte.id}</h3>
              <button onClick={() => setModalEditarSoporte(null)} className="font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-bold mb-1.5 uppercase text-[11px]">Cambiar Estado:</label>
                <select
                  value={nuevoEstadoSoporte}
                  onChange={(e) => setNuevoEstadoSoporte(e.target.value)}
                  className={`w-full rounded-xl p-3 font-bold text-xs ${estilosTema.bgInput}`}
                >
                  {listaEstados.map((es, idx) => <option key={idx} value={es}>{es}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5 uppercase text-[11px]">Delegar a Supervisor:</label>
                <select
                  value={nuevoSupervisorAsignado}
                  onChange={(e) => setNuevoSupervisorAsignado(e.target.value)}
                  className={`w-full rounded-xl p-3 font-bold text-xs ${estilosTema.bgInput}`}
                >
                  <option value="">-- Sin delegar --</option>
                  {listaSupervisores.map((sup, idx) => (
                    <option key={idx} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5 uppercase text-[11px]">Observaciones de la Solución:</label>
                <textarea
                  rows={4}
                  placeholder="Detalla cómo se resolvió..."
                  value={nuevasObsSoporte}
                  onChange={(e) => setNuevasObsSoporte(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs ${estilosTema.bgInput}`}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleActualizarEstadoSoporte}
                  disabled={guardandoSoporte}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg text-xs"
                >
                  {guardandoSoporte ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button onClick={() => setModalEditarSoporte(null)} className="w-full bg-stone-300/50 hover:bg-stone-300 text-stone-900 font-bold py-3.5 rounded-xl text-xs">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES FICHA */}
      {modalVer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${estilosTema.bgCard} rounded-3xl max-w-2xl w-full p-8 space-y-5 text-xs border shadow-2xl`}>
            <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wide">DETALLE TÉCNICO COMPLETO #{modalVer.id}</h3>
              <button onClick={() => setModalVer(null)} className="font-bold text-sm">✕</button>
            </div>
            
            <div className={`p-5 rounded-2xl border border-stone-300/40 space-y-4 ${estilosTema.bgInput}`}>
              <div className="grid grid-cols-2 gap-3 border-b border-stone-300/40 pb-3 text-xs">
                <p><strong>ODPE:</strong> <span className="text-amber-700 font-bold text-sm">{modalVer.odpe_nombre}</span></p>
                <p><strong>Estado:</strong> <span className="font-bold text-emerald-600 uppercase">{modalVer.estado}</span></p>
                <p><strong>Creado por:</strong> <span className="font-semibold text-purple-700">{modalVer.creado_por || 'Sistema'}</span></p>
                <p><strong>Fecha:</strong> {new Date(modalVer.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' })}</p>
              </div>

              <div className="space-y-2 text-xs">
                <p><strong>Equipo Afectado:</strong> <span className="font-semibold">{modalVer.equipo_afectado}</span> ({modalVer.marca || 'S/M'} - {modalVer.modelo || 'S/M'})</p>
                <p><strong>N° Serie:</strong> <span className="font-mono">{modalVer.serie || 'N/A'}</span></p>
                <p><strong>Supervisor de Sede:</strong> {modalVer.supervisor || 'N/A'}</p>
                <p><strong>Delegado a:</strong> <span className="font-bold text-amber-700">{modalVer.supervisor_asignado || 'Sin delegar'}</span></p>
                <p><strong>Técnico Responsable:</strong> {modalVer.tecnico_nombre || 'N/A'}</p>
                <p><strong>DNI / Celular Técnico:</strong> <span className="font-mono">{modalVer.tecnico_dni || 'S/N'} / {modalVer.tecnico_celular || 'S/N'}</span></p>
                <p><strong>Observaciones / Historial:</strong></p>
                <div className="p-3 rounded-xl bg-stone-500/10 whitespace-pre-wrap leading-relaxed">
                  {modalVer.descripcion || 'Sin observaciones'}
                </div>
              </div>

              {(modalVer.foto_1 || modalVer.foto_2) && (
                <div className="pt-3 border-t border-stone-300/40 space-y-2">
                  <span className="font-bold opacity-80 block text-xs uppercase">📷 Evidencia Fotográfica:</span>
                  <div className="grid grid-cols-2 gap-3">
                    {modalVer.foto_1 && (
                      <a href={modalVer.foto_1} target="_blank" rel="noopener noreferrer" className="block border rounded-2xl overflow-hidden hover:opacity-95 shadow-md">
                        <img src={modalVer.foto_1} alt="Evidencia 1" className="w-full h-40 object-cover" />
                      </a>
                    )}
                    {modalVer.foto_2 && (
                      <a href={modalVer.foto_2} target="_blank" rel="noopener noreferrer" className="block border rounded-2xl overflow-hidden hover:opacity-95 shadow-md">
                        <img src={modalVer.foto_2} alt="Evidencia 2" className="w-full h-40 object-cover" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex">
              <button onClick={() => setModalVer(null)} className={`w-full font-bold py-3.5 rounded-xl shadow-lg text-xs ${estilosTema.accentPrimary}`}>Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
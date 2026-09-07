'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import { UserCheck, Clock, FileSpreadsheet, Search, Trash2, Eye, Image as ImageIcon, Archive } from 'lucide-react';

interface AsistenciaRegistro {
  id: number;
  soporte_correo: string;
  soporte_nombre: string;
  odpe_nombre: string;
  fecha_hora: string;
  foto_1: string;
  foto_2?: string;
  observacion?: string;
  en_papelera: boolean;
}

interface SeccionAsistenciaProps {
  estilosTema: any;
  perfil: any;
}

export default function SeccionAsistencia({ estilosTema, perfil }: SeccionAsistenciaProps) {
  const [asistencias, setAsistencias] = useState<AsistenciaRegistro[]>([]);
  const [listaPadron, setListaPadron] = useState<any[]>([]);
  const [odpeSeleccionada, setOdpeSeleccionada] = useState('');
  const [observacion, setObservacion] = useState('');
  const [foto1File, setFoto1File] = useState<File | null>(null);
  const [foto2File, setFoto2File] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estados de Búsqueda y Modales
  const [busqueda, setBusqueda] = useState('');
  const [asistenciaSeleccionada, setAsistenciaSeleccionada] = useState<AsistenciaRegistro | null>(null);

  const fetchAsistenciasYPadron = async () => {
    const { data: resAsist } = await supabase
      .from('asistencias_soportes')
      .select('*')
      .eq('en_papelera', false)
      .order('fecha_hora', { ascending: false });
    if (resAsist) setAsistencias(resAsist);

    const { data: resPadron } = await supabase.from('padron_odpes').select('*').order('odpe_nombre', { ascending: true });
    if (resPadron && resPadron.length > 0) {
      setListaPadron(resPadron);
      if (!odpeSeleccionada) setOdpeSeleccionada(resPadron[0].odpe_nombre);
    }
  };

  useEffect(() => {
    fetchAsistenciasYPadron();

    const canalAsist = supabase.channel('realtime-asistencias-soportes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias_soportes' }, () => fetchAsistenciasYPadron())
      .subscribe();

    return () => {
      supabase.removeChannel(canalAsist);
    };
  }, []);

  const subirFotoAsistencia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `asistencia_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `asistencias/${fileName}`;

    const { error } = await supabase.storage.from('incidencias-fotos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('incidencias-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleMarcarAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foto1File) {
      return toast.error('Debes adjuntar al menos 1 foto como prueba de asistencia.');
    }

    setEnviando(true);
    try {
      let url1 = await subirFotoAsistencia(foto1File);
      let url2 = '';
      if (foto2File) {
        url2 = await subirFotoAsistencia(foto2File);
      }

      const payload = {
        soporte_correo: perfil?.correo || 'soporte@campo.local',
        soporte_nombre: perfil?.nombre || 'Soporte Técnico',
        odpe_nombre: odpeSeleccionada,
        fecha_hora: new Date().toISOString(),
        foto_1: url1,
        foto_2: url2 || null,
        observacion: observacion.trim() || null,
        en_papelera: false
      };

      const { error } = await supabase.from('asistencias_soportes').insert([payload]);
      if (error) throw error;

      toast.success('¡Asistencia marcada correctamente con hora y evidencia!');
      setObservacion('');
      setFoto1File(null);
      setFoto2File(null);
      fetchAsistenciasYPadron();
    } catch (err: any) {
      toast.error('Error al registrar asistencia: ' + err.message);
    }
    setEnviando(false);
  };

  const enviarAPapelera = async (id: number) => {
    if (!confirm('¿Estás seguro de enviar este registro de asistencia a la papelera?')) return;

    const { error } = await supabase
      .from('asistencias_soportes')
      .update({ en_papelera: true })
      .eq('id', id);

    if (error) {
      toast.error('Error al enviar a papelera: ' + error.message);
    } else {
      toast.success('Asistencia enviada a la papelera.');
      fetchAsistenciasYPadron();
    }
  };

  const exportarReporteAsistencias = () => {
    if (asistencias.length === 0) return toast.error('No hay registros de asistencia para exportar');

    const datosFormateados = asistencias.map(a => ({
      ID: a.id,
      Fecha: new Date(a.fecha_hora).toLocaleDateString('es-PE'),
      Hora: new Date(a.fecha_hora).toLocaleTimeString('es-PE'),
      ODPE: a.odpe_nombre,
      'Soporte Nombre': a.soporte_nombre,
      'Correo Electrónico': a.soporte_correo,
      Observaciones: a.observacion || 'Ninguna'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Asistencias');

    XLSX.writeFile(workbook, `Reporte_Asistencias_Soportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('¡Reporte de asistencias exportado a Excel con éxito!');
  };

  // Filtrado por buscador
  const asistenciasFiltradas = asistencias.filter(a => 
    a.soporte_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.odpe_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.soporte_correo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" richColors />
      
      {/* TARJETA DE REGISTRO */}
      <div className={`${estilosTema.bgCard} p-6 rounded-3xl border shadow-sm space-y-4`}>
        <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-amber-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-700" /> Registro Diario de Asistencia
            </h3>
            <p className={`text-[11px] mt-0.5 ${estilosTema.subtext}`}>Marca tu ingreso adjuntando evidencia fotográfica y tu sede ODPE</p>
          </div>
          <button 
            onClick={exportarReporteAsistencias} 
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
        </div>

        <form onSubmit={handleMarcarAsistencia} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1.5 uppercase text-[11px]">ODPE Asignada:</label>
              <select 
                value={odpeSeleccionada} 
                onChange={(e) => setOdpeSeleccionada(e.target.value)} 
                className={`w-full rounded-xl p-3 font-bold ${estilosTema.bgInput}`}
              >
                {listaPadron.map(p => <option key={p.dni} value={p.odpe_nombre}>{p.odpe_nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1.5 uppercase text-[11px]">Hora Actual de Registro:</label>
              <div className={`w-full rounded-xl p-3 font-mono font-bold flex items-center gap-2 ${estilosTema.bgInput}`}>
                <Clock className="w-4 h-4 text-amber-700" />
                {new Date().toLocaleString('es-PE')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1.5 uppercase text-[11px]">📸 Foto de Prueba 1 (Obligatoria):</label>
              <input 
                type="file" 
                accept="image/*" 
                required 
                onChange={(e) => setFoto1File(e.target.files?.[0] || null)} 
                className="w-full text-xs" 
              />
            </div>
            <div>
              <label className="block font-bold mb-1.5 uppercase text-[11px]">📸 Foto de Prueba 2 (Opcional):</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setFoto2File(e.target.files?.[0] || null)} 
                className="w-full text-xs" 
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1.5 uppercase text-[11px]">Observaciones / Comentarios:</label>
            <textarea 
              rows={2} 
              placeholder="Ej. Ingreso puntual a sede, equipo operativo..." 
              value={observacion} 
              onChange={(e) => setObservacion(e.target.value)} 
              className={`w-full rounded-xl p-3 resize-none ${estilosTema.bgInput}`} 
            />
          </div>

          <button 
            type="submit" 
            disabled={enviando} 
            className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all text-xs ${estilosTema.accentPrimary}`}
          >
            {enviando ? 'Registrando Asistencia...' : 'Marcar Mi Asistencia Ahora'}
          </button>
        </form>
      </div>

      {/* HISTORIAL / TABLA MEJORADA CON BUSCADOR */}
      <div className={`${estilosTema.bgCard} p-6 rounded-3xl border shadow-sm space-y-4`}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-stone-300/40 pb-4">
          <h4 className="font-bold text-xs uppercase tracking-wide text-amber-800">
            Historial de Asistencias Registradas ({asistenciasFiltradas.length})
          </h4>
          
          {/* BUSCADOR (LUPITA) */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-stone-500" />
            <input
              type="text"
              placeholder="Buscar por técnico u ODPE..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium ${estilosTema.bgInput} border border-stone-300 focus:outline-none`}
            />
          </div>
        </div>

        {asistenciasFiltradas.length === 0 ? (
          <p className="text-center text-xs text-stone-500 py-8">No se encontraron registros de asistencia.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b border-stone-300/60 uppercase text-[10px] tracking-wider ${estilosTema.subtext}`}>
                  <th className="py-3 px-3">Fecha y Hora</th>
                  <th className="py-3 px-3">Soporte / Técnico</th>
                  <th className="py-3 px-3">ODPE Sede</th>
                  <th className="py-3 px-3">Observación</th>
                  <th className="py-3 px-3 text-center">Evidencias</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-300/30">
                {asistenciasFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-500/5 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-semibold text-stone-700 whitespace-nowrap">
                      {new Date(a.fecha_hora).toLocaleString('es-PE')}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-stone-900">{a.soporte_nombre}</p>
                      <p className="text-[10px] text-stone-500 font-mono">{a.soporte_correo}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                        {a.odpe_nombre}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-stone-600 max-w-xs truncate">
                      {a.observacion || 'Sin observaciones'}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap space-x-1">
                      {a.foto_1 && (
                        <a href={a.foto_1} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-stone-200 hover:bg-stone-300 text-stone-800 px-2 py-1 rounded-lg text-[10px] font-bold">
                          <ImageIcon className="w-3 h-3 text-amber-700" /> Foto 1
                        </a>
                      )}
                      {a.foto_2 && (
                        <a href={a.foto_2} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-stone-200 hover:bg-stone-300 text-stone-800 px-2 py-1 rounded-lg text-[10px] font-bold">
                          <ImageIcon className="w-3 h-3 text-amber-700" /> Foto 2
                        </a>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setAsistenciaSeleccionada(a)}
                          title="Ver detalle completo"
                          className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => enviarAPapelera(a.id)}
                          title="Enviar a papelera"
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE (LUPA) */}
      {asistenciaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${estilosTema.bgCard} max-w-md w-full p-6 rounded-3xl shadow-2xl border space-y-4 text-xs animate-in fade-in zoom-in duration-200`}>
            <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
              <h3 className="font-black text-sm uppercase text-amber-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700" /> Detalle de Asistencia #{asistenciaSeleccionada.id}
              </h3>
              <button 
                onClick={() => setAsistenciaSeleccionada(null)}
                className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-700 hover:bg-stone-300"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <p><strong>Fecha y Hora:</strong> <span className="font-mono">{new Date(asistenciaSeleccionada.fecha_hora).toLocaleString('es-PE')}</span></p>
              <p><strong>Soporte:</strong> {asistenciaSeleccionada.soporte_nombre} ({asistenciaSeleccionada.soporte_correo})</p>
              <p><strong>ODPE:</strong> {asistenciaSeleccionada.odpe_nombre}</p>
              <p><strong>Observaciones:</strong> {asistenciaSeleccionada.observacion || 'Ninguna'}</p>

              <div className="pt-2 border-t border-stone-300/40 space-y-2">
                <p className="font-bold uppercase text-[11px]">Evidencias Fotográficas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {asistenciaSeleccionada.foto_1 ? (
                    <a href={asistenciaSeleccionada.foto_1} target="_blank" rel="noopener noreferrer" className="block border rounded-xl overflow-hidden shadow-sm hover:opacity-90">
                      <img src={asistenciaSeleccionada.foto_1} alt="Evidencia 1" className="w-full h-28 object-cover" />
                      <span className="block text-center bg-stone-100 py-1 text-[10px] font-bold">Ver Foto 1 ↗</span>
                    </a>
                  ) : <p className="text-stone-400">Sin foto 1</p>}

                  {asistenciaSeleccionada.foto_2 ? (
                    <a href={asistenciaSeleccionada.foto_2} target="_blank" rel="noopener noreferrer" className="block border rounded-xl overflow-hidden shadow-sm hover:opacity-90">
                      <img src={asistenciaSeleccionada.foto_2} alt="Evidencia 2" className="w-full h-28 object-cover" />
                      <span className="block text-center bg-stone-100 py-1 text-[10px] font-bold">Ver Foto 2 ↗</span>
                    </a>
                  ) : <p className="text-stone-400 italic">Sin foto 2</p>}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAsistenciaSeleccionada(null)}
              className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl mt-4"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
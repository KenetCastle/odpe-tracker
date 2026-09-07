'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import { UserCheck, Camera, Clock, Calendar, CheckCircle2, Archive, FileSpreadsheet } from 'lucide-react';

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
  const [vistaPapelera, setVistaPapelera] = useState(false);

  // Lista de correos autorizados para los 12 soportes (puedes ajustar o ampliar aquí)
  const correoActual = (perfil?.correo || '').toLowerCase();
  
  // Puedes definir aquí la condición para tus 12 soportes (ej: si su correo incluye 'soporte' o está en un listado)
  // O si cualquier usuario autenticado de soporte puede marcar:
  const esSoporteAutorizado = true; // Ajusta esta regla si deseas restringirlo estrictamente a los 12 correos específicos.

  const fetchAsistenciasYPadron = async () => {
    const { data: resAsist } = await supabase
      .from('asistencias_soportes')
      .select('*')
      .order('created_at', { ascending: false });
    if (resAsist) setAsistencias(resAsist);

    const { data: resPadron } = await supabase.from('padron_odpes').select('*').order('odpe_nombre', { ascending: true });
    if (resPadron && resPadron.length > 0) {
      setListaPadron(resPadron);
      if (!odpeSeleccionada) setOdpeSeleccionada(resPadron[0].odpe_nombre);
    }
  };

  useEffect(() => {
    fetchAsistenciasYPadron();

    const canalAsist = supabase.channel('realtime-asistencias')
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
        soporte_correo: perfil?.correo || 'Desconocido',
        soporte_nombre: perfil?.nombre || 'Soporte',
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

  const exportarReporteAsistencias = () => {
    if (asistencias.length === 0) return toast.error('No hay registros de asistencia para exportar');

    const datosFormateados = asistencias.filter(a => !a.en_papelera).map(a => ({
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

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" richColors />
      
      {/* TARJETA DE REGISTRO PARA LOS SOPORTES */}
      <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-4`}>
        <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase text-amber-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-700" /> Registro Diario de Asistencia
            </h3>
            <p className={`text-xs mt-0.5 ${estilosTema.subtext}`}>Marca tu ingreso adjuntando evidencia fotográfica y tu ubicación/ODPE</p>
          </div>
          <button 
            onClick={exportarReporteAsistencias} 
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Asistencias Excel
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

      {/* HISTORIAL / LISTADO DE ASISTENCIAS REGISTRADAS */}
      <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-4`}>
        <h4 className="font-bold text-xs uppercase tracking-wide text-amber-800">Historial de Asistencias Registradas</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-bold border-b uppercase ${estilosTema.subtext}`}>
              <tr>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Soporte</th>
                <th className="py-3 px-3">ODPE</th>
                <th className="py-3 px-3">Observación</th>
                <th className="py-3 px-3 text-center">Fotos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-300/40">
              {asistencias.filter(a => !a.en_papelera).map((a) => (
                <tr key={a.id} className="hover:bg-stone-500/10 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold">
                    {new Date(a.fecha_hora).toLocaleString('es-PE')}
                  </td>
                  <td className="py-3 px-3 font-bold">{a.soporte_nombre}</td>
                  <td className="py-3 px-3">{a.odpe_nombre}</td>
                  <td className="py-3 px-3">{a.observacion || 'Sin observaciones'}</td>
                  <td className="py-3 px-3 text-center space-x-2">
                    {a.foto_1 && (
                      <a href={a.foto_1} target="_blank" rel="noopener noreferrer" className="text-amber-700 underline font-bold">
                        [Foto 1]
                      </a>
                    )}
                    {a.foto_2 && (
                      <a href={a.foto_2} target="_blank" rel="noopener noreferrer" className="text-amber-700 underline font-bold">
                        [Foto 2]
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DatosPadron {
  dni: string;
  odpe_nombre: string;
  tecnico_nombre: string;
  tecnico_celular: string;
  supervisor_nombre: string;
  jefe_odpe?: string;
  ecd?: string;
  acd?: string;
  direccion?: string;
}

interface PortalTecnicoProps {
  onVolver: () => void;
  onIncidenciaCreada: () => void;
}

export default function PortalTecnico({ onVolver, onIncidenciaCreada }: PortalTecnicoProps) {
  const [dniInput, setDniInput] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [tecnicoAutenticado, setTecnicoAutenticado] = useState<DatosPadron | null>(null);

  // Formulario de Equipo
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('CPU');
  const [otroEquipoInput, setOtroEquipoInput] = useState('');
  const [tipoProblema, setTipoProblema] = useState('Hardware');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  // Archivos de Imagen
  const [archivoFoto1, setArchivoFoto1] = useState<File | null>(null);
  const [archivoFoto2, setArchivoFoto2] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Historial personal
  const [miHistorial, setMiHistorial] = useState<any[]>([]);

  const handleValidarDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniInput.trim()) return;

    setBuscando(true);
    const { data, error } = await supabase
      .from('padron_odpes')
      .select('*')
      .eq('dni', dniInput.trim())
      .maybeSingle();

    if (error || !data) {
      alert('❌ DNI no registrado en el padrón electoral. Verifique el número o contacte al administrador.');
      setTecnicoAutenticado(null);
    } else {
      setTecnicoAutenticado(data);
      cargarMiHistorial(data.odpe_nombre, data.tecnico_nombre);
    }
    setBuscando(false);
  };

  const cargarMiHistorial = async (odpe: string, tecnico: string) => {
    const { data } = await supabase
      .from('incidencias')
      .select('*')
      .eq('odpe_nombre', odpe)
      .eq('tecnico_nombre', tecnico)
      .order('created_at', { ascending: false });

    if (data) setMiHistorial(data);
  };

  const subirImagen = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `campo/${fileName}`;

    const { error } = await supabase.storage.from('incidencias-fotos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('incidencias-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmitIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoAutenticado) return;

    setEnviando(true);
    try {
      let urlFoto1 = '';
      let urlFoto2 = '';

      if (archivoFoto1) urlFoto1 = await subirImagen(archivoFoto1);
      if (archivoFoto2) urlFoto2 = await subirImagen(archivoFoto2);

      const nombreEquipoFinal = equipoSeleccionado === 'OTRO' ? (otroEquipoInput.trim().toUpperCase() || 'OTRO EQUIPO') : equipoSeleccionado;

      const payload = {
        odpe_nombre: tecnicoAutenticado.odpe_nombre,
        supervisor: tecnicoAutenticado.supervisor_nombre,
        tecnico_nombre: tecnicoAutenticado.tecnico_nombre,
        tecnico_dni: tecnicoAutenticado.dni,
        tecnico_celular: tecnicoAutenticado.tecnico_celular,
        tipo_problema: tipoProblema,
        equipo_afectado: nombreEquipoFinal,
        marca,
        modelo,
        serie,
        estado: 'Reportado',
        descripcion,
        foto_1: urlFoto1,
        foto_2: urlFoto2,
        usuario_a_cargo: tecnicoAutenticado.tecnico_nombre,
        creado_por: `${tecnicoAutenticado.tecnico_nombre} (Técnico de Campo)`,
        en_papelera: false
      };

      const { error } = await supabase.from('incidencias').insert([payload]);

      if (error) {
        alert('Error al registrar incidencia: ' + error.message);
      } else {
        alert('✅ Incidencia registrada con imágenes enviadas con éxito.');
        setMarca('');
        setModelo('');
        setSerie('');
        setDescripcion('');
        setOtroEquipoInput('');
        setArchivoFoto1(null);
        setArchivoFoto2(null);
        setEquipoSeleccionado('CPU');
        cargarMiHistorial(tecnicoAutenticado.odpe_nombre, tecnicoAutenticado.tecnico_nombre);
        onIncidenciaCreada();
      }
    } catch (err: any) {
      alert('Error al subir archivos de imagen: ' + err.message);
    }
    setEnviando(false);
  };

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      {!tecnicoAutenticado ? (
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl space-y-6 text-slate-100">
          <div className="text-center space-y-2">
            <div className="inline-block bg-blue-600 text-white font-black text-2xl px-4 py-2 rounded-xl mb-2">ODPE</div>
            <h1 className="text-2xl font-bold tracking-wide">Acceso Técnicos de Campo</h1>
            <p className="text-xs text-slate-400">Ingresa tu DNI para acceder al formulario asignado a tu ODPE</p>
          </div>

          <form onSubmit={handleValidarDni} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase">Número de DNI</label>
              <input
                type="text"
                required
                maxLength={8}
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 40502834"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={buscando}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg"
            >
              {buscando ? 'Validando en Padrón...' : 'Ingresar'}
            </button>
          </form>

          <button onClick={onVolver} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all">
            ← Volver al Login de Administrador
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-xl text-slate-100 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] bg-blue-900/80 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-700 uppercase">
                  Sede Asignada
                </span>
                <h2 className="text-xl font-black text-white mt-1">{tecnicoAutenticado.odpe_nombre}</h2>
                <p className="text-xs text-slate-300 font-bold">Bienvenido, {tecnicoAutenticado.tecnico_nombre}</p>
              </div>
              <button onClick={() => setTecnicoAutenticado(null)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg">
                Cerrar Sesión
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/70 p-3 rounded-xl border border-slate-700 text-slate-300">
              <p><strong>DNI:</strong> {tecnicoAutenticado.dni}</p>
              <p><strong>Celular:</strong> {tecnicoAutenticado.tecnico_celular}</p>
              <p><strong>Supervisor:</strong> {tecnicoAutenticado.supervisor_nombre}</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl text-slate-100 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-700 pb-2">
              ➕ Registrar Nueva Falla de Equipo
            </h3>

            <form onSubmit={handleSubmitIncidencia} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Equipo Afectado</label>
                  <select
                    value={equipoSeleccionado}
                    onChange={(e) => setEquipoSeleccionado(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="CPU">CPU</option>
                    <option value="MONITOR">MONITOR</option>
                    <option value="IMPRESORA">IMPRESORA</option>
                    <option value="GRUPO ELECTROGENO">GRUPO ELECTRÓGENO</option>
                    <option value="AIRE ACONDICIONADO">AIRE ACONDICIONADO</option>
                    <option value="SWITCH/ROUTER">SWITCH / ROUTER</option>
                    <option value="OTRO">⚠️ OTRO EQUIPO...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tipo de Problema</label>
                  <select
                    value={tipoProblema}
                    onChange={(e) => setTipoProblema(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              </div>

              {equipoSeleccionado === 'OTRO' && (
                <div>
                  <label className="block text-amber-400 font-bold mb-1">Escribe el Nombre del Equipo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ESCÁNER / ESTABILIZADOR..."
                    value={otroEquipoInput}
                    onChange={(e) => setOtroEquipoInput(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500 rounded-lg p-2.5 text-white uppercase font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                <input type="text" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                <input type="text" placeholder="N° Serie" value={serie} onChange={(e) => setSerie(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Descripción Detallada</label>
                <textarea rows={3} required placeholder="Explica qué síntoma o falla presenta el equipo..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white" />
              </div>

              {/* CARGA DE FOTOS (MÁXIMO 2) */}
              <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl space-y-2">
                <label className="block text-blue-400 font-bold uppercase text-[10px]">📷 Adjuntar Fotos del Equipo (Máximo 2)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">Foto 1 (Falla / Serie):</span>
                    <input type="file" accept="image/*" onChange={(e) => setArchivoFoto1(e.target.files?.[0] || null)} className="text-[10px] text-slate-300 w-full bg-slate-800 p-1 rounded border border-slate-700" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">Foto 2 (Opcional):</span>
                    <input type="file" accept="image/*" onChange={(e) => setArchivoFoto2(e.target.files?.[0] || null)} className="text-[10px] text-slate-300 w-full bg-slate-800 p-1 rounded border border-slate-700" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={enviando} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                {enviando ? 'Subiendo imágenes y enviando...' : 'Enviar Reporte de Incidencia'}
              </button>
            </form>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl text-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">📋 Mis Reportes Enviados ({miHistorial.length})</h3>
            {miHistorial.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Aún no has registrado ninguna incidencia.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {miHistorial.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="font-mono text-blue-400 font-bold">#{item.id}</span> - <strong>{item.equipo_afectado}</strong>
                      <p className="text-[11px] text-slate-400">{item.descripcion}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.estado === 'Resuelto' ? 'bg-emerald-900/80 text-emerald-300' :
                      item.estado === 'En Proceso' ? 'bg-amber-900/80 text-amber-300' : 'bg-red-900/80 text-red-300'
                    }`}>
                      {item.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
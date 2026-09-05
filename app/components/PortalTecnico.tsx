'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, Send, ArrowLeft, CheckCircle2, ShieldCheck, LogOut, PlusCircle, History } from 'lucide-react';

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

  // Función para comprimir imágenes y ahorrar espacio
  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDim = 1200;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
      };
    });
  };

  const subirImagenComprimida = async (file: File) => {
    const fileComprimido = await comprimirImagen(file);
    const fileExt = 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `campo/${fileName}`;

    const { error } = await supabase.storage.from('incidencias-fotos').upload(filePath, fileComprimido);
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

      if (archivoFoto1) urlFoto1 = await subirImagenComprimida(archivoFoto1);
      if (archivoFoto2) urlFoto2 = await subirImagenComprimida(archivoFoto2);

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
        alert('✅ Incidencia registrada correctamente con fotos optimizadas.');
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
    <div className="max-w-xl w-full mx-auto space-y-6 font-sans text-stone-900">
      {!tecnicoAutenticado ? (
        <div className="bg-[#F3EFE0] border border-stone-300 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-600/20 text-amber-700 font-black text-lg px-4 py-2 rounded-2xl mb-2">
              <ShieldCheck className="w-6 h-6 text-amber-700" /> Portal de Campo
            </div>
            <h1 className="text-2xl font-black tracking-tight">Acceso Técnicos</h1>
            <p className="text-xs text-stone-600">Ingresa tu DNI para acceder al formulario asignado a tu ODPE</p>
          </div>

          <form onSubmit={handleValidarDni} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-600 font-bold mb-1.5 uppercase text-[11px]">Número de DNI</label>
              <input
                type="text"
                required
                maxLength={8}
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 40502834"
                className="w-full bg-[#FFFDF7] border border-stone-300 rounded-xl p-3.5 text-center text-lg font-mono tracking-widest text-stone-900 focus:outline-none focus:border-amber-700"
              />
            </div>

            <button
              type="submit"
              disabled={buscando}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg"
            >
              {buscando ? 'Validando en Padrón...' : 'Ingresar al Portal'}
            </button>
          </form>

          <button onClick={onVolver} className="w-full bg-stone-300/60 hover:bg-stone-300 text-stone-800 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al Login de Administrador
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TARJETA DE BIENVENIDA */}
          <div className="bg-[#F3EFE0] border border-stone-300 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b border-stone-300/50 pb-3">
              <div>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-300 uppercase">
                  Sede Asignada
                </span>
                <h2 className="text-lg font-black text-amber-900 mt-1.5">{tecnicoAutenticado.odpe_nombre}</h2>
                <p className="text-xs text-stone-700 font-bold">Bienvenido, {tecnicoAutenticado.tecnico_nombre}</p>
              </div>
              <button onClick={() => setTecnicoAutenticado(null)} className="bg-stone-300/70 hover:bg-stone-300 text-stone-800 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" /> Salir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#FFFDF7] p-3.5 rounded-2xl border border-stone-300 text-stone-700">
              <p><strong>DNI:</strong> <span className="font-mono">{tecnicoAutenticado.dni}</span></p>
              <p><strong>Celular:</strong> <span className="font-mono">{tecnicoAutenticado.tecnico_celular}</span></p>
              <p className="col-span-2"><strong>Supervisor:</strong> {tecnicoAutenticado.supervisor_nombre}</p>
            </div>
          </div>

          {/* FORMULARIO DE REGISTRO */}
          <div className="bg-[#F3EFE0] border border-stone-300 p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 border-b border-stone-300/50 pb-2.5 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-700" /> Registrar Nueva Falla de Equipo
            </h3>

            <form onSubmit={handleSubmitIncidencia} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Equipo Afectado</label>
                  <select
                    value={equipoSeleccionado}
                    onChange={(e) => setEquipoSeleccionado(e.target.value)}
                    className="w-full bg-[#FFFDF7] border border-stone-300 rounded-xl p-3 font-bold text-stone-900"
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
                  <label className="block text-stone-700 font-bold mb-1">Tipo de Problema</label>
                  <select
                    value={tipoProblema}
                    onChange={(e) => setTipoProblema(e.target.value)}
                    className="w-full bg-[#FFFDF7] border border-stone-300 rounded-xl p-3 font-semibold text-stone-900"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              </div>

              {equipoSeleccionado === 'OTRO' && (
                <div>
                  <label className="block text-amber-800 font-bold mb-1">Escribe el Nombre del Equipo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ESCÁNER / ESTABILIZADOR..."
                    value={otroEquipoInput}
                    onChange={(e) => setOtroEquipoInput(e.target.value)}
                    className="w-full bg-amber-50 border border-amber-500 rounded-xl p-3 text-amber-900 uppercase font-bold text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="bg-[#FFFDF7] border border-stone-300 rounded-xl p-3 text-xs" />
                <input type="text" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className="bg-[#FFFDF7] border border-stone-300 rounded-xl p-3 text-xs" />
                <input type="text" placeholder="N° Serie" value={serie} onChange={(e) => setSerie(e.target.value)} className="bg-[#FFFDF7] border border-stone-300 rounded-xl p-3 text-xs font-mono" />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Descripción Detallada</label>
                <textarea rows={3} required placeholder="Explica qué síntoma o falla presenta el equipo..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-[#FFFDF7] border border-stone-300 rounded-xl p-3 text-xs" />
              </div>

              {/* CARGA DE FOTOS CON COMPRESIÓN AUTOMÁTICA */}
              <div className="p-3.5 bg-[#FFFDF7] border border-stone-300 rounded-2xl space-y-2">
                <label className="block text-amber-800 font-bold uppercase text-[11px]">📷 Adjuntar Fotos (Optimización Automática)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-stone-600 mb-1">Foto 1 (Falla / Serie):</span>
                    <input type="file" accept="image/*" onChange={(e) => setArchivoFoto1(e.target.files?.[0] || null)} className="text-[10px] text-stone-700 w-full" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-stone-600 mb-1">Foto 2 (Opcional):</span>
                    <input type="file" accept="image/*" onChange={(e) => setArchivoFoto2(e.target.files?.[0] || null)} className="text-[10px] text-stone-700 w-full" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={enviando} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-xs flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {enviando ? 'Optimizando imágenes y enviando...' : 'Enviar Reporte de Incidencia'}
              </button>
            </form>
          </div>

          {/* HISTORIAL PERSONAL */}
          <div className="bg-[#F3EFE0] border border-stone-300 p-6 rounded-3xl shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-700" /> Mis Reportes Enviados ({miHistorial.length})
            </h3>
            {miHistorial.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">Aún no has registrado ninguna incidencia.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {miHistorial.map((item) => (
                  <div key={item.id} className="p-3.5 bg-[#FFFDF7] rounded-2xl border border-stone-300 flex justify-between items-center">
                    <div>
                      <span className="font-mono text-amber-800 font-bold text-sm">#{item.id}</span> - <strong className="text-stone-900">{item.equipo_afectado}</strong>
                      <p className="text-[11px] text-stone-600 mt-0.5">{item.descripcion}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.estado === 'Resuelto' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      item.estado === 'En Proceso' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-red-100 text-red-900 border border-red-300'
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
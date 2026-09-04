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
  const [tipoProblema, setTipoProblema] = useState('Hardware');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Historial personal del técnico
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

  const handleSubmitIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoAutenticado) return;

    setEnviando(true);
    const payload = {
      odpe_nombre: tecnicoAutenticado.odpe_nombre,
      supervisor: tecnicoAutenticado.supervisor_nombre,
      tecnico_nombre: tecnicoAutenticado.tecnico_nombre,
      tecnico_dni: tecnicoAutenticado.dni,
      tecnico_celular: tecnicoAutenticado.tecnico_celular,
      tipo_problema: tipoProblema,
      equipo_afectado: equipoSeleccionado,
      marca,
      modelo,
      serie,
      estado: 'Reportado',
      descripcion,
      usuario_a_cargo: tecnicoAutenticado.tecnico_nombre,
      creado_por: `${tecnicoAutenticado.tecnico_nombre} (Técnico de Campo)`,
      en_papelera: false
    };

    const { error } = await supabase.from('incidencias').insert([payload]);

    if (error) {
      alert('Error al registrar incidencia: ' + error.message);
    } else {
      alert('✅ Incidencia registrada con éxito.');
      setMarca('');
      setModelo('');
      setSerie('');
      setDescripcion('');
      cargarMiHistorial(tecnicoAutenticado.odpe_nombre, tecnicoAutenticado.tecnico_nombre);
      onIncidenciaCreada();
    }
    setEnviando(false);
  };

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      {!tecnicoAutenticado ? (
        /* VISTA LOGIN POR DNI */
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

          <button
            onClick={onVolver}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all"
          >
            ← Volver al Login de Administrador
          </button>
        </div>
      ) : (
        /* VISTA PANEL PRIVADO DEL TÉCNICO */
        <div className="space-y-6">
          {/* FICHA DE TÉCNICO */}
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-xl text-slate-100 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] bg-blue-900/80 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-700 uppercase">
                  Sede Asignada
                </span>
                <h2 className="text-xl font-black text-white mt-1">{tecnicoAutenticado.odpe_nombre}</h2>
                <p className="text-xs text-slate-300 font-bold">Bienvenido, {tecnicoAutenticado.tecnico_nombre}</p>
              </div>
              <button
                onClick={() => setTecnicoAutenticado(null)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg"
              >
                Cerrar Sesión
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/70 p-3 rounded-xl border border-slate-700 text-slate-300">
              <p><strong>DNI:</strong> {tecnicoAutenticado.dni}</p>
              <p><strong>Celular:</strong> {tecnicoAutenticado.tecnico_celular}</p>
              <p><strong>Supervisor:</strong> {tecnicoAutenticado.supervisor_nombre}</p>
              {tecnicoAutenticado.jefe_odpe && <p><strong>Jefe ODPE:</strong> {tecnicoAutenticado.jefe_odpe}</p>}
              {tecnicoAutenticado.direccion && <p className="col-span-2"><strong>Dirección:</strong> {tecnicoAutenticado.direccion}</p>}
            </div>
          </div>

          {/* FORMULARIO DE NUEVA INCIDENCIA */}
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

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Marca"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
                <input
                  type="text"
                  placeholder="N° Serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Descripción Detallada</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explica qué síntoma o falla presenta el equipo..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
              >
                {enviando ? 'Enviando...' : 'Enviar Reporte de Incidencia'}
              </button>
            </form>
          </div>

          {/* HISTORIAL PERSONAL DEL TÉCNICO */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl text-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              📋 Mis Reportes Enviados ({miHistorial.length})
            </h3>

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
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Incidencia {
  id: number;
  odpe_nombre: string;
  supervisor?: string;
  tecnico_nombre?: string;
  tecnico_dni?: string;
  tecnico_celular?: string;
  jefe_odpe?: string;
  ecd?: string;
  acd?: string;
  en_papelera: boolean;
}

export default function DirectorioOdpes({ 
  listaOdpes, 
  incidencias,
  onUpdate
}: { 
  listaOdpes: string[]; 
  incidencias: Incidencia[];
  onUpdate?: () => void;
}) {
  const [odpeDetalle, setOdpeDetalle] = useState<string | null>(null);
  const [editandoPlana, setEditandoPlana] = useState(false);

  // Formulario Plana Directiva
  const [jefeInput, setJefeInput] = useState('');
  const [ecdInput, setEcdInput] = useState('');
  const [acdInput, setAcdInput] = useState('');

  // Formulario Soporte Técnico (Por si no hay reportes creados)
  const [supervisorInput, setSupervisorInput] = useState('');
  const [tecnicoInput, setTecnicoInput] = useState('');
  const [dniInput, setDniInput] = useState('');
  const [celularInput, setCelularInput] = useState('');

  const [guardando, setGuardando] = useState(false);

  const abrirFicha = (odpe: string) => {
    setOdpeDetalle(odpe);
    setEditandoPlana(false);

    // Buscar la última incidencia de esta ODPE que contenga datos de personal
    const reg = incidencias.find(i => i.odpe_nombre === odpe && (i.tecnico_nombre || i.supervisor || i.jefe_odpe));

    setJefeInput(reg?.jefe_odpe || '');
    setEcdInput(reg?.ecd || '');
    setAcdInput(reg?.acd || '');
    
    setSupervisorInput(reg?.supervisor || '');
    setTecnicoInput(reg?.tecnico_nombre || '');
    setDniInput(reg?.tecnico_dni || '');
    setCelularInput(reg?.tecnico_celular || '');
  };

  const guardarFichaODPE = async () => {
    if (!odpeDetalle) return;
    setGuardando(true);

    // Actualizar todas las incidencias existentes de esa ODPE con la plana directiva y el soporte técnico asignado
    const { error } = await supabase
      .from('incidencias')
      .update({
        jefe_odpe: jefeInput,
        ecd: ecdInput,
        acd: acdInput,
        supervisor: supervisorInput,
        tecnico_nombre: tecnicoInput,
        tecnico_dni: dniInput,
        tecnico_celular: celularInput,
      })
      .eq('odpe_nombre', odpeDetalle);

    if (error) {
      alert('Error al guardar datos: ' + error.message);
    } else {
      alert('Ficha de la ODPE actualizada correctamente');
      setEditandoPlana(false);
      if (onUpdate) onUpdate();
    }
    setGuardando(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-800 uppercase">Directorio de Sedes ODPE</h3>
          <p className="text-xs text-slate-500">Los datos de Soporte Técnico se vinculan automáticamente desde los reportes registrados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {listaOdpes.map((o, idx) => {
          const incidenciasSede = incidencias.filter(i => i.odpe_nombre === o && !i.en_papelera);
          
          // Obtener el último técnico registrado para la tarjeta
          const regConTecnico = incidenciasSede.find(i => i.tecnico_nombre && i.tecnico_nombre.trim() !== '');

          return (
            <div 
              key={idx} 
              onClick={() => abrirFicha(o)}
              className="p-4 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl space-y-2 cursor-pointer transition-all shadow-sm"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-blue-600 text-sm">{o}</h4>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">Ver Ficha</span>
              </div>
              <p className="text-xs text-slate-500">Incidencias registradas: <strong className="text-slate-800">{incidenciasSede.length}</strong></p>
              <p className="text-[11px] text-slate-400 truncate">
                Técnico: <span className="text-slate-700 font-medium">{regConTecnico?.tecnico_nombre || 'Sin asignar'}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Modal Ficha Completa */}
      {odpeDetalle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-blue-600 uppercase">FICHA DE SEDE: {odpeDetalle}</h3>
              <button onClick={() => setOdpeDetalle(null)} className="font-bold text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {(() => {
              // Buscar el registro con información más completa de esta ODPE
              const reg = incidencias.find(i => i.odpe_nombre === odpeDetalle && (i.tecnico_nombre || i.supervisor || i.jefe_odpe)) 
                          || incidencias.find(i => i.odpe_nombre === odpeDetalle);

              return (
                <div className="space-y-4">
                  
                  {/* Contenedor Plana Directiva */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Plana Directiva</span>
                      {!editandoPlana ? (
                        <button 
                          onClick={() => setEditandoPlana(true)} 
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-2.5 py-1 rounded text-[10px]"
                        >
                          ✏️ Editar Ficha
                        </button>
                      ) : (
                        <button 
                          onClick={() => setEditandoPlana(false)} 
                          className="text-red-500 underline text-[10px]"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    {!editandoPlana ? (
                      <div className="space-y-1.5">
                        <p><strong>Jefe de ODPE:</strong> <span className="text-slate-800 font-medium">{reg?.jefe_odpe || 'No registrado'}</span></p>
                        <p><strong>ECD (Encargado Cómputo):</strong> <span className="text-slate-800 font-medium">{reg?.ecd || 'No registrado'}</span></p>
                        <p><strong>ACD (Asistente Cómputo):</strong> <span className="text-slate-800 font-medium">{reg?.acd || 'No registrado'}</span></p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">Jefe de ODPE</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del Jefe" 
                            value={jefeInput} 
                            onChange={(e) => setJefeInput(e.target.value)} 
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">ECD (Encargado Cómputo)</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del ECD" 
                            value={ecdInput} 
                            onChange={(e) => setEcdInput(e.target.value)} 
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase mb-0.5">ACD (Asistente Cómputo)</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del ACD" 
                            value={acdInput} 
                            onChange={(e) => setAcdInput(e.target.value)} 
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contenedor Soporte Técnico (Auto-jalado o Editable) */}
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                    <span className="block font-bold text-blue-600 uppercase text-[10px]">Soporte Técnico Asignado (Auto-sincronizado)</span>
                    
                    {!editandoPlana ? (
                      <div className="space-y-1 text-xs">
                        <p><strong>Supervisor:</strong> <span className="text-slate-800">{reg?.supervisor || 'N/A'}</span></p>
                        <p><strong>Técnico Responsable:</strong> <span className="text-slate-800 font-medium">{reg?.tecnico_nombre || 'N/A'}</span></p>
                        <p><strong>DNI:</strong> <span className="text-slate-800">{reg?.tecnico_dni || 'N/A'}</span> | <strong>Celular:</strong> <span className="text-blue-600 font-bold">{reg?.tecnico_celular || 'N/A'}</span></p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <input 
                          type="text" 
                          placeholder="Supervisor de ODPE" 
                          value={supervisorInput} 
                          onChange={(e) => setSupervisorInput(e.target.value)} 
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                        />
                        <input 
                          type="text" 
                          placeholder="Técnico Responsable" 
                          value={tecnicoInput} 
                          onChange={(e) => setTecnicoInput(e.target.value)} 
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            placeholder="DNI Técnico" 
                            maxLength={8}
                            value={dniInput} 
                            onChange={(e) => setDniInput(e.target.value)} 
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Celular Técnico" 
                            maxLength={9}
                            value={celularInput} 
                            onChange={(e) => setCelularInput(e.target.value)} 
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {editandoPlana && (
                    <button 
                      onClick={guardarFichaODPE} 
                      disabled={guardando}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      {guardando ? 'Guardando...' : '💾 Guardar Datos de ODPE'}
                    </button>
                  )}

                </div>
              );
            })()}

            <button onClick={() => setOdpeDetalle(null)} className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl">
              Cerrar Vista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
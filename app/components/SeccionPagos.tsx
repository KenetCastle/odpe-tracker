'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import { DollarSign, ChevronLeft, ChevronRight, Search, Trash2, Eye, Archive, RotateCcw } from 'lucide-react';

interface PagoTecnico {
  id: number;
  odpe_nombre: string;
  tecnico_nombre: string;
  tecnico_dni: string;
  motivo_gasto: string;
  monto: number;
  metodo_pago: string;
  estado_pago: string;
  comprobante_url?: string;
  registrado_por?: string;
  observacion_pago?: string;
  created_at: string;
  en_papelera: boolean;
}

interface SeccionPagosProps {
  estilosTema: any;
  perfil: any;
}

export default function SeccionPagos({ estilosTema, perfil: perfilPadre }: SeccionPagosProps) {
  const [pagos, setPagos] = useState<PagoTecnico[]>([]);
  const [listaPadron, setListaPadron] = useState<any[]>([]);
  const [paginaActualPagos, setPaginaActualPagos] = useState(1);
  const elementosPorPagina = 20;

  const [busquedaPagoInput, setBusquedaPagoInput] = useState('');
  const [vistaPapeleraPagos, setVistaPapeleraPagos] = useState(false);

  const [modalNuevoPago, setModalNuevoPago] = useState(false);
  const [modalAtenderPago, setModalAtenderPago] = useState<PagoTecnico | null>(null);
  const [modalVerDetallePago, setModalVerDetallePago] = useState<PagoTecnico | null>(null);
  
  const [pagoOdpe, setPagoOdpe] = useState('');
  const [pagoTecnicoNombre, setPagoTecnicoNombre] = useState('');
  const [pagoTecnicoDni, setPagoTecnicoDni] = useState('');
  const [pagoMotivo, setPagoMotivo] = useState('');
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('Yape');
  const [pagoComprobanteFile, setPagoComprobanteFile] = useState<File | null>(null);
  const [enviandoPago, setEnviandoPago] = useState(false);

  const [nuevoEstadoPago, setNuevoEstadoPago] = useState('Pagado');
  const [obsPagoInput, setObsPagoInput] = useState('');

  // Perfil autogestionado para evitar que el componente padre falle
  const [rolReal, setRolReal] = useState<string>('');
  const [correoReal, setCorreoReal] = useState<string>('');

  const listaMetodosPago = ['Yape', 'Plin', 'Depósito BCP', 'Depósito BBVA', 'Transferencia Interbancaria', 'Efectivo'];

  // Cargar rol y correo directamente desde la sesión de Supabase al montar
  useEffect(() => {
    const verificarRolDirecto = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          setCorreoReal(user.email);
          
          // Consultamos directamente la tabla perfiles
          const { data: perfilData } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .maybeSingle();

          if (perfilData && perfilData.rol) {
            setRolReal(perfilData.rol.toLowerCase());
          } else {
            // Si falló por ID, probamos por correo
            const { data: perfilDataEmail } = await supabase
              .from('perfiles')
              .select('rol')
              .eq('correo', user.email)
              .maybeSingle();
            
            if (perfilDataEmail && perfilDataEmail.rol) {
              setRolReal(perfilDataEmail.rol.toLowerCase());
            }
          }
        }
      } catch (e) {
        console.error("Error obteniendo rol directo:", e);
      }
    };

    verificarRolDirecto();
  }, []);

  // Validaciones robustas combinando prop padre y autogestión directa
  const rolFinal = (rolReal || perfilPadre?.rol || '').toLowerCase();
  const correoFinal = (correoReal || perfilPadre?.correo || '').toLowerCase();

  const esAdminAbsoluto = 
    correoFinal.includes('junior.chry26') || 
    correoFinal.includes('kenet') ||
    rolFinal.includes('admin') || 
    rolFinal.includes('administrador');

  const esJuniorOAdmin = 
    esAdminAbsoluto || 
    rolFinal.includes('junior') || 
    correoFinal.includes('junior');

  const fetchPagosYPadron = async () => {
    const { data: resPagos } = await supabase.from('pagos_tecnicos').select('*').order('created_at', { ascending: false });
    if (resPagos) setPagos(resPagos);

    const { data: resPadron } = await supabase.from('padron_odpes').select('*').order('odpe_nombre', { ascending: true });
    if (resPadron && resPadron.length > 0) {
      setListaPadron(resPadron);
      if (!pagoOdpe) {
        setPagoOdpe(resPadron[0].odpe_nombre);
        setPagoTecnicoNombre(resPadron[0].tecnico_nombre || '');
        setPagoTecnicoDni(resPadron[0].dni || '');
      }
    }
  };

  useEffect(() => {
    fetchPagosYPadron();

    const canalPagos = supabase.channel('realtime-pagos-component')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_tecnicos' }, () => fetchPagosYPadron())
      .subscribe();

    return () => {
      supabase.removeChannel(canalPagos);
    };
  }, []);

  const handleCambioOdpePago = (nombreOdpe: string) => {
    setPagoOdpe(nombreOdpe);
    const coincidencia = listaPadron.find(p => p.odpe_nombre === nombreOdpe);
    if (coincidencia) {
      setPagoTecnicoNombre(coincidencia.tecnico_nombre || '');
      setPagoTecnicoDni(coincidencia.dni || '');
    }
  };

  const subirVoucher = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `pagos/${fileName}`;

    const { error } = await supabase.storage.from('incidencias-fotos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('incidencias-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmitPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoPago(true);
    try {
      let urlComprobante = '';
      if (pagoComprobanteFile) {
        urlComprobante = await subirVoucher(pagoComprobanteFile);
      }

      const payload = {
        odpe_nombre: pagoOdpe,
        tecnico_nombre: pagoTecnicoNombre,
        tecnico_dni: pagoTecnicoDni,
        motivo_gasto: pagoMotivo,
        monto: parseFloat(pagoMonto),
        metodo_pago: pagoMetodo,
        estado_pago: 'Pendiente de Pago',
        comprobante_url: urlComprobante || null,
        registrado_por: correoFinal || 'Supervisor',
        en_papelera: false
      };

      const { error } = await supabase.from('pagos_tecnicos').insert([payload]);
      if (error) throw error;

      toast.success('¡Solicitud de pago registrada correctamente!');
      setModalNuevoPago(false);
      setPagoMotivo('');
      setPagoMonto('');
      setPagoComprobanteFile(null);
      fetchPagosYPadron();
    } catch (err: any) {
      toast.error('Error al registrar pago: ' + err.message);
    }
    setEnviandoPago(false);
  };

  const handleActualizarEstadoPago = async () => {
    if (!esJuniorOAdmin) return toast.error('Permiso denegado. No cuentas con rol autorizado.');
    if (!modalAtenderPago) return;

    const { error } = await supabase.from('pagos_tecnicos').update({
      estado_pago: nuevoEstadoPago,
      observacion_pago: obsPagoInput.trim() || null
    }).eq('id', modalAtenderPago.id);

    if (error) {
      toast.error('Error al actualizar pago: ' + error.message);
    } else {
      toast.success('Estado de pago actualizado con éxito');
      setModalAtenderPago(null);
      setObsPagoInput('');
      fetchPagosYPadron();
    }
  };

  const moverPapeleraPago = async (id: number, enviarAPapelera: boolean) => {
    if (!esJuniorOAdmin) return toast.error('Permiso denegado.');
    
    const { error } = await supabase.from('pagos_tecnicos').update({ en_papelera: enviarAPapelera }).eq('id', id);
    if (error) {
      toast.error('Error al actualizar papelera: ' + error.message);
    } else {
      toast.info(enviarAPapelera ? 'Movido a la papelera' : 'Registro restaurado');
      fetchPagosYPadron();
    }
  };

  const eliminarDefinitivoPago = async (id: number) => {
    if (!esAdminAbsoluto) {
      return toast.error('Solo el rol Administrador puede eliminar registros permanentemente.');
    }
    if (!confirm('¿Eliminar este registro de forma permanente?')) return;

    const { error } = await supabase.from('pagos_tecnicos').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar definitivamente: ' + error.message);
    } else {
      toast.success('Registro eliminado definitivamente');
      fetchPagosYPadron();
    }
  };

  const exportarExcelPagos = () => {
    if (pagos.length === 0) return toast.error('No hay registros de pagos para exportar');

    const datosFormateados = pagos.filter(p => !p.en_papelera).map(p => ({
      ID: p.id,
      Fecha: new Date(p.created_at).toLocaleString('es-PE'),
      ODPE: p.odpe_nombre,
      'Técnico': p.tecnico_nombre,
      DNI: p.tecnico_dni,
      'Motivo del Gasto': p.motivo_gasto,
      'Monto (S/)': p.monto,
      'Método de Pago': p.metodo_pago,
      Estado: p.estado_pago,
      'Registrado Por': p.registrado_por || 'S/N',
      Observaciones: p.observacion_pago || 'Ninguna'
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
      { wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 22 },
      { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 18 },
      { wch: 16 }, { wch: 22 }, { wch: 25 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Pagos');

    XLSX.writeFile(workbook, `Reporte_Pagos_Tecnicos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('¡Reporte de Pagos exportado a Excel con éxito!');
  };

  const pagosFiltrados = pagos.filter(p => {
    const coincidePapelera = vistaPapeleraPagos ? p.en_papelera : !p.en_papelera;
    const coincideBusqueda = p.odpe_nombre.toLowerCase().includes(busquedaPagoInput.toLowerCase()) ||
      p.tecnico_nombre.toLowerCase().includes(busquedaPagoInput.toLowerCase()) ||
      p.tecnico_dni.includes(busquedaPagoInput) ||
      p.motivo_gasto.toLowerCase().includes(busquedaPagoInput.toLowerCase());

    return coincidePapelera && coincideBusqueda;
  });

  const totalPaginasPagos = Math.ceil(pagosFiltrados.length / elementosPorPagina) || 1;
  const indexUltimoPago = paginaActualPagos * elementosPorPagina;
  const pagosPaginados = pagosFiltrados.slice(indexUltimoPago - elementosPorPagina, indexUltimoPago);

  return (
    <div className={`${estilosTema.bgCard} p-6 rounded-2xl border shadow-sm space-y-5`}>
      <Toaster position="bottom-right" richColors />
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-stone-300/40 pb-4">
        <div>
          <h3 className="text-sm font-black uppercase text-amber-800">
            {vistaPapeleraPagos ? '🗑️ Papelera de Pagos' : 'Control de Gastos y Reembolsos'}
          </h3>
          <p className={`text-xs mt-0.5 ${estilosTema.subtext}`}>
            Sesión activa: {correoFinal || 'Cargando...'} — Rol: <span className="font-bold uppercase text-amber-700">{rolReal || perfilPadre?.rol || 'Supervisor'}</span>
            </p>
          
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setVistaPapeleraPagos(!vistaPapeleraPagos)} 
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${vistaPapeleraPagos ? 'bg-amber-200 text-amber-900 border-amber-400' : `${estilosTema.bgCard} border-stone-300`}`}
          >
            <Archive className="w-4 h-4" /> {vistaPapeleraPagos ? 'Ver Pagos Activos' : 'Ver Papelera'}
          </button>
          {!vistaPapeleraPagos && (
            <>
              <button onClick={exportarExcelPagos} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2">
                📊 Exportar Pagos Excel
              </button>
              <button onClick={() => setModalNuevoPago(true)} className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2">
                + Registrar Nuevo Gasto
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 opacity-50" />
        <input 
          type="text" 
          placeholder="Buscar por ODPE, técnico, DNI o motivo de gasto..." 
          value={busquedaPagoInput} 
          onChange={(e) => { setBusquedaPagoInput(e.target.value); setPaginaActualPagos(1); }} 
          className={`w-full rounded-xl p-3 pl-10 text-xs ${estilosTema.bgInput}`} 
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className={`font-bold border-b uppercase ${estilosTema.subtext}`}>
            <tr>
              <th className="py-4 px-4">ID / ODPE</th>
              <th className="py-4 px-4">Técnico / DNI</th>
              <th className="py-4 px-4">Motivo del Gasto</th>
              <th className="py-4 px-4">Monto (S/)</th>
              <th className="py-4 px-4">Método</th>
              <th className="py-4 px-4">Estado</th>
              <th className="py-4 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300/40">
            {pagosPaginados.map((p) => (
              <tr key={p.id} className="hover:bg-stone-500/10 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-mono text-amber-700 font-bold text-sm">#{p.id}</span>
                  <p className="font-bold mt-0.5">{p.odpe_nombre}</p>
                </td>
                <td className="py-4 px-4">
                  <p className="font-semibold">{p.tecnico_nombre}</p>
                  <p className={`text-[11px] ${estilosTema.subtext}`}>DNI: {p.tecnico_dni}</p>
                </td>
                <td className="py-4 px-4 max-w-xs break-words">
                  <p className="font-semibold">{p.motivo_gasto}</p>
                  {p.observacion_pago && <p className="text-[11px] text-amber-800">Obs: {p.observacion_pago}</p>}
                </td>
                <td className="py-4 px-4 font-mono font-bold text-sm text-emerald-700">
                  S/ {Number(p.monto).toFixed(2)}
                </td>
                <td className="py-4 px-4 font-semibold">{p.metodo_pago}</td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                    p.estado_pago === 'Pagado' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                    p.estado_pago === 'Observado' ? 'bg-red-100 text-red-900 border border-red-300' :
                    'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {p.estado_pago}
                  </span>
                </td>
                <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                  <button onClick={() => setModalVerDetallePago(p)} className="bg-stone-300/60 hover:bg-stone-300 px-3 py-2 rounded-xl font-bold inline-flex items-center gap-1" title="Ver Detalles">
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </button>

                  {!vistaPapeleraPagos ? (
                    <>
                      <button 
                        onClick={() => { 
                          setModalAtenderPago(p); 
                          setNuevoEstadoPago(p.estado_pago); 
                          setObsPagoInput(p.observacion_pago || ''); 
                        }} 
                        className={`px-3 py-2 rounded-xl font-bold shadow-md ${estilosTema.accentPrimary}`}
                      >
                        ✏️ Gestionar
                      </button>

                      <button onClick={() => moverPapeleraPago(p.id, true)} className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-2 rounded-xl font-bold border border-amber-300 transition-all" title="Mover a Papelera">
                        🗑️
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => moverPapeleraPago(p.id, false)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-3 py-2 rounded-xl font-bold border border-emerald-300 transition-all" title="Restaurar">
                        <RotateCcw className="w-3.5 h-3.5 inline" /> Restaurar
                      </button>
                      <button onClick={() => eliminarDefinitivoPago(p.id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl font-bold transition-all" title="Eliminar Definitivo">
                        ❌
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginasPagos > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-stone-300/40 text-xs">
          <span className={estilosTema.subtext}>Mostrando página {paginaActualPagos} de {totalPaginasPagos} ({pagosFiltrados.length} registros)</span>
          <div className="flex gap-1.5 items-center">
            <button onClick={() => setPaginaActualPagos(p => Math.max(p - 1, 1))} disabled={paginaActualPagos === 1} className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <div className="flex gap-1 px-2">
              {Array.from({ length: totalPaginasPagos }, (_, i) => i + 1).map(num => (
                <button key={num} onClick={() => setPaginaActualPagos(num)} className={`w-8 h-8 rounded-xl font-bold text-xs ${paginaActualPagos === num ? estilosTema.accentPrimary : 'border border-stone-300 bg-stone-100'}`}>
                  {num}
                </button>
              ))}
            </div>
            <button onClick={() => setPaginaActualPagos(p => Math.min(p + 1, totalPaginasPagos))} disabled={paginaActualPagos === totalPaginasPagos} className="p-2 rounded-xl border border-stone-300 bg-stone-100 disabled:opacity-30 font-bold flex items-center gap-1">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL NUEVO GASTO */}
      {modalNuevoPago && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${estilosTema.bgCard} rounded-3xl max-w-md w-full p-8 space-y-5 text-xs border shadow-2xl`}>
            <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide">Registrar Solicitud de Reembolso</h3>
              <button onClick={() => setModalNuevoPago(false)} className="font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmitPago} className="space-y-4">
              <div>
                <label className="block font-bold mb-1 uppercase text-[11px]">ODPE:</label>
                <select value={pagoOdpe} onChange={(e) => handleCambioOdpePago(e.target.value)} className={`w-full rounded-xl p-3 font-bold ${estilosTema.bgInput}`}>
                  {listaPadron.map(p => <option key={p.dni} value={p.odpe_nombre}>{p.odpe_nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 uppercase text-[11px]">Técnico:</label>
                  <input type="text" required placeholder="Nombre" value={pagoTecnicoNombre} onChange={(e) => setPagoTecnicoNombre(e.target.value)} className={`w-full rounded-xl p-3 ${estilosTema.bgInput}`} />
                </div>
                <div>
                  <label className="block font-bold mb-1 uppercase text-[11px]">DNI:</label>
                  <input type="text" required maxLength={8} placeholder="DNI" value={pagoTecnicoDni} onChange={(e) => setPagoTecnicoDni(e.target.value)} className={`w-full rounded-xl p-3 font-mono ${estilosTema.bgInput}`} />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-[11px]">Motivo del Gasto:</label>
                <textarea rows={2} required placeholder="Ej. Compra de cable HDMI..." value={pagoMotivo} onChange={(e) => setPagoMotivo(e.target.value)} className={`w-full rounded-xl p-3 resize-none ${estilosTema.bgInput}`} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 uppercase text-[11px]">Monto (S/):</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className={`w-full rounded-xl p-3 font-mono ${estilosTema.bgInput}`} />
                </div>
                <div>
                  <label className="block font-bold mb-1 uppercase text-[11px]">Método:</label>
                  <select value={pagoMetodo} onChange={(e) => setPagoMetodo(e.target.value)} className={`w-full rounded-xl p-3 font-bold ${estilosTema.bgInput}`}>
                    {listaMetodosPago.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-[11px]">🧾 Adjuntar Voucher (Optimizado):</label>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setPagoComprobanteFile(e.target.files?.[0] || null)} className="w-full text-xs" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={enviandoPago} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg text-xs">
                  {enviandoPago ? 'Guardando...' : 'Registrar Gasto'}
                </button>
                <button type="button" onClick={() => setModalNuevoPago(false)} className="w-full bg-stone-300/60 hover:bg-stone-300 text-stone-900 font-bold py-3.5 rounded-xl text-xs">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER DETALLE COMPLETO (LUPA) */}
      {modalVerDetallePago && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${estilosTema.bgCard} rounded-3xl max-w-lg w-full p-8 space-y-4 text-xs border shadow-2xl`}>
            <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide text-amber-800">Detalle del Gasto #{modalVerDetallePago.id}</h3>
              <button onClick={() => setModalVerDetallePago(null)} className="font-bold text-sm">✕</button>
            </div>

            <div className={`p-4 rounded-xl border ${estilosTema.bgInput} space-y-2`}>
              <p><strong>ODPE:</strong> {modalVerDetallePago.odpe_nombre}</p>
              <p><strong>Técnico:</strong> {modalVerDetallePago.tecnico_nombre} (DNI: {modalVerDetallePago.tecnico_dni})</p>
              <p className="break-words"><strong>Motivo:</strong> {modalVerDetallePago.motivo_gasto}</p>
              <p className="text-emerald-700 font-bold text-sm">Monto: S/ {Number(modalVerDetallePago.monto).toFixed(2)}</p>
              <p><strong>Método de Pago:</strong> {modalVerDetallePago.metodo_pago}</p>
              <p><strong>Estado Actual:</strong> <span className="uppercase font-bold">{modalVerDetallePago.estado_pago}</span></p>
              <p><strong>Registrado Por:</strong> {modalVerDetallePago.registrado_por || 'S/N'}</p>
              {modalVerDetallePago.observacion_pago && <p className="break-words"><strong>Observación:</strong> {modalVerDetallePago.observacion_pago}</p>}
            </div>

            {modalVerDetallePago.comprobante_url ? (
              <div className="space-y-1.5">
                <span className="font-bold uppercase text-[11px] block">🧾 Comprobante / Voucher:</span>
                <div className="border rounded-2xl overflow-hidden shadow-sm bg-black/5 p-1 text-center">
                  <a href={modalVerDetallePago.comprobante_url} target="_blank" rel="noopener noreferrer">
                    <img src={modalVerDetallePago.comprobante_url} alt="Voucher de pago" className="max-h-60 mx-auto object-contain rounded-xl hover:opacity-95 transition-opacity" />
                  </a>
                  <p className="text-[10px] opacity-70 mt-1">Haz clic en la imagen para abrir en tamaño real</p>
                </div>
              </div>
            ) : (
              <p className="italic opacity-60 text-center">No hay comprobante adjunto para este pago.</p>
            )}

            <button onClick={() => setModalVerDetallePago(null)} className={`w-full font-bold py-3.5 rounded-xl shadow-lg text-xs ${estilosTema.accentPrimary}`}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL GESTIONAR PAGO */}
      {modalAtenderPago && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${estilosTema.bgCard} rounded-3xl max-w-md w-full p-8 space-y-5 text-xs border shadow-2xl`}>
            <div className="flex justify-between items-center border-b border-stone-300/40 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide">Gestionar Pago #{modalAtenderPago.id}</h3>
              <button onClick={() => setModalAtenderPago(null)} className="font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${estilosTema.bgInput} space-y-2`}>
                <p><strong>ODPE:</strong> {modalAtenderPago.odpe_nombre}</p>
                <p><strong>Técnico:</strong> {modalAtenderPago.tecnico_nombre}</p>
                <p className="break-words"><strong>Motivo:</strong> {modalAtenderPago.motivo_gasto}</p>
                <p className="text-emerald-700 font-bold text-sm">Monto: S/ {Number(modalAtenderPago.monto).toFixed(2)} ({modalAtenderPago.metodo_pago})</p>
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-[11px]">Estado del Pago:</label>
                <select value={nuevoEstadoPago} onChange={(e) => setNuevoEstadoPago(e.target.value)} className={`w-full rounded-xl p-3 font-bold ${estilosTema.bgInput}`}>
                  <option value="Pendiente de Pago">⏳ Pendiente de Pago</option>
                  <option value="Pagado">✅ Pagado</option>
                  <option value="Observado">⚠️ Observado</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-[11px]">Observación / N° de Operación:</label>
                <textarea rows={3} placeholder="Ej. Yape realizado con éxito, N° Op..." value={obsPagoInput} onChange={(e) => setObsPagoInput(e.target.value)} className={`w-full rounded-xl p-3 ${estilosTema.bgInput}`} />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleActualizarEstadoPago} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg text-xs">Guardar Cambios</button>
                <button onClick={() => setModalAtenderPago(null)} className="w-full bg-stone-300/60 hover:bg-stone-300 text-stone-900 font-bold py-3.5 rounded-xl text-xs">Cancelar y Salir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
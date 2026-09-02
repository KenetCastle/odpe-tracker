'use client';

interface Incidencia {
  id: number;
  odpe_nombre: string;
  tecnico_nombre: string;
  tecnico_dni: string;
  tecnico_celular: string;
  created_at: string;
}

export default function TablaTecnicos({ incidencias }: { incidencias: Incidencia[] }) {
  // Map para asegurar 1 solo técnico por ODPE (se queda con el último registrado)
  const tecnicosPorOdpe = incidencias.reduce<Record<string, Incidencia>>((acc, actual) => {
    if (!actual.odpe_nombre || !actual.tecnico_nombre || !actual.tecnico_nombre.trim()) return acc;
    
    const odpeKey = actual.odpe_nombre.toUpperCase().trim();

    // Como las incidencias vienen ordenadas por fecha descendente desde Supabase, 
    // la primera que encuentra para una ODPE es la más reciente.
    if (!acc[odpeKey]) {
      acc[odpeKey] = actual;
    }

    return acc;
  }, {});

  const listaTecnicos = Object.values(tecnicosPorOdpe);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-800 uppercase">Personal Técnico Titular por ODPE</h3>
          <p className="text-xs text-slate-500">Muestra exclusivamente el técnico titular asignado (último registrado por sede).</p>
        </div>
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
          Total: {listaTecnicos.length} Sedes Asignadas
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 font-bold border-b text-slate-500 uppercase">
            <tr>
              <th className="py-3 px-3">ODPE Asignada</th>
              <th className="py-3 px-3">Técnico Titular</th>
              <th className="py-3 px-3">DNI</th>
              <th className="py-3 px-3">Celular</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listaTecnicos.map((t, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                    {t.odpe_nombre}
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-slate-800">{t.tecnico_nombre}</td>
                <td className="py-3 px-3 font-mono text-slate-600">{t.tecnico_dni || 'S/N'}</td>
                <td className="py-3 px-3 text-blue-600 font-semibold">{t.tecnico_celular || 'S/N'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
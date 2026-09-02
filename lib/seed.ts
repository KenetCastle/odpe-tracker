import { supabase } from './supabase';

export async function seedODPEs() {
  const odpesEjemplo = [
    { nombre: 'ODPE LIMA CENTRO', region: 'Lima' },
    { nombre: 'ODPE CUSCO', region: 'Cusco' },
    { nombre: 'ODPE AREQUIPA', region: 'Arequipa' },
  ];

  const { data, error } = await supabase.from('odpes').insert(odpesEjemplo);

  if (error) console.error('Error insertando ODPEs:', error);
  else console.log('ODPEs agregadas con éxito:', data);
}
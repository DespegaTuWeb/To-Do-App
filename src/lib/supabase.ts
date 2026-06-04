import { createClient } from '@supabase/supabase-js';

// Usar non-null assertions para garantizar una única instancia global del cliente.
// Si las variables de entorno no están definidas, Next.js lanzará un error claro en arranque.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Instancia única y global — toda la app importa este objeto, nunca crea otro.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Categoria {
  id: string;
  created_at: string;
  nombre: string;
  color: string;
  user_id?: string;
}

export interface CategoriaCompartida {
  id: string;
  created_at: string;
  categoria_id: string;
  email_usuario: string;
  owner_id?: string;
}

export interface Pendiente {
  id: string;
  created_at: string;
  titulo: string;
  nota: string | null;
  fecha_limite: string | null; // Formato YYYY-MM-DD
  completado: boolean;
  categoria_id: string | null;
  user_id?: string;
  grupo_nombre?: string | null;
  grupo_color?: string | null;
  es_grupo?: boolean;
}

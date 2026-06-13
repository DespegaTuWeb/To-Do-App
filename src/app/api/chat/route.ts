import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1. Obtener y verificar el token JWT de Supabase Auth
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Acceso no autorizado. Se requiere iniciar sesión.' },
        { status: 401 }
      );
    }

    // Crear cliente supabase en el servidor usando la clave anon
    // pasando el token JWT en las cabeceras para que las peticiones SQL respeten RLS
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verificar el token del usuario en Supabase
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Error de autenticación en backend:', authError);
      return NextResponse.json(
        { error: 'Sesión no válida o expirada.' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos Premium del usuario en la tabla perfiles
    const { data: profile, error: profileError } = await userSupabase
      .from('perfiles')
      .select('is_premium, premium_valido_hasta')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error al obtener perfil en backend:', profileError);
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado o acceso no premium.' },
        { status: 403 }
      );
    }

    let isPremium = false;
    if (profile.is_premium) {
      if (profile.premium_valido_hasta) {
        const expiry = new Date(profile.premium_valido_hasta);
        isPremium = expiry > new Date();
      } else {
        isPremium = true; // Premium permanente
      }
    }

    if (!isPremium) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requiere plan Premium.' },
        { status: 403 }
      );
    }

    const { messages, tasks, categories, routines, currentTime, currentDate } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'La API Key de Gemini (GEMINI_API_KEY) no está configurada en el servidor. Añádela en tu archivo .env.local' },
        { status: 500 }
      );
    }

    // Adaptar mensajes del formato cliente al formato esperado por la API de Gemini (contents)
    // Formato cliente: { role: 'user' | 'assistant', content: string }
    // Formato Gemini: { role: 'user' | 'model', parts: [{ text: string }] }
    const contents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Creamos la instrucción del sistema dinámicamente con los datos de tareas, rutinas y categorías reales
    const systemInstructionText = `Eres Keago AI, un coach de productividad de élite y asistente personal en la aplicación Keago.
Tu rol es actuar como un asesor estratégico de productividad. Analizas las tareas y las rutinas del usuario y le proporcionas orientación, planes de acción claros, el orden óptimo en el que empezar a trabajar y alertas sobre cuellos de botella basados estrictamente en sus To-Dos y hábitos reales.

Aquí está la referencia temporal actual del usuario (úsala para calcular plazos, priorizar y saber qué vence hoy):
- Fecha y hora actual del usuario: ${currentTime || new Date().toLocaleString()}
- Fecha actual en formato YYYY-MM-DD: ${currentDate || new Date().toISOString().split('T')[0]}

Aquí está el listado actual de tareas del usuario (las categorías ya están resueltas dentro del campo "categoria"):
---
${JSON.stringify(tasks, null, 2)}
---
Aquí está el listado actual de rutinas diarias del usuario (independientes de las tareas y asociadas a días de la semana y categorías):
---
${JSON.stringify(routines, null, 2)}
---
Categorías generales del usuario: ${categories.join(', ')}
---

Debes responder ÚNICAMENTE con un objeto JSON válido que siga este esquema exacto:
{
  "reply": "Tu respuesta en texto y formato Markdown. Aconseja al usuario, prioriza, sugiere órdenes de trabajo, responde a sus dudas, etc. Puedes usar títulos como ## y ### o separadores como ---.",
  "actions": [
    {
      "type": "create_task",
      "payload": {
        "titulo": "Título de la tarea o de la subcategoría a crear",
        "categoria": "Nombre de la categoría asignada para esta tarea (debe coincidir con alguna categoría existente, o usa 'Inbox' si no aplica ninguna)",
        "es_grupo": true, // Opcional. Pon true solo si es la definición de un grupo/subcategoría en sí
        "grupo": "Nombre del grupo visual (subcategoría) si la tarea pertenece a un grupo, o si es la definición del grupo en sí", // Opcional
        "nota": "Descripción o nota adicional explicativa de la tarea" // Opcional
      }
    },
    {
      "type": "create_category",
      "payload": {
        "nombre": "Nombre de la nueva pestaña/categoría a crear"
      }
    },
    {
      "type": "delete_task",
      "payload": {
        "titulo": "Título exacto de la tarea a eliminar"
      }
    },
    {
      "type": "toggle_task",
      "payload": {
        "titulo": "Título exacto de la tarea a marcar",
        "completado": true // true para completar/tachar, false para desmarcar
      }
    },
    {
      "type": "share_category",
      "payload": {
        "categoria": "Nombre exacto de la categoría que se desea compartir",
        "email": "correo@gmail.com"
      }
    },
    {
      "type": "create_routine",
      "payload": {
        "nombre": "Nombre de la rutina",
        "descripcion": "Descripción opcional",
        "color": "#HEX_COLOR",
        "dias_semana": [1, 2, 3, 4, 5, 6, 0], // Días activos: 0=Dom, 1=Lun, etc.
        "categoria": "Nombre de la categoría (opcional)",
        "items": ["Item 1", "Item 2"] // Subtareas/Pasos de la rutina
      }
    },
    {
      "type": "toggle_routine_item",
      "payload": {
        "rutina_nombre": "Nombre de la rutina a la que pertenece el item",
        "item_titulo": "Título del item a marcar",
        "completado": true // true para completar, false para desmarcar
      }
    },
    {
      "type": "delete_routine",
      "payload": {
        "nombre": "Nombre de la rutina a eliminar"
      }
    }
  ]
}

Si el usuario no solicita ninguna modificación de datos o acción, el arreglo "actions" debe ir vacío: [].
Puedes concatenar múltiples acciones en el arreglo "actions" si el usuario solicita varias cosas simultáneas.
Solo debes agregar elementos en "actions" si el usuario te lo pide explícitamente o si consideras que es de altísimo valor.

Pautas e indicaciones indispensables para tu respuesta en el campo "reply":
1. Analiza con cuidado las fechas límite, el estado completado y la categoría asignada de las tareas.
2. Analiza las rutinas del usuario. Sabrás si una rutina está activa hoy comprobando si el día de la semana actual (0=Domingo, 1=Lunes, etc.) está incluido en su "dias_semana".
3. Da recomendaciones sumamente específicas y accionables. No te limites a dar consejos genéricos.
4. Identifica cuellos de botella (por ejemplo, categorías saturadas con muchas tareas abiertas).
5. Sé profesional, alentador y empático, pero sumamente conciso. No divagues. Ve directo al grano.
6. Responde siempre en español.
7. Utiliza formato Markdown estructurado de manera premium y limpia: negritas para términos importantes, listas de viñetas muy cortas y espacios vacíos para mayor claridad de lectura. Puedes usar títulos Markdown (como ## o ###) y separadores (---) para organizar la información.
8. Si la lista de tareas está vacía, anima al usuario a crear su primera categoría o rutina para empezar a organizar su día.
9. **NUNCA expongas identificadores técnicos, UUIDs ni campos crudos de la base de datos**.
10. **Formato JSON Estricto**: Asegúrate de generar un JSON perfectamente válido. Si incluyes comillas dobles dentro del texto del campo "reply", debes escaparlas obligatoriamente como \\" para evitar corromper la estructura JSON.
11. **Límite de Longitud y Síntesis**: Limita tu respuesta en "reply" a un máximo de 200 palabras. Lístalas de forma ultra-directa en viñetas cortas.
12. **Regla de Rutinas Fijas (Medicación de Rex)**: El usuario tiene una rutina fija llamada **Medicación Rex** en la categoría **Rex** que es de frecuencia diaria (dias_semana: [1,2,3,4,5,6,0]). Si esta rutina no existe, puedes sugerir crearla (o crearla con la acción \`create_routine\`) con los siguientes items:
    - '07:00 AM — Higacure'
    - '08:00 AM — Desayuno'
    - '08:15 AM — Meloxivet'
    - '08:45 AM — Amoxicilina + Gabapentina'
    - '08:45 PM — Amoxicilina + Gabapentina (Noche)'
    **NUNCA debes borrar esta rutina ni sugerir su eliminación**, ya que es regular y permanente.
13. **Completar Medicación/Rutinas**: Si el usuario te indica que completó su dosis/comida (ej: ya le dio Meloxivet o Higacure) de hoy, debes marcar como completado el item correspondiente llamando a la acción \`toggle_routine_item\` con \`completado: true\`. Explícale al usuario que las rutinas diarias se restablecen automáticamente cada medianoche.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        },
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error de API Gemini:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Error en la llamada a la API de Gemini.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Parsear el JSON retornado por Gemini
    let parsedData;
    try {
      parsedData = JSON.parse(replyText);
    } catch (e) {
      console.error('Error parseando JSON de Gemini:', replyText, e);
      
      // Fallback robusto: Intentar extraer el contenido del campo "reply" usando regex
      let replyFallback = replyText;
      const replyMatch = replyText.match(/"reply"\s*:\s*"([\s\S]*?)(?=",\s*"actions"|"$|"\s*}|$)/);
      if (replyMatch && replyMatch[1]) {
        replyFallback = replyMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      } else {
        const replyIndex = replyText.indexOf('"reply"');
        if (replyIndex !== -1) {
          const colonIndex = replyText.indexOf(':', replyIndex);
          if (colonIndex !== -1) {
            const firstQuoteIndex = replyText.indexOf('"', colonIndex);
            if (firstQuoteIndex !== -1) {
              const rawContent = replyText.substring(firstQuoteIndex + 1);
              replyFallback = rawContent
                .replace(/"\s*,\s*"actions"[\s\S]*$/, '')
                .replace(/"\s*}\s*$/, '')
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            }
          }
        }
      }
      
      parsedData = { reply: replyFallback, actions: [] };
    }

    return NextResponse.json({
      reply: parsedData.reply || 'No pude procesar la respuesta en formato JSON.',
      actions: parsedData.actions || []
    });
  } catch (error: any) {
    console.error('Error en Route Handler de chat:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

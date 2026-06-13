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

    const { messages, tasks, categories, currentTime, currentDate } = await req.json();
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

    // Creamos la instrucción del sistema dinámicamente con los datos de tareas y categorías reales
    const systemInstructionText = `Eres Keago AI, un coach de productividad de élite y asistente personal en la aplicación Keago.
Tu rol es actuar como un asesor estratégico de productividad. Analizas las tareas del usuario y le proporcionas orientación, planes de acción claros, el orden óptimo en el que empezar a trabajar y alertas sobre cuellos de botella basados estrictamente en sus To-Dos reales.

Aquí está la referencia temporal actual del usuario (úsala para calcular plazos, priorizar y saber qué vence hoy):
- Fecha y hora actual del usuario: ${currentTime || new Date().toLocaleString()}
- Fecha actual en formato YYYY-MM-DD: ${currentDate || new Date().toISOString().split('T')[0]}

Aquí está el listado actual de tareas del usuario (las categorías ya están resueltas dentro del campo "categoria"):
---
${JSON.stringify(tasks, null, 2)}
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
    }
  ]
}

Si el usuario no solicita ninguna modificación de datos o acción, el arreglo "actions" debe ir vacío: [].
Puedes concatenar múltiples acciones en el arreglo "actions" si el usuario solicita varias tareas simultáneas (ej. completar varias tareas, borrar unas y crear otras).
Solo debes agregar elementos en "actions" si el usuario te lo pide explícitamente o si consideras que es de altísimo valor sugerir y realizar un pendiente específico para él basado en la conversación.

Pautas e indicaciones indispensables para tu respuesta en el campo "reply":
1. Analiza con cuidado las fechas límite (fecha_limite), si una tarea es un grupo/subcategoría (es_grupo), el estado completado y la categoría asignada.
2. Da recomendaciones sumamente específicas y accionables. No te limites a dar consejos genéricos. Por ejemplo: "Tienes 3 tareas en 'Proyecto A'. Te sugiero empezar por la tarea 'X' ya que vence mañana".
3. Identifica cuellos de botella (por ejemplo, categorías saturadas con muchas tareas abiertas, tareas críticas sin fecha límite asignada o subcategorías con demasiadas tareas hijas).
4. Sé profesional, alentador y empático, pero sumamente conciso. No divagues ni des introducciones floridas o conclusiones repetitivas. Ve directo al grano.
5. Responde siempre en español.
6. Utiliza formato Markdown estructurado de manera premium y limpia: negritas para términos importantes, listas de viñetas muy cortas y espacios vacíos para mayor claridad de lectura. Puedes usar títulos Markdown (como ## o ###) y separadores (---) para organizar la información.
7. Si la lista de tareas está vacía, anima al usuario a crear su primera categoría y añadir un pendiente para empezar a organizar su día.
8. **NUNCA expongas identificadores técnicos, UUIDs ni campos crudos de la base de datos** (como "39bbbf12-1a7f-4b31-a50d-ddcb26f...", "Cat: null", "es_grupo: true", "grupo_nombre", "categoria_id", "id", "user_id", etc.). Los UUIDs e IDs son internos y no significan nada para el usuario. Refiérete a las tareas utilizando ÚNICAMENTE su título ("titulo") y a las categorías utilizando ÚNICAMENTE su nombre ("nombre"). Si una tarea no tiene categoría asignada (categoria_id es null), indícale al usuario que está en su "Inbox" o que no tiene categoría, en lugar de imprimir "Cat: null" o el ID. Toda respuesta debe estar redactada en lenguaje natural, limpio, elegante y profesional.
9. **Formato JSON Estricto**: Asegúrate de generar un JSON perfectamente válido. Si incluyes comillas dobles dentro del texto del campo "reply", debes escaparlas obligatoriamente como \\" para evitar corromper la estructura JSON.
10. **Límite de Longitud y Síntesis**: Limita tu respuesta en "reply" a un máximo de 200 palabras. Si el usuario te pide las tareas importantes o prioritarias, lístalas de forma ultra-directa en viñetas cortas de una sola línea, sin dar rodeos ni introducciones largas. Esto es indispensable para evitar que la respuesta sea demasiado pesada y se corte.
11. **Regla de Rutinas Fijas (Medicación de Rex)**: Las tareas de horarios y dosis fijas en la categoría **Rex** son rutinas diarias fijas permanentes. **NUNCA debes borrarlas ni sugerir su eliminación**, ya que actúan como plantilla fija diaria. Si estas tareas o la subcategoría **medicacion regular** no existen en la lista de pendientes (por ejemplo, porque el usuario las eliminó por error o te pide restablecerlas), debes crearlas en la categoría **Rex** dentro del grupo/subcategoría **medicacion regular** con las siguientes notas/descripciones exactas:
    - Tarea: \`"07:00 AM — Higacure"\`, nota: \`"Solo y en ayunas. No eliminar esta tarea, ya que es regular diaria."\`
    - Tarea: \`"08:00 AM — Desayuno"\`, nota: \`"No eliminar esta tarea, ya que es regular diaria."\`
    - Tarea: \`"08:15 AM — Meloxivet"\`, nota: \`"Justo después de desayunar. (Como su último inyectable fue ayer por la tarde, arrancar mañana a las 8:15 AM con el jarabe/pastilla es el momento ideal). No eliminar esta tarea, ya que es regular diaria."\`
    - Tarea: \`"08:45 AM — Amoxicilina + Gabapentina"\`, nota: \`"Juntas, cerrando el bloque de la mañana. No eliminar esta tarea, ya que es regular diaria."\`
    - Tarea: \`"08:45 PM — Amoxicilina + Gabapentina (Noche)"\`, nota: \`"Juntas, después de cenar. No eliminar esta tarea, ya que es regular diaria."\`
12. **Registro de Compleción de Medicación**: Si el usuario te indica que completó la medicación o comida de hoy (o que ya le dio su dosis/comida de Higacure, Meloxivet, Amoxicilina, etc.), **debes marcar como completada la tarea correspondiente de la plantilla fija** en el grupo/subcategoría \`medicacion regular\` llamando a la acción \`toggle_task\` con \`completado: true\`. **NO** debes crear manualmente una tarea en el grupo \`Completada\`, ya que el backend de la aplicación creará automáticamente la tarea de registro completada (ej: \`"[Nombre de la Tarea] completado DD/MM/AA"\`) al completarse la tarea de la plantilla. Explícale al usuario que las tareas de la plantilla se desmarcan automáticamente al iniciar cada nuevo día y que el historial de tracking se guarda bajo el grupo \`Completada\`.`;

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

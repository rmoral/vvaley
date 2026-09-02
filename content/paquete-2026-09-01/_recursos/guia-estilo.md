# Guía de estilo y formato — Valira Valley (blog y noticias)

Sitio: valiravalley.com · Idioma: **español de España** · Lema: "Empresa, economía e IA por quien las aplica".
Lector tipo: empresario, directivo o fundador con negocio en Andorra o vinculado a Andorra. Sabe leer una cuenta de resultados. Odia que le vendan humo.

## 1. Voz

- Escribe como un practicante, no como un observador. El autor **aplica** estas cosas en empresas reales.
- Tuteo directo al lector ("tu equipo", "revisa tu contrato"). Nunca "vosotros". Nunca "usted".
- Primera persona con moderación y solo cuando aporta ("Cuando reviso un piloto de IA, lo primero que pido es…"). No autobiografía.
- Se permite —y se agradece— la opinión con nombre y apellidos: decir que algo no funciona, que una cifra está inflada, que un proveedor exagera.
- Cada pieza debe contener al menos **una afirmación que contradiga el consenso** y esté sostenida por un dato.

## 2. Prohibiciones duras (sonar a IA)

Nunca escribas estas fórmulas ni sus variantes:
- "En el mundo actual", "en un entorno cada vez más", "en la era de la IA", "no es solo X, es Y", "la clave está en", "es importante destacar", "cabe señalar", "en resumen", "en conclusión", "en definitiva", "profundicemos", "exploremos", "sumérgete", "desbloquea", "revolucionario", "transformador", "game changer", "sin duda", "el santo grial", "punto de inflexión".
- Nada de "Introducción" / "Conclusión" como encabezados.
- Nada de emojis. Nada de negritas cada tres palabras. Máximo 6-8 negritas por artículo, y solo sobre cifras o términos técnicos.
- Nada de listas de tres elementos en cada párrafo (tricolon compulsivo).
- Nada de párrafos que empiecen con conectores rituales ("Además,", "Por otro lado,", "Asimismo,") más de una vez por pieza.

## 3. Obligaciones de escritura

- **Ritmo variable**: alterna frases de 6 palabras con frases de 30. Un párrafo de una sola línea de vez en cuando.
- **Abre con algo concreto**: una cifra, una escena, una pregunta incómoda o una objeción. Nunca con una definición general del tema.
- **Números siempre con fuente y fecha.** Formato español: 24.000 millones de dólares, 4,8 %, 2 de agosto de 2026.
- **Enlaza la fuente primaria** en el propio texto con markdown: `[Departament d'Estadística](url)`.
- Nombra herramientas, normas, importes y plazos reales. Cero ejemplos genéricos tipo "una empresa del sector".
- Incluye al menos **un contraejemplo o límite**: qué no funciona, cuándo no aplicar el consejo.
- Los encabezados H2/H3 son específicos y con verbo o cifra: "Qué revisar antes de firmar la renovación de cloud", no "Consideraciones sobre el cloud".
- Longitud artículos de blog: **1.200-1.800 palabras**. Noticias: **550-800 palabras**.

## 4. SEO

- Un solo **keyword principal** por pieza. Aparece en: título H1, primeros 100 caracteres del texto, un H2, la meta description y el slug.
- Densidad natural (0,8-1,5 %). Nunca repetir la keyword de forma forzada.
- Title tag ≤ 60 caracteres. Meta description 140-158 caracteres, con verbo de acción y un dato.
- Slug corto, sin stopwords, sin fecha.
- 3-6 keywords secundarias y semánticas (entidades relacionadas), repartidas en H2/H3 y cuerpo.
- 2-4 **enlaces internos** propuestos (a otras piezas del plan) y 3-6 **enlaces externos** a fuentes de autoridad.
- Imagen destacada con **alt text descriptivo** con la keyword, sin keyword stuffing.

## 5. GEO (Generative Engine Optimization)

Que ChatGPT, Perplexity, Google AI Overviews y Gemini puedan citar la pieza:

- **Respuesta directa arriba**: bloque `> **Respuesta rápida:**` en las primeras 120 palabras, de 40-60 palabras, autocontenido, que resuelva la consulta sin leer el resto.
- **Bloque "Lo esencial"** con 4-5 bullets de datos citables, cada uno con cifra + fuente + fecha.
- **Definiciones explícitas** de los términos clave en una frase que empiece por el término ("El Reglamento (UE) 2026/1744 es…").
- **Entidades nombradas y desambiguadas**: personas con cargo, organismos con nombre completo la primera vez, normas con número oficial, empresas con forma jurídica.
- **Datos originales o cálculo propio** en al menos un punto (los motores generativos citan lo que no está en otro sitio).
- **FAQ final** de 3-5 preguntas en lenguaje natural, con respuestas de 40-70 palabras autocontenidas.
- **Fechas visibles** en el texto ("a 1 de septiembre de 2026") para que el motor pueda fechar la información.
- **Tabla** siempre que haya comparación de 3+ elementos: las tablas se extraen bien.
- Schema JSON-LD en el front-matter: Article/NewsArticle + FAQPage.

## 6. Estructura del archivo .md

Front-matter YAML con todos los campos del ejemplo, y después el cuerpo en markdown.
El cuerpo NO repite el H1 (va en el front-matter como `title`). Empieza directamente con el párrafo de entrada.

Orden del cuerpo:
1. Párrafo de entrada (2-4 frases, concreto).
2. Bloque `> **Respuesta rápida:**`.
3. `## Lo esencial` con bullets citables.
4. Desarrollo con H2/H3.
5. `## Preguntas frecuentes` con `### pregunta` + respuesta.
6. `## Fuentes` con lista de enlaces.

## 7. Regla de oro sobre los datos

**No inventes ni una cifra, ni una cita, ni una fecha.** Solo puedes usar los datos del archivo `datos-verificados.md`. Si necesitas un dato que no está ahí, reformula la frase para no necesitarlo o escríbela en términos cualitativos. Si un dato del dossier está marcado como no verificado, no lo uses.

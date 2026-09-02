# Valira Valley — 10 artículos y 10 noticias

Paquete cerrado el 1 de septiembre de 2026. Todos los archivos llevan front-matter YAML con los campos SEO/GEO, schema JSON-LD (Article / NewsArticle + FAQ), enlaces internos propuestos, alt text y el prompt de imagen para Nano Banana.

- **20 piezas · 26.756 palabras** (artículos de 1.830-1.960 palabras, noticias de 770-830).
- Cada pieza tiene una keyword principal única y una estructura distinta.
- Todas las cifras proceden del dossier de fuentes verificadas (`_recursos/datos-verificados.md`).

## Artículos de blog

| # | Título | Slug | Keyword principal | Categoría | Palabras |
|---|---|---|---|---|---|
| A1 | Piloto de IA sin ROI: cinco patrones de fallo y su corrección | `por-que-tu-piloto-de-ia-no-llega-al-ebit` | piloto de IA sin ROI | Inteligencia artificial | 1790 |
| A2 | Coste de automatizar un proceso con IA: el modelo en cinco variables | `cuanto-cuesta-automatizar-un-proceso-con-ia` | coste de automatizar un proceso con IA | Inteligencia artificial | 1797 |
| A3 | Obligaciones de transparencia del AI Act: guía práctica para pymes | `ai-act-transparencia-pymes-guia` | obligaciones de transparencia AI Act | Inteligencia artificial | 1787 |
| A4 | Trasladar una empresa a Andorra: el calendario real de doce meses | `trasladar-empresa-a-andorra-calendario-real` | trasladar una empresa a Andorra | Empresa | 1792 |
| A5 | Contratar talento en Andorra con 213 demandantes de empleo | `contratar-talento-en-andorra-pleno-empleo` | contratar talento en Andorra | Empresa | 1764 |
| A6 | Seis casos de uso de IA en pymes que funcionan y tres que fracasan | `casos-de-uso-ia-empresa-pequena` | casos de uso de IA en pymes | Inteligencia artificial | 1800 |
| A7 | Gobernanza de agentes de IA antes de pasar a producción | `gobernanza-agentes-ia-antes-de-produccion` | gobernanza de agentes de IA | Inteligencia artificial | 1799 |
| A8 | Levantar una ronda en Europa: el récord no es tu mercado | `levantar-ronda-europa-2026-fundador` | levantar una ronda en Europa | Emprendimiento | 1781 |
| A9 | GEO posicionamiento en IA: cómo lograr que ChatGPT te cite | `geo-que-chatgpt-cite-tu-empresa` | GEO posicionamiento en IA | Inteligencia artificial | 1792 |
| A10 | Acuerdo de asociación Andorra UE: qué decidir ya y qué esperar | `acuerdo-asociacion-ue-decisiones-de-empresa` | acuerdo de asociación Andorra UE | Economía | 1788 |

## Noticias

| # | Titular | Slug | Keyword principal | Fuente principal | Palabras |
|---|---|---|---|---|---|
| N1 | IPC de Andorra, agosto de 2026: la inflación sube al 4,8 % | `ipc-andorra-agosto-2026` | IPC Andorra agosto 2026 | Departament d'Estadística | 786 |
| N2 | Andorra agota los 500.000 € de ayudas a la digitalización de empresas | `digitalitzacio-empreses-2026-ia-primera-demanda` | ayudas digitalización empresas Andorra | Govern d'Andorra | 800 |
| N3 | La UE aprueba la firma del acuerdo de asociación con Andorra | `consejo-ue-aprueba-acuerdo-asociacion-andorra` | acuerdo asociación Andorra Unión Europea | Consejo de la UE / Govern d'Andorra | 799 |
| N4 | Andbank y Andorra Telecom crean la Fundació AndUp para startups | `fundacio-andup-startups-andorra` | Fundació AndUp startups Andorra | Andbank i Andorra Telecom | 800 |
| N5 | Economía de Andorra 2026: 14.187 empresas y −35 % inmobiliario | `andorra-empresas-inmobiliario-dos-velocidades` | economía de Andorra 2026 | Departament d'Estadística | 800 |
| N6 | El Reglamento (UE) 2026/1744 aplaza el alto riesgo a diciembre de 2027 | `reglamento-2026-1744-aplaza-alto-riesgo` | Reglamento UE 2026/1744 AI Act | DOUE / Comisión Europea | 790 |
| N7 | McKinsey: el impacto de la IA en el EBIT sigue clavado en el 37 % | `mckinsey-state-of-ai-2026-ebit` | McKinsey State of AI 2026 | McKinsey | 797 |
| N8 | Alphabet eleva su capex de 2026 a 205.000 M$ y Amazon a 220.000 M$ | `capex-hiperescaladores-2026-cloud` | capex hiperescaladores 2026 | Resultados de Alphabet, Amazon, Meta y Microsoft | 796 |
| N9 | Europa capta 24.000 M$ de capital riesgo en el segundo trimestre | `capital-riesgo-europa-q2-2026` | capital riesgo Europa 2026 | Crunchbase | 773 |
| N10 | El BCE mantiene el 2,25 % y el coste laboral español sube un 5,1 % | `bce-tipos-costes-laborales-espana` | tipos BCE costes laborales 2026 | BCE / Eurostat / INE | 799 |

## Cómo publicar

1. El campo `titulo_h1` es el H1 de la página. El cuerpo del markdown no lo repite.
2. `title_tag` y `meta_description` van en las etiquetas correspondientes; están dentro de los límites de 60 y 158 caracteres.
3. Vuelca el bloque `schema` como JSON-LD en el `<head>`, y el bloque `faq` como un segundo JSON-LD de tipo FAQPage.
4. Los `enlaces_internos` apuntan a los slugs de este mismo paquete: publica primero y enlaza después, o publica todo a la vez.
5. Genera la imagen con el `prompt_nano_banana`, guárdala con el `nombre_archivo` indicado y usa el `alt` tal cual.

## Archivos de trabajo

- `_recursos/plan-editorial.md` — los 20 ángulos, con el criterio para que no se parezcan entre sí.
- `_recursos/datos-verificados.md` — dossier de datos con fuente, fecha y nivel de verificación.
- `_recursos/guia-estilo.md` — voz, prohibiciones de redacción y reglas SEO/GEO.
- `_recursos/plantilla.md` — estructura del front-matter y reglas del prompt de imagen.
- `prompts-nano-banana.md` — los 20 prompts de imagen reunidos.

# Plantilla obligatoria de archivo

```
---
tipo: articulo            # o: noticia
titulo_h1: "…"            # título visible, ≤ 70 caracteres
title_tag: "…"            # ≤ 60 caracteres, con keyword al inicio
slug: "…"
meta_description: "…"     # 140-158 caracteres
keyword_principal: "…"
keywords_secundarias: ["…", "…", "…"]
entidades: ["…", "…"]     # organismos, normas, personas, empresas citadas
categoria: "…"            # Empresa | Economía | Emprendimiento | Inteligencia artificial | Andorra
etiquetas: ["…", "…"]
autor: "Redacción Valira Valley"
fecha_publicacion: "2026-09-01"
fecha_actualizacion: "2026-09-01"
tiempo_lectura: "N min"
palabras: N
resumen_geo: "…"          # 40-60 palabras, autocontenido, respuesta directa a la consulta
enlaces_internos:
  - texto: "…"
    destino: "/blog/slug-destino"
enlaces_externos:
  - titulo: "…"
    url: "…"
imagen_destacada:
  alt: "…"
  nombre_archivo: "slug.jpg"
  prompt_nano_banana: >
    …
schema:
  "@context": "https://schema.org"
  "@type": "Article"       # o NewsArticle para noticias
  headline: "…"
  description: "…"
  datePublished: "2026-09-01"
  author: {"@type": "Organization", "name": "Valira Valley", "url": "https://valiravalley.com"}
  publisher: {"@type": "Organization", "name": "Valira Valley", "url": "https://valiravalley.com"}
  about: ["…"]
faq:
  - pregunta: "…"
    respuesta: "…"
---
```

## Prompt de imagen para Nano Banana — reglas

Cada prompt debe:
- Estar escrito **en inglés** (el modelo responde mejor) y en un solo párrafo continuo de 70-120 palabras.
- Describir una **escena fotográfica realista y concreta**, no una ilustración conceptual ni una metáfora abstracta. Nada de cerebros digitales, redes neuronales flotantes, robots humanoides ni manos tocando pantallas holográficas.
- Incluir: sujeto y acción · lugar concreto y creíble · época y hora del día · luz · óptica (cámara y focal: p. ej. "shot on a 35mm lens at f/2.0") · encuadre y composición · paleta y textura · estado de ánimo.
- Cuando la pieza sea de Andorra, anclar la escena en un entorno pirenaico o urbano andorrano verosímil (valle estrecho, montaña, arquitectura de piedra y vidrio, luz de alta montaña), sin monumentos identificables ni marcas.
- Terminar con: `Negative prompt: text, watermark, logos, distorted hands, extra fingers, uncanny faces, CGI look, stock-photo cliché, oversaturated colors.`
- Personas: describirlas de forma genérica y respetuosa, sin nombres reales ni parecidos con figuras públicas.
- Formato de salida: `photorealistic editorial photograph, 16:9, high detail`.

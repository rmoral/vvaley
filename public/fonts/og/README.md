# Fuentes para las imágenes Open Graph

Instancias **estáticas** de las dos fuentes del sitio, descargadas de Google
Fonts. Satori (el motor de `next/og`) no interpola ejes variables: si se le
pasa el TTF variable, sale el peso por defecto y el titular pierde la Black.

| Fichero | Familia | Peso | Licencia |
|---|---|---|---|
| `Fraunces-Black.ttf` | Fraunces | 900 | SIL Open Font License 1.1 |
| `PlusJakartaSans-SemiBold.ttf` | Plus Jakarta Sans | 600 | SIL Open Font License 1.1 |

Ambas son OFL, que permite redistribuirlas dentro del proyecto. Se leen en
disco en cada render de OG; no se sirven al navegador (la web usa
`next/font/google`, que es otro camino).

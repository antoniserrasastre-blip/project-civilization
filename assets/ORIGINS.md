# Registry de assets gráficos — Proyecto Civilización / Edad Primigenia

Registry obligatorio de toda asset bajo `assets/`. Cada fila incluye
hash SHA-256 verificable — si el fichero cambia sin actualizar la
fila, el lint (`pnpm lint:assets`) falla el gate.

Ver `CLAUDE-primigenia.md §7` para reglas operativas (CC0
obligatorio para v1 pública, licencias no triviales flaggeadas,
IA registrada con fuente).

## Tiles del terreno (32×32)

Placeholders SVG procedurales — solid color por tile type. Arte
real (Kenney CC0 / OpenGameArt) pendiente hasta que el entorno
de build tenga salida HTTP a `kenney.nl` u `opengameart.org`
(ver `NOTES-OVERNIGHT.md § bloqueo Sprint 1.4`).

| Fichero | Origen | Licencia | Autor | URL origen | SHA-256 |
|-|-|-|-|-|-|
| `assets/tiles/water.svg` | Proyecto Civilización (procedural) | CC0 | Equipo interno | — | `471d5f06a6568200d908cea8bcbe2faa306cd5b51cce330b2d1cc3f30c40bf9e` |
| `assets/tiles/shore.svg` | Proyecto Civilización (procedural) | CC0 | Equipo interno | — | `8cfa3d5612b58a06df2ac61f755a1991ca958b3c494caa7ea50162a31ad321dd` |
| `assets/tiles/grass.svg` | Proyecto Civilización (procedural) | CC0 | Equipo interno | — | `b523ef1230cbecb9120bf94db9ebd112a029e88f485cefc0e3ef4868b9197a76` |
| `assets/tiles/forest.svg` | Proyecto Civilización (procedural) | CC0 | Equipo interno | — | `17dcafc7728b7828b9278daaee87dfa4849bb99be3ab1326de7cc7ec51e12c36` |
| `assets/tiles/mountain.svg` | Proyecto Civilización (procedural) | CC0 | Equipo interno | — | `cc91ccbcb0ca1edf3d64457f89da436630bfce67db7db4d70dbe0df0e58fbcfb` |
| `assets/tiles/sand.svg` | Proyecto Civilización (procedural) | CC0 | Equipo interno | — | `938f81623949d0fff4610eba564a461b984e08ad9fdc5dbe69f3b5813f23d075` |

## Licencias permitidas en v1 pública

- **CC0** (dominio público) — permitida sin restricciones.
- Cualquier otra licencia (CC-BY, CC-BY-SA, etc) requiere override
  explícito del Director humano con nota en commit.

## Cómo añadir un asset

1. Copia el fichero a `assets/<categoría>/<nombre>.<ext>`.
2. Calcula su SHA-256: `sha256sum assets/<path>` (Linux) o
   `shasum -a 256 assets/<path>` (macOS).
3. Añade una fila en la tabla de esta sección. Si la categoría no
   existe, crea nueva tabla con título `## <Categoría>`.
4. Ejecuta `pnpm lint:assets` — debe pasar verde.
5. Si es CC0 no-trivial (Kenney, OpenGameArt), añade URL de origen.

## Cómo reemplazar un asset

1. Sustituye el fichero.
2. Actualiza el hash SHA-256 en la fila correspondiente.
3. Si cambia el origen/licencia, actualiza también esos campos.
4. `pnpm lint:assets` debe pasar.

## Cómo borrar un asset

1. Borra el fichero.
2. Borra la fila de la tabla.
3. `pnpm lint:assets` debe pasar.

No se permiten filas "huérfanas" (fila sin fichero) ni ficheros
huérfanos (fichero sin fila). Ambos fallan el lint.

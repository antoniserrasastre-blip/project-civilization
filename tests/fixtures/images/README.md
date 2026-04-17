# Imágenes de prueba para el pixel-parser

Este directorio **no almacena binarios en git**. Las imágenes de prueba se generan localmente con ImageMagick y se consumen directamente desde la suite de tests.

> **Nota sobre el diseño actual:** la mayoría de tests unitarios del pixel-parser trabajan sobre buffers `Uint8ClampedArray` sintéticos creados por `tests/fixtures/test-image-generator.ts`. Esto evita dependencias de disco/canvas en Node. Las imágenes reales aquí documentadas sirven para:
> - Tests E2E (Playwright) que necesitan un PNG real para subir al `<input type="file">`.
> - Pruebas manuales / sanity checks antes de un commit.
> - Reproducir bugs reportados por usuarios con un asset canónico.

## Requisitos en Ubuntu

```bash
sudo apt install imagemagick
```

## Generar los assets canónicos

Ejecuta este bloque desde la raíz del proyecto. Cada comando crea un PNG con una paleta conocida para que el resultado del parser sea verificable a ojo.

```bash
cd tests/fixtures/images

# 1. Océano puro (azul sólido) — todo el grid debe ser `water`.
convert -size 500x500 xc:"#0000FF" ocean-500.png

# 2. Llanura pura (verde sólido) — todo `plain`.
convert -size 500x500 xc:"#00FF00" plain-500.png

# 3. Montaña pura (gris neutro) — todo `mountain`.
convert -size 500x500 xc:"#808080" mountain-500.png

# 4. Glaciar puro (blanco) — todo `glacier`.
convert -size 500x500 xc:"#FFFFFF" glacier-500.png

# 5. Tablero tierra/mar (franjas verticales) — 50% `plain`, 50% `water`.
convert -size 500x500 gradient:"#0000FF-#00FF00" land-sea-gradient.png

# 6. Imagen más pequeña que el grid (10×10) para probar upsampling.
convert -size 10x10 xc:"#0000FF" ocean-tiny.png

# 7. Imagen enorme (2000×2000) para probar el SLA de <100ms.
convert -size 2000x2000 xc:"#00FF00" plain-huge.png

# 8. PNG con transparencia (alfa=0 en los bordes, relleno azul).
convert -size 500x500 xc:none -fill "#0000FF" -draw "rectangle 100,100 400,400" transparent.png

# 9. Paleta fuera de PLAN.md (magenta puro) — debe clasificarse como `unknown`.
convert -size 500x500 xc:"#FF00FF" off-palette.png
```

## Verificar los archivos

```bash
ls -la *.png
file *.png
```

## Limpieza

```bash
rm -f *.png
```

## Gitignore

Añade esto a `.gitignore` (si no está ya) para evitar que los binarios contaminen el repo:

```
tests/fixtures/images/*.png
!tests/fixtures/images/README.md
```

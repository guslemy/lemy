// Convierte el área de recorte que entrega react-easy-crop (en píxeles de
// la imagen original) en un archivo JPEG cuadrado ya recortado — esto es
// lo que de verdad se sube, nunca la foto original completa. Solo se usa
// desde un componente cliente (usa document/Image/canvas).

export type PixelCrop = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer esa imagen."));
    img.src = src;
  });
}

// 640px es de sobra para un avatar circular que nunca se muestra a más de
// ~150px en el sitio — mantiene el archivo final ligero sin perder nitidez.
const OUTPUT_SIZE = 640;

export async function cropImageToFile(
  src: string,
  area: PixelCrop,
  fileName = "foto.jpg"
): Promise<File> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no puede procesar el recorte de la imagen.");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen recortada."))),
      "image/jpeg",
      0.9
    );
  });

  return new File([blob], fileName, { type: "image/jpeg" });
}

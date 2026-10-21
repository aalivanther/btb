import type { JSX } from "react";

const GRAIN_NOISE_SVG_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function Background(): JSX.Element {
  return (
    <>
      <style>{`
        /* Contenedor fijo que cubre toda la ventana, detrás del contenido. */
        .organic-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        /* Grupo de blobs: se desborda a propósito (inset negativo) y se difumina
           fuerte para lograr nubes de color suaves. "screen" mezcla los colores
           sumando luz, como en el cascarón v3. */
        .organic-background .blob-field {
          position: absolute;
          inset: -20%;
          filter: blur(80px) saturate(1.5);
          opacity: 0.6;
        }

        /* Cada blob es un círculo de gradiente que se mueve en bucle, alternando
           ida y vuelta, con la curva de movimiento de marca. */
        .organic-background .blob {
          position: absolute;
          border-radius: 50%;
          mix-blend-mode: screen;
          animation: organic-drift 26s cubic-bezier(0.22, 0.61, 0.36, 1) infinite
            alternate;
        }

        /* Posiciones, tamaños y color de cada uno de los cuatro blobs.
           Los desfases (animation-delay negativos) hacen que no se muevan todos
           a la vez, dando una sensación más natural. */
        .organic-background .blob-1 {
          width: 60vw;
          height: 60vw;
          left: -10%;
          top: -15%;
          background: radial-gradient(circle, #ff2e88, transparent 65%);
        }
        .organic-background .blob-2 {
          width: 55vw;
          height: 55vw;
          right: -15%;
          top: 5%;
          background: radial-gradient(circle, #b14bff, transparent 65%);
          animation-delay: -6s;
        }
        .organic-background .blob-3 {
          width: 50vw;
          height: 50vw;
          left: 15%;
          bottom: -25%;
          background: radial-gradient(circle, #1fe0d6, transparent 65%);
          animation-delay: -12s;
        }
        .organic-background .blob-4 {
          width: 40vw;
          height: 40vw;
          right: 5%;
          bottom: -10%;
          background: radial-gradient(circle, #ff7a18, transparent 70%);
          animation-delay: -18s;
        }

        /* Deriva: un desplazamiento y escalado mínimos para que los blobs
           "respiren" muy despacio sin distraer. */
        @keyframes organic-drift {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(4%, -3%) scale(1.12);
          }
        }

        /* Capa de grano: el ruido SVG repetido, casi invisible (opacidad baja),
           que añade textura sobre los blobs. */
        .organic-background .grain {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: ${GRAIN_NOISE_SVG_DATA_URI};
        }

        /* Viñeta: oscurece progresivamente de arriba hacia los bordes para
           enfocar la atención en el contenido. */
        .organic-background .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            120% 90% at 50% 0%,
            transparent 45%,
            rgba(16, 11, 28, 0.72) 100%
          );
        }

        /* Accesibilidad: si la persona pidió menos movimiento, congelamos los
           blobs (sin animación). El fondo conserva su color y composición. */
        @media (prefers-reduced-motion: reduce) {
          .organic-background .blob {
            animation: none;
          }
        }
      `}</style>

      <div className="organic-background" aria-hidden="true">
        <div className="blob-field">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
        </div>
        <div className="grain" />
        <div className="vignette" />
      </div>
    </>
  );
}

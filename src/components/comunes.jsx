import React, { useLayoutEffect, useRef, useState } from "react";

// Monograma con el sello que gira, igual que en la tarjeta de presentación.
export function Sello({ texto = "Nairobi Montilla · Corredora de seguros · " }) {
  return (
    <div className="sello" aria-hidden="true">
      <img src="/branding/monograma.png" alt="" />
      <svg viewBox="0 0 100 100">
        <defs><path id="sello-arco" d="M50,50 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0" /></defs>
        <text><textPath href="#sello-arco" textLength="257">{texto}</textPath></text>
      </svg>
    </div>
  );
}

// Selector segmentado con la ficha blanca que se desliza a la opción elegida.
export function Segmento({ opciones, valor, onCambio, etiqueta }) {
  const ref = useRef(null);
  const [ficha, setFicha] = useState(null);
  useLayoutEffect(() => {
    const b = ref.current?.querySelector('[aria-pressed="true"]');
    if (b) setFicha({ left: b.offsetLeft, width: b.offsetWidth });
  }, [valor, opciones.length]);
  return (
    <div className="segmento" ref={ref} role="group" aria-label={etiqueta}>
      {ficha && <span className="ficha" style={ficha} />}
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={valor === o.id} onClick={() => onCambio(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Interruptor({ activo, onCambio, children, detalle }) {
  return (
    <button type="button" role="switch" aria-checked={activo} className="interruptor" onClick={() => onCambio(!activo)}>
      <span className="pista" />
      <span>{children}{detalle && <small>{detalle}</small>}</span>
    </button>
  );
}

export function Inicial({ nombre }) {
  return <span className="inicial" aria-hidden="true">{(String(nombre || "?").trim()[0] || "?").toUpperCase()}</span>;
}

export function Vacio({ icono: Icono, titulo, children }) {
  return (
    <div className="vacio">
      {Icono && <Icono size={34} strokeWidth={1.5} />}
      <h3>{titulo}</h3>
      <p>{children}</p>
    </div>
  );
}

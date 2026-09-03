// Contenido del manual de usuario integrado (sección "Ayuda" del panel).
// Ver docs/MANUAL_USUARIO_indice.md para el índice completo y el criterio de
// cada sección. Este archivo es SOLO datos -- lo consume AyudaPage en
// NairobiOS.jsx, que no necesita tocarse para editar texto.
//
// Forma de cada sección: { id, title, blocks }
// Forma de cada block:
//   { type: "p", text: "..." }                         -- párrafo simple
//   { type: "list", items: ["...", "..."] }             -- lista con viñetas
//   { type: "image", src: "/help/archivo.png", alt: "..." } -- captura (opcional, se omite si no hay src)
//
// El "id" de cada sección debe coincidir con el id correspondiente en NAV
// (NairobiOS.jsx) cuando aplica, para que en el futuro se pueda enlazar
// directo "Ayuda de esta pantalla" desde cada página real.

export const HELP_SECTIONS = [
  {
    id: "intro",
    title: "Introducción",
    blocks: [
      { type: "p", text: "Nairobi OS es el panel donde ves y controlas todo lo que hace Nai (el asistente de WhatsApp) con tus clientes. Cada conversación, cotización, póliza, siniestro y cobro que pasa por WhatsApp queda reflejado acá." },
      { type: "p", text: "Para entrar: usá el usuario y contraseña que te dieron. Si algún día no entrás, avisale a Sebastián en vez de intentar recuperarla vos misma." },
      { type: "p", text: "Una idea que vas a ver repetida en varias secciones: el interruptor \"Automatizado / Manual\" en cada conversación." },
      { type: "list", items: [
        "Automatizado: Nai le contesta sola al cliente en esa conversación.",
        "Manual: Nai se queda callada en esa conversación y contestás vos. Nai no vuelve a meterse ahí hasta que lo pongas en Automatizado de nuevo, o hasta que pase un rato prudencial sin que uses el manual.",
        "Usalo cada vez que quieras hablar vos misma con un cliente sin que Nai se cruce en el medio, por ejemplo en una negociación especial o una queja delicada.",
      ] },
    ],
  },
  {
    id: "inicio",
    title: "Inicio",
    blocks: [
      { type: "p", text: "Es la primera pantalla que ves al entrar: un resumen rápido de lo que necesita tu atención hoy, para no tener que revisar sección por sección." },
      { type: "p", text: "Ahí pueden aparecer alertas de distinto tipo:" },
      { type: "list", items: [
        "Siniestros nuevos que un cliente reportó y todavía nadie revisó.",
        "Cobranzas vencidas (clientes que debían pagar y no pagaron).",
        "Documentos o cotizaciones que quedaron \"pendiente manual\" — Nai no pudo resolverlos sola y necesitan que los mires vos.",
      ] },
      { type: "p", text: "Si Inicio está vacío o sin alertas, no significa que no haya actividad — significa que no hay nada urgente pendiente de tu parte en este momento." },
      { type: "image", src: "/help/inicio.png", alt: "Pantalla de Inicio de Nairobi OS" },
    ],
  },
  {
    id: "clientes",
    title: "Clientes",
    blocks: [
      { type: "p", text: "Acá aparece cualquier contacto de WhatsApp que ya tiene o tuvo una póliza con Nairobi — es decir, un cliente real, no cualquiera que haya escrito." },
      { type: "p", text: "Podés buscar por nombre o teléfono, y ver sus datos básicos: nombre, teléfono, correo y estado." },
      { type: "p", text: "El botón \"Añadir\" sirve para cargar un cliente a mano cuando lo necesitás vos (por ejemplo, alguien que te compró en persona y todavía no escribió por WhatsApp). Si el cliente ya escribió por WhatsApp, normalmente no hace falta cargarlo a mano — el sistema lo crea solo la primera vez que conversan." },
      { type: "image", src: "/help/clientes.png", alt: "Pantalla de Clientes de Nairobi OS" },
    ],
  },
  {
    id: "cotizaciones",
    title: "Cotizaciones",
    blocks: [
      { type: "p", text: "Una cotización aparece acá cuando un cliente le pidió un precio a Nai por WhatsApp y Nai comparó las aseguradoras disponibles para ese seguro." },
      { type: "p", text: "Punto clave, para que quede clarísimo: Nai NUNCA le manda un precio ni una recomendación al cliente por su cuenta. Siempre arma la comparación, te la deja lista acá, y sos vos quien decide qué mandarle." },
      { type: "p", text: "Por qué es así: el precio más bajo no siempre es la mejor opción para el cliente. Ejemplo real: una aseguradora puede costar 50$ más que otra, pero cubrir 50.000$ en vez de 10.000$ — eso solo lo evalúa una persona, no un algoritmo que solo mira el número más chico." },
      { type: "p", text: "Cómo se usa: entrá a la cotización, vas a ver todas las opciones de aseguradoras lado a lado (precio y cobertura de cada una). Elegí la fila que te parezca mejor para ese cliente y tocá \"Elegir esta y enviar\" — eso es lo único que hace falta para que el cliente reciba esa opción por WhatsApp. Ninguna otra opción de la lista se le manda." },
      { type: "image", src: "/help/cotizaciones.png", alt: "Comparador de cotizaciones de Nairobi OS" },
    ],
  },
  {
    id: "polizas",
    title: "Pólizas",
    blocks: [
      { type: "p", text: "Una póliza es una venta ya cerrada: el cliente aceptó una cotización y tiene un seguro activo, con número de póliza y fecha de inicio/fin de vigencia." },
      { type: "p", text: "El botón \"Añadir\" sirve para cargar una venta que se cerró fuera del flujo automático de WhatsApp — por ejemplo, una renovación que gestionaste vos directamente con la aseguradora." },
      { type: "p", text: "Estados que vas a ver:" },
      { type: "list", items: [
        "Activa: la póliza está vigente ahora mismo.",
        "Próximo: todavía no empezó a regir (fecha de inicio futura).",
        "Por Vencer: se acerca la fecha de fin de vigencia — es un buen momento para contactar al cliente por la renovación.",
        "Vencido: la póliza ya no está vigente.",
      ] },
      { type: "image", src: "/help/polizas.png", alt: "Pantalla de Pólizas de Nairobi OS" },
    ],
  },
  {
    id: "siniestros",
    title: "Siniestros",
    blocks: [
      { type: "p", text: "Un siniestro es cuando un cliente reporta algo que le pasó a lo asegurado: un choque, un robo, un incendio, etc." },
      { type: "p", text: "La mayoría llegan solos: el cliente se lo cuenta a Nai por WhatsApp y Nai lo registra acá. También podés cargar uno a mano si te enterás por otra vía (una llamada, por ejemplo)." },
      { type: "p", text: "Estados que vas a ver:" },
      { type: "list", items: [
        "Nuevo: recién reportado, nadie lo revisó todavía.",
        "Documentación Pendiente: falta que el cliente mande algún documento (fotos, recaudos).",
        "En Proceso / En Revisión: ya está siendo tramitado con la aseguradora.",
        "Resuelto: el caso se cerró (aprobado, pagado, o cerrado por la aseguradora).",
        "Escalado: quedó rechazado o necesita atención especial tuya.",
      ] },
      { type: "p", text: "Severidad: va de \"unknown\" (todavía no se sabe) hasta \"fatal\" — sirve para priorizar qué revisar primero. Un siniestro severo debería mirarse antes que uno menor." },
      { type: "image", src: "/help/siniestros.png", alt: "Pantalla de Siniestros de Nairobi OS" },
    ],
  },
  {
    id: "cobranzas",
    title: "Cobranzas",
    blocks: [
      { type: "p", text: "Acá se ven los pagos de las pólizas y los recordatorios que Nai les manda a los clientes cuando se acerca o se pasa la fecha de pago." },
      { type: "p", text: "Estados que vas a ver:" },
      { type: "list", items: [
        "Próximo: el pago todavía no vence.",
        "Activo: el pago está al día / se cobró.",
        "Vencido: el cliente debía pagar y no pagó — vale la pena seguirlo de cerca.",
        "Resuelto: se dispensó ese cobro (por ejemplo, un ajuste que decidiste vos).",
      ] },
      { type: "image", src: "/help/cobranzas.png", alt: "Pantalla de Cobranzas de Nairobi OS" },
    ],
  },
  {
    id: "citas",
    title: "Citas",
    blocks: [
      { type: "p", text: "Una cita es una reunión agendada con un cliente — por ejemplo, para revisar opciones de cotización en persona o por llamada, en vez de por WhatsApp." },
      { type: "p", text: "Se agenda cargando el teléfono del cliente (tiene que existir en Clientes), un título y el motivo. El cliente recibe la confirmación por WhatsApp." },
      { type: "p", text: "Estados: Nuevo (agendada), Activo (confirmada), Resuelto (ya se hizo), Vencido (se canceló o el cliente no llegó)." },
      { type: "image", src: "/help/citas.png", alt: "Pantalla de Citas de Nairobi OS" },
    ],
  },
  {
    id: "mensajes",
    title: "Mensajes",
    blocks: [
      { type: "p", text: "Es la vista de todas las conversaciones de WhatsApp que pasan por Nai — tanto las que Nai contesta sola como las que están en manos tuyas." },
      { type: "p", text: "Acá es donde más vas a usar el interruptor Automatizado/Manual explicado en la Introducción:" },
      { type: "list", items: [
        "Ponelo en Manual apenas quieras hablar vos misma con ese cliente sin que Nai conteste en paralelo.",
        "Mientras está en Manual, podés escribirle directo al cliente desde el propio panel — el mensaje sale como si lo mandara Nairobi.",
        "También queda en Manual automáticamente por un rato después de que le respondas al cliente directo desde tu WhatsApp personal (no solo desde el panel) — así Nai nunca se cruza justo después de que vos ya contestaste.",
        "Volvé a ponerlo en Automatizado cuando quieras que Nai retome esa conversación.",
      ] },
      { type: "image", src: "/help/mensajes.png", alt: "Centro de Mensajes de Nairobi OS" },
    ],
  },
  {
    id: "aseguradoras",
    title: "Aseguradoras",
    blocks: [
      { type: "p", text: "Acá se ven las compañías de seguros con las que Nairobi trabaja, y los productos que ofrece cada una." },
      { type: "p", text: "Esta sección no se edita a mano en el día a día: los datos de tarifas y disponibilidad se actualizan solos, sincronizados directo con los portales de cada aseguradora. Si ves algo que parece desactualizado, avisale a Sebastián en vez de intentar corregirlo acá." },
      { type: "image", src: "/help/aseguradoras.png", alt: "Pantalla de Aseguradoras de Nairobi OS" },
    ],
  },
  {
    id: "comisiones",
    title: "Comisiones",
    blocks: [
      { type: "p", text: "Una comisión es lo que te paga cada aseguradora por cada póliza que se vendió a través de Nairobi." },
      { type: "p", text: "Estados que vas a ver:" },
      { type: "list", items: [
        "En Proceso: se generó la comisión (accrued), todavía no se facturó a la aseguradora.",
        "Próximo: ya se facturó a la aseguradora (invoiced), está próxima a cobrarse.",
        "Activo: ya se cobró.",
        "Vencido: se canceló (por ejemplo, si la póliza que la generó se canceló).",
      ] },
      { type: "image", src: "/help/comisiones.png", alt: "Pantalla de Comisiones de Nairobi OS" },
    ],
  },
  {
    id: "reportes",
    title: "Reportes",
    blocks: [
      { type: "p", text: "Es la sección para mirar el negocio de un vistazo: cuántas pólizas se vendieron, cuánto se cobró, cómo viene el mes." },
      { type: "p", text: "No es una sección para operar (no se cargan ni editan datos acá) — es solo para entender números, no para hacer cambios." },
      { type: "image", src: "/help/reportes.png", alt: "Pantalla de Reportes de Nairobi OS" },
    ],
  },
  {
    id: "configuracion",
    title: "Configuración",
    blocks: [
      { type: "p", text: "Acá se configuran cosas técnicas del sistema: la conexión de WhatsApp y el calendario de Google que usan las Citas." },
      { type: "p", text: "Tocalo con cuidado — no es una sección de uso diario. Si no estás segura de qué hace un campo, mejor preguntale a Sebastián antes de cambiarlo." },
      { type: "image", src: "/help/configuracion.png", alt: "Pantalla de Configuración de Nairobi OS" },
    ],
  },
];

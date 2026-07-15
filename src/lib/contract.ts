// Contrato marco de ETHOS GYM que el cliente debe firmar antes de usar la app.
// Si cambias el texto, sube CONTRACT_VERSION para que se vuelva a pedir la firma.
export const CONTRACT_VERSION = '2025-01'

export const CONTRACT_TITLE =
  'CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS ONLINE, CESIÓN DE DERECHOS DE IMAGEN Y AUTORIZACIÓN DE PAGOS RECURRENTES'

export interface ContractSection {
  h: string
  p: string[]
}

export const CONTRACT_SECTIONS: ContractSection[] = [
  {
    h: 'Preámbulo',
    p: [
      'De una parte, Ethos GYM, nombre comercial titularidad de Luis Silva Marzal, con DNI 45128243N, con domicilio en Carrer Catalunya 16, 08840 Viladecans (Barcelona) y correo electrónico info@ethosfitness.es, dedicado, entre otras actividades, a la prestación de servicios de asesoramiento deportivo y nutricional online, entrenamiento personalizado a distancia y seguimiento telemático del rendimiento físico y la salud, en adelante «Ethos GYM».',
      'De otra parte, el Cliente, cuyos datos personales constan en la ficha de inscripción o formulario asociado al presente contrato, quien declara ser mayor de edad y disponer de plena capacidad legal para contratar.',
      'Ambas partes, en adelante «las Partes», manifiestan su voluntad de regular mediante el presente documento la relación contractual derivada de la contratación de los servicios online ofrecidos por Ethos GYM, quedando sometidas a las siguientes condiciones.',
    ],
  },
  {
    h: '1. Objeto del contrato',
    p: [
      'El presente contrato tiene por objeto regular la prestación de los servicios de coaching y asesoramiento online ofrecidos por Ethos GYM, que comprenden, con el alcance propio del plan contratado: entrevista y evaluación inicial del Cliente; plan de entrenamiento personalizado; plan nutricional personalizado; seguimiento individualizado 1 a 1 a través de los canales telemáticos habilitados; y videollamadas o llamadas de seguimiento cuando el plan las incluya.',
      'Asimismo, el contrato regula la captación y utilización de la imagen del Cliente, así como la autorización para la domiciliación y cobro recurrente de los importes contratados a través de la plataforma de pago Stripe, en los términos previstos en el presente documento.',
      'El Cliente acepta que las condiciones específicas aplicables dependerán del plan contratado en cada momento, sin perjuicio de que las disposiciones generales de este contrato resulten aplicables a todos los servicios online prestados por Ethos GYM.',
    ],
  },
  {
    h: '2. Duración del contrato',
    p: [
      'La duración vendrá determinada por el plan contratado: Plan Trimestral (3 meses), Plan Semestral (6 meses) y Plan Anual (12 meses, a los que Ethos GYM añade 2 meses adicionales sin coste, resultando 14 meses de acompañamiento).',
      'Salvo indicación expresa en contrario, los planes no se renovarán de forma automática: a su finalización, la continuidad del servicio requerirá la contratación de un nuevo plan. En caso de pactarse renovación automática, el Cliente podrá evitarla comunicándolo por escrito con al menos quince (15) días de antelación.',
    ],
  },
  {
    h: '3. Servicios y tarifas',
    p: [
      'En caso de tener un plan previo contratado, las variaciones de precio no afectarán a dicho plan durante su vigencia. Todos los precios se expresan en euros e incluyen los impuestos aplicables, salvo indicación en contrario.',
      'Planes: Trimestral (3 meses) 449,61 € + matrícula 39,90 €, pago único. Semestral (6 meses) 779,40 €, pago único o fraccionado en 6 cuotas de 129,90 € (matrícula en el primer cobro). Anual (12 + 2 meses) 1.299,90 €, matrícula gratuita, pago único o financiado hasta en 12 cuotas.',
      'La matrícula es un importe único que se abona junto con el primer pago del plan y da acceso al alta, la entrevista y la evaluación inicial. No es reembolsable salvo en el ejercicio del derecho de desistimiento (cláusula 10). Ethos GYM se reserva el derecho a modificar las tarifas para nuevas contrataciones, sin afectar a los planes ya en vigor.',
    ],
  },
  {
    h: '4. Condiciones económicas y forma de pago',
    p: [
      'El Cliente se compromete a abonar el precio del plan contratado según las tarifas vigentes. Los pagos se gestionarán a través de Stripe Payments Europe, Ltd., mediante tarjeta (con cobro recurrente en planes fraccionados o financiados), adeudo directo SEPA o cualquier otro método admitido por Stripe.',
      'Impago: en caso de impago o devolución de un cobro, el Cliente dispondrá de siete (7) días naturales para regularizar su situación. Transcurrido dicho plazo, Ethos GYM podrá suspender temporalmente el servicio hasta que la deuda quede saldada, sin que ello exima al Cliente de su obligación de pago. Los gastos de devolución podrán trasladarse al Cliente.',
    ],
  },
  {
    h: '5. Autorización de domiciliación y pagos recurrentes (Stripe · SEPA)',
    p: [
      'Mediante la firma del presente contrato, el Cliente autoriza de forma expresa, informada e inequívoca a Ethos GYM (Luis Silva Marzal) a iniciar, a través de Stripe, los cobros correspondientes al plan contratado, en las fechas e importes derivados de la modalidad elegida (pago único, fraccionado o financiado).',
      'Pagos con tarjeta: el Cliente autoriza el almacenamiento seguro de sus credenciales de pago por Stripe y los cargos recurrentes hasta la completa satisfacción del precio del plan. Ethos GYM no almacena los datos completos de la tarjeta.',
      'Adeudo SEPA: la firma del contrato junto con los datos bancarios constituye la orden de domiciliación (mandato SEPA). El Cliente autoriza a Ethos GYM a enviar instrucciones a su banco y a este a adeudar los importes. El Cliente puede solicitar el reembolso a su entidad en un plazo de ocho (8) semanas desde el adeudo. La autorización permanece vigente mientras subsistan obligaciones económicas del plan; el Cliente podrá revocar el mandato para cobros futuros escribiendo a info@ethosfitness.es, sin que ello le exima de los importes ya devengados.',
    ],
  },
  {
    h: '6. Obligaciones del Cliente',
    p: [
      'Facilitar información veraz, completa y actualizada sobre su estado de salud, historial de lesiones, patologías, alergias o medicación. Comunicar de forma inmediata cualquier cambio físico, lesión o molestia. Seguir las indicaciones de los profesionales, asumiendo que la ejecución de los ejercicios fuera de un entorno supervisado recae sobre el propio Cliente.',
      'Mantener una comunicación regular a través de los canales online. Reconocer que todos los planes, rutinas, documentos y materiales entregados son de uso estrictamente personal, sin reproducirlos ni compartirlos con terceros. Abonar puntualmente el precio del plan y mantener actualizados sus datos de pago.',
    ],
  },
  {
    h: '7. Obligaciones de Ethos GYM',
    p: [
      'Prestar los servicios con diligencia y profesionalidad; realizar la entrevista y evaluación inicial y elaborar los planes de entrenamiento y nutrición adaptados a la información facilitada; realizar el seguimiento 1 a 1 y las revisiones propias del plan; informar de los riesgos inherentes a la actividad física; y comunicar con antelación suficiente cualquier modificación relevante del servicio.',
    ],
  },
  {
    h: '8. Condiciones específicas del servicio online',
    p: [
      'La entrevista y evaluación inicial se realizará al inicio del plan por videollamada o formulario. Los planes se entregan y revisan de forma telemática con la periodicidad propia del plan. Las videollamadas de seguimiento, cuando estén incluidas, deberán agendarse previamente; las ausencias no justificadas con 24 horas de antelación podrán considerarse sesión realizada. El seguimiento se atiende dentro de horarios y plazos razonables; el servicio no implica disponibilidad inmediata o permanente. Queda prohibida la reproducción o distribución de los materiales entregados.',
    ],
  },
  {
    h: '9. Bajas temporales y congelación',
    p: [
      'Baja temporal por motivos médicos: solo con justificante o informe médico; pausa el cómputo de la duración del plan, con un máximo de seis (6) meses, ampliable con nuevo justificante. Congelación por motivos personales: duración mínima de un (1) mes y máximo de dos (2) congelaciones por año natural; pausa la duración del plan y reanuda el calendario de cobros conforme al periodo pausado. Las solicitudes se realizan por correo a info@ethosfitness.es con al menos siete (7) días de antelación al siguiente cobro.',
    ],
  },
  {
    h: '10. Desistimiento y resolución',
    p: [
      'Derecho de desistimiento: al ser un contrato a distancia, el Cliente puede desistir en 14 días naturales desde su formalización, sin justificación ni penalización, comunicándolo a info@ethosfitness.es. Si solicitó el inicio de la prestación durante ese plazo y luego desiste, abonará la parte proporcional del servicio prestado.',
      'Resolución anticipada por el Cliente: fuera del plazo de desistimiento, al tratarse de un plan cerrado, la baja anticipada no dará derecho a devolución, salvo pacto expreso; en planes fraccionados o financiados, el Cliente continuará obligado al pago de las cuotas pendientes. Resolución por Ethos GYM: por impago reiterado, incumplimiento grave, conducta que ponga en riesgo a terceros o falsedad sobre el estado de salud.',
    ],
  },
  {
    h: '11. Exención y limitación de responsabilidad',
    p: [
      'El Cliente reconoce que la práctica de actividad física conlleva riesgos inherentes. Al ser un servicio online no supervisado presencialmente, es responsable de ejecutar correctamente los ejercicios respetando sus límites y las indicaciones recibidas. Ethos GYM no será responsable de lesiones derivadas del incumplimiento de las indicaciones, la ocultación de información de salud o la ejecución incorrecta de los planes fuera de un entorno supervisado, salvo dolo o negligencia grave de Ethos GYM.',
    ],
  },
  {
    h: '12. Cesión de derechos de imagen',
    p: [
      'El Cliente autoriza a Ethos GYM a captar y utilizar su imagen (fotografías, vídeos, capturas de progreso o testimonios) con fines corporativos, promocionales, informativos o educativos, incluida su difusión en redes sociales y canales digitales oficiales. El Cliente podrá oponerse en cualquier momento escribiendo a info@ethosfitness.es. La oposición no afectará a la validez del contrato ni a la prestación del servicio.',
    ],
  },
  {
    h: '13. Propiedad intelectual',
    p: [
      'Todos los contenidos, metodologías, documentos, planes y materiales proporcionados por Ethos GYM son de su propiedad exclusiva y están protegidos por la legislación vigente. Queda prohibida su reproducción, modificación, distribución o comunicación pública no autorizada por escrito. El incumplimiento podrá dar lugar a la resolución inmediata del contrato y a las acciones legales correspondientes.',
    ],
  },
  {
    h: '14. Protección de datos',
    p: [
      'Conforme al RGPD (UE 2016/679) y la LOPDGDD (LO 3/2018): Responsable del tratamiento: Luis Silva Marzal, titular de Ethos GYM (info@ethosfitness.es). Finalidades: gestionar la relación contractual y prestar los servicios online; realizar el seguimiento deportivo y nutricional; gestionar facturación y cobros a través de Stripe; captar y usar la imagen; y, previo consentimiento, enviar comunicaciones comerciales.',
      'Base jurídica: ejecución del contrato, consentimiento y cumplimiento de obligaciones legales. Los datos de pago serán tratados por Stripe. Los datos de salud se tratan sobre la base del consentimiento explícito. El Cliente puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación, portabilidad y revocación en info@ethosfitness.es, y reclamar ante la AEPD (aepd.es).',
    ],
  },
  {
    h: '15. Comunicaciones, modificaciones y ley aplicable',
    p: [
      'Las comunicaciones se realizarán preferentemente por correo electrónico. Ethos GYM podrá modificar las condiciones para futuras contrataciones comunicándolo con 30 días de antelación; el Cliente podrá resolver sin penalización dentro de los 15 días siguientes. El contrato se rige por la legislación española y las Partes se someten a los Juzgados y Tribunales de Barcelona, sin perjuicio del fuero que corresponda al Cliente como consumidor.',
    ],
  },
  {
    h: '16. Disposiciones finales',
    p: [
      'Las cláusulas son independientes entre sí; la nulidad de alguna no afectará a la validez de las restantes. La tolerancia o falta de ejercicio de un derecho no supondrá renuncia al mismo. El presente contrato constituye el acuerdo íntegro entre las Partes, sustituyendo cualquier acuerdo o comunicación previa.',
    ],
  },
]

export const CONTRACT_ACCEPT_TEXT =
  'Declaro haber leído y comprendido el presente contrato, incluida de forma expresa la cláusula 5 de autorización de domiciliación y pagos recurrentes a través de Stripe, y lo acepto en su totalidad.'

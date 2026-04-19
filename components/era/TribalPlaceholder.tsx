/**
 * Placeholder de transición a la Edad Tribal — Sprint 6.4.
 *
 * Se muestra cuando state.era === 'tribal' y aún no existe el
 * contenido real tribal (post-primigenia). Texto partisano de
 * cierre + handoff visual.
 */

export function TribalPlaceholder() {
  return (
    <main
      data-testid="tribal-placeholder"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: '#f5f5dc',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: 24 }}>Edad Tribal</h1>
      <p style={{ maxWidth: 600, lineHeight: 1.6 }}>
        Los hijos de Tramuntana han dejado de ser nómadas. El monumento
        ancla al clan a un lugar; la fe es ahora una columna de piedra
        que se ve desde el mar. A partir de aquí, el mundo exterior se
        despierta — pero aún no es su turno.
      </p>
      <p style={{ marginTop: 32, opacity: 0.7 }}>
        Próxima versión: migrantes, rival, comercio, alianzas.
      </p>
    </main>
  );
}

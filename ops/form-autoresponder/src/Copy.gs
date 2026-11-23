/**
 * Copy.gs: every word a supporter reads, in both languages, as plain data.
 *
 * Copied from the two content specs (content-events.md, content-general.md, Nov 22 2026).
 * Markup inside strings:
 *   **bold**          bold text
 *   [text](url)       a link; in the plain-text email the text is kept and an own-domain
 *                     URL is added in brackets when the text is not already the link
 *   {name}            a merge field filled by Render.gs (values are escaped, never markup)
 * Change a sentence here, run `node ops/form-autoresponder/test/run.mjs`, look at the
 * previews, paste this file into the Apps Script project. Nothing else needs to change.
 * Rules: no emdashes, no new promises, links shown to people stay on sigchofor25.com.
 */

var COPY = {

  // ---------------------------------------------------------------- shared by all five
  common: {
    en: {
      greeting: 'Hi {first_name},',
      greeting_none: 'Hi there,',
      team: "Byron's campaign team",
      quote: '"It has never been about me. It has always been about we." Byron',
      paid_for: 'PAID FOR BY FRIENDS OF BYRON SIGCHO LOPEZ',
      state_board: "A copy of our report filed with the Illinois State Board of Elections is (or will be) available on the Board's official website (elections.il.gov) or for purchase from the State Board of Elections, Springfield, Illinois.",
      when: 'When',
      where: 'Where',
      directions: 'Directions',
      hosted_by: 'Hosted by {sponsor}',
      cal_google: 'Add to Google Calendar',
      cal_ics: 'Add to Apple or Outlook',
      slate_tag: 'Socialist Slate',
      wardnight_standing: 'Ward Night is every Tuesday at the ward office.',
      // OPTIONS.inviteReplies only
      plans_changed: 'Plans changed? Reply to this email and let us know.',
      not_you: 'Not you? Reply to this email and tell us.'
    },
    es: {
      greeting: '¡Hola, {first_name}!',
      greeting_none: '¡Hola!',
      team: 'El equipo de campaña de Byron',
      quote: '"Nunca ha sido sobre mí. Siempre ha sido sobre nosotros." Byron',
      paid_for: 'PAGADO POR FRIENDS OF BYRON SIGCHO LOPEZ',
      state_board: 'Una copia de nuestro informe presentado ante la Junta Electoral del Estado de Illinois está (o estará) disponible en el sitio web oficial de la Junta (elections.il.gov) o para compra en la Junta Electoral del Estado, Springfield, Illinois.',
      when: 'Cuándo',
      where: 'Dónde',
      directions: 'Cómo llegar',
      hosted_by: 'Organiza: {sponsor}',
      cal_google: 'Agregar a Google Calendar',
      cal_ics: 'Agregar a Apple u Outlook',
      slate_tag: 'Planilla Socialista',
      wardnight_standing: 'La Noche del Distrito es cada martes en la oficina del distrito.',
      plans_changed: '¿Cambiaron tus planes? Responde a este correo y avísanos.',
      not_you: '¿No fuiste tú? Responde a este correo y avísanos.'
    },
    lang_note: 'En español, más abajo.',
    divider: 'En español'
  },

  // ---------------------------------------------------------------- 1. event sign-up
  rsvp: {
    en: {
      signoff: 'See you there,',
      why: 'You got this email because you signed up for {event_title} at sigchofor25.com.',
      texting: 'Because you shared a phone number, you agreed to receive event reminders by text from Friends of Byron Sigcho Lopez. Message and data rates may apply. Text STOP to opt out.',
      plus_1: "That's you plus 1. Thank you for bringing someone.",
      plus_n: "That's you plus {guests}. Thank you for bringing people with you.",
      just_you: "It's just you.",
      confirm: "You're on the list: {event_title}, {event_day}, {event_time}. See you there.",
      also_heading: "**You're also on the list for:**",
      also_item: '{day_short}, {event_time}: {event_title}',
      roll_intro: "You're on a roll. One more way to show up:",
      bring_neighbor: '**Bring a neighbor.** Send them the sign-up: [sigchofor25.com/volunteer]({event_page})',
      donate: 'This campaign takes zero dollars from developers or corporate PACs. Chip in: [sigchofor25.com/donate](https://sigchofor25.com/donate)'
    },
    es: {
      signoff: 'Nos vemos,',
      why: 'Recibiste este correo porque te apuntaste a {event_title} en sigchofor25.com.',
      texting: 'Como compartiste tu número, aceptaste recibir recordatorios de eventos por mensaje de texto de Friends of Byron Sigcho Lopez. Pueden aplicar tarifas de mensajes y datos. Envía STOP para cancelar.',
      plus_1: 'Contamos contigo y con una persona más. Gracias por traer a alguien.',
      plus_n: 'Contamos contigo y con {guests} personas más. Gracias por traer a más gente.',
      just_you: 'Vienes tú solo o sola.',
      confirm: 'Ya estás en la lista: {event_title}, {event_day}, {event_time_phrase}. Nos vemos ahí.',
      also_heading: '**También estás en la lista para:**',
      also_item: '{day_short}, {event_time_phrase}: {event_title}',
      roll_intro: 'Vas con todo. Una manera más de participar:',
      bring_neighbor: '**Trae a un vecino o vecina.** Mándale el enlace para apuntarse: [sigchofor25.com/volunteer]({event_page})',
      donate: 'Esta campaña no recibe ni un dólar de desarrolladores ni de PAC corporativos. Aporta: [sigchofor25.com/donate](https://sigchofor25.com/donate)'
    },

    // 1A. Canvass
    '1A': {
      en: {
        subject: "You're in: Canvass for Byron, {day_short}",
        preheader: '{event_time} from {place}{address_sfx}.',
        headline: 'See you on the doors.',
        thanks: 'Thank you for knocking doors with us.',
        more_intro: 'More shifts coming up:'
      },
      es: {
        subject: 'Ya estás en la lista: Caminata, {day_short}',
        preheader: '{event_time_phrase_cap}, desde {place_art}{address_sfx}.',
        headline: 'Nos vemos tocando puertas.',
        thanks: 'Gracias por tocar puertas con nosotros.',
        more_intro: 'Más turnos que vienen:'
      },
      both_subject: "You're in: Canvass {day_short_en} | Caminata {day_short_es}"
    },

    // 1B. Ward Night
    '1B': {
      en: {
        subject: "You're in: Ward Night, {day_short}",
        preheader: '{event_time} at the {place}{address_sfx}.',
        headline: 'See you Tuesday.',
        more_intro: 'Want to do more this month? Knock doors with us:',
        secondary: '**Bring a neighbor.** Bring a neighbor who has a question too.'
      },
      es: {
        subject: 'Ya estás en la lista: Noche del Distrito, {day_short}',
        preheader: '{event_time_phrase_cap} en {place_art}{address_sfx}.',
        headline: 'Nos vemos el martes.',
        more_intro: '¿Quieres hacer más este mes? Toca puertas con nosotros:',
        secondary: '**Trae a un vecino o vecina.** Trae a alguien que también tenga una pregunta.'
      },
      both_subject: 'Ward Night {day_short_en} | Noche del Distrito {day_short_es}'
    },

    // 1C. Location to be announced (Town Hall)
    '1C': {
      en: {
        subject: "You're in: {event_title}, {day_short}",
        preheader: '{event_time}. The location will be announced.',
        headline: 'See you at the town hall.',
        know: 'The location will be announced. Check [sigchofor25.com/volunteer](https://sigchofor25.com/volunteer/) before you head out.',
        more_intro: 'Before then, knock doors with us:'
      },
      es: {
        subject: 'Ya estás: {short_title}, {day_short}',
        preheader: '{event_time_phrase_cap}. El lugar está por anunciarse.',
        headline: 'Nos vemos en la asamblea.',
        know: 'El lugar está por anunciarse. Revisa [sigchofor25.com/volunteer](https://sigchofor25.com/volunteer/) antes de salir.',
        more_intro: 'Antes de eso, toca puertas con nosotros:'
      },
      both_subject: '{short_title_en} {day_short_en} | {short_title_es} {day_short_es}'
    },

    // 1D. Other meetup with an address (CEDA today)
    '1D': {
      en: {
        subject: "You're in: {event_title}, {day_short}",
        preheader: '{event_time} at {address}.',
        headline: "You're on the list.",
        more_intro: 'More ways to show up:'
      },
      es: {
        subject: 'Ya estás: {event_title}, {day_short}',
        preheader: '{event_time_phrase_cap} en {address}.',
        headline: 'Ya estás en la lista.',
        more_intro: 'Más maneras de participar:'
      },
      both_subject: '{short_title_en} {day_short_en} | {short_title_es} {day_short_es}'
    },

    // 1E. Already over, or not in the feed
    '1E': {
      en: {
        subject: 'Thanks for signing up',
        preheader: 'Here is what is coming up next.',
        headline: 'Thank you for showing up.',
        confirm_over: 'Thanks for signing up for {event_title}. That date has passed, but there is more coming up.',
        confirm_notfound: 'Thanks for signing up for {label_title}. Here is what is coming up next.',
        more_intro: 'Pick your next shift:',
        secondary: '**See every shift on the map:** [sigchofor25.com/volunteer/#map](https://sigchofor25.com/volunteer/#map)'
      },
      es: {
        subject: 'Gracias por apuntarte',
        preheader: 'Esto es lo que viene.',
        headline: 'Gracias por sumarte.',
        confirm_over: 'Gracias por apuntarte a {event_title}. Esa fecha ya pasó, pero viene más.',
        confirm_notfound: 'Gracias por apuntarte. Esto es lo que viene.',
        more_intro: 'Escoge tu próximo turno:',
        secondary: '**Mira todos los turnos en el mapa:** [sigchofor25.com/volunteer/#map](https://sigchofor25.com/volunteer/#map)'
      },
      both_subject: 'Thanks for signing up | Gracias por apuntarte'
    },

    // 1F. Same event, new guest count (rest of the body is the matching variant)
    '1F': {
      en: {
        subject: 'Updated: {short_title}, {day_short}',
        preheader: 'We updated your sign-up.',
        confirm: 'We updated your sign-up for {event_title}, {event_day}. {plus}'
      },
      es: {
        subject: 'Actualizado: {short_title}, {day_short}',
        preheader: 'Actualizamos tu registro.',
        confirm: 'Actualizamos tu registro para {event_title}, {event_day}. {plus}'
      }
    },

    // Per-event wording the spec gives by name. Keyed by feed id.
    events: {
      'canvass-2026-12-05-phase-2-launch': {
        en: { subject: "You're in: Phase 2 Launch canvass, Sat Dec 5" },
        es: { subject: 'Ya estás: lanzamiento de la fase 2, sáb 5 dic' }
      },
      'meetup-2026-12-11-ward-town-hall': {
        en: { short_title: 'Town Hall' },
        es: { short_title: 'Asamblea del Distrito 25' },
        both_subject: 'Town Hall {day_short_en} | Asamblea {day_short_es}'
      },
      'meetup-2026-11-24-ceda-utility-bill-help': {
        en: {
          subject: "You're in: CEDA utility bill help, Tue Nov 24",
          short_title: 'Bill help',
          know: '**Bring with you:** Social Security numbers or ITINs for your household, proof of the last 30 days of income, and your most recent gas or electric bill.',
          secondary: '**Know someone who needs help with a bill?** Send them the sign-up: [sigchofor25.com/volunteer]({event_page})'
        },
        es: {
          subject: 'Ya estás: ayuda de CEDA con facturas, mar 24 nov',
          short_title: 'Ayuda con facturas',
          know: '**Trae contigo:** los números de Seguro Social o ITIN de tu hogar, comprobante de ingresos de los últimos 30 días y tu factura más reciente de gas o luz.',
          secondary: '**¿Conoces a alguien que necesite ayuda con una factura?** Mándale el enlace para apuntarse: [sigchofor25.com/volunteer]({event_page})'
        },
        both_subject: 'Bill help Tue Nov 24 | Ayuda con facturas 24 nov'
      }
    },

    // Short titles for subjects (1F and generic meetups), by kind.
    short_titles: {
      canvass: { en: 'Canvass', es: 'Caminata' },
      wardnight: { en: 'Ward Night', es: 'Noche del Distrito' }
    }
  },

  // ---------------------------------------------------------------- 2. Springfield Lobby Day
  lobbyday: {
    en: {
      signoff: 'See you there,',
      why: 'You got this email because you registered for Springfield Lobby Day at sigchofor25.com.',
      card_title: 'Springfield Lobby Day',
      u18: '**Under 18?** A parent or guardian will need to sign a permission form.',
      chip_yes: 'Thank you for offering to chip in toward the bus.',
      chip_no: 'No one will be turned away.',
      bring_someone: '**Bring someone.** Send them the link: [sigchofor25.com/lobbyday](https://sigchofor25.com/lobbyday/)',
      lobby_back: 'Back in Chicago, the work keeps going. Knock doors with us:'
    },
    es: {
      signoff: 'Nos vemos,',
      why: 'Recibiste este correo porque te registraste para el Día de Cabildeo en Springfield en sigchofor25.com.',
      card_title: 'Día de Cabildeo en Springfield',
      u18: '**¿Eres menor de 18 años?** Tu madre, padre o tutor deberá firmar un permiso.',
      chip_yes: 'Gracias por ofrecerte a aportar para el autobús.',
      chip_no: 'Nadie se quedará fuera por falta de dinero.',
      bring_someone: '**Trae a alguien.** Mándale el enlace: [sigchofor25.com/cabildeo](https://sigchofor25.com/cabildeo/)',
      lobby_back: 'De vuelta en Chicago, el trabajo sigue. Toca puertas con nosotros:'
    },
    '2A': {
      en: {
        subject: 'We got your registration: Springfield, Wed Dec 2',
        preheader: 'The bus leaves 2102 W Cermak Rd at 6:00 AM sharp.',
        headline: 'Get on the Bus.',
        confirm: 'We got your registration for Springfield Lobby Day, with your request for a seat on the bus.',
        card_when: 'Wednesday, December 2',
        card_when_sub: 'Bus leaves at 6:00 AM sharp.',
        card_place: '25th Ward IPO office',
        card_address: '2102 W Cermak Rd, Chicago',
        card_line: 'Back that evening.',
        know: '**At the State Capitol:** The veto session is on. We lobby lawmakers for fully funded schools for our students and young people.'
      },
      es: {
        subject: 'Recibimos tu registro: Springfield, mié 2 dic',
        preheader: 'El autobús sale de 2102 W Cermak Rd a las 6:00 AM en punto.',
        headline: 'Súbete al Autobús.',
        confirm: 'Recibimos tu registro para el Día de Cabildeo en Springfield, con tu solicitud de asiento en el autobús.',
        card_when: 'Miércoles 2 de diciembre',
        card_when_sub: 'El autobús sale a las 6:00 AM en punto.',
        card_place: 'Oficina del 25th Ward IPO',
        card_address: '2102 W Cermak Rd, Chicago',
        card_line: 'Regresamos esa noche.',
        know: '**En el Capitolio estatal:** Es la sesión de veto. Cabildeamos a los legisladores por escuelas plenamente financiadas para nuestros estudiantes y jóvenes.'
      },
      both_subject: 'Springfield Dec 2: registered | Registro recibido'
    },
    '2B': {
      en: {
        subject: 'We got your registration: Springfield, Wed Dec 2',
        preheader: 'See you at the State Capitol during the veto session.',
        headline: 'See you in Springfield.',
        confirm: "We got your registration for Springfield Lobby Day. You told us you'll get to Springfield on your own.",
        card_when: 'Wednesday, December 2',
        card_place: 'The State Capitol, Springfield, during the veto session',
        card_line: 'We lobby lawmakers for fully funded schools for our students and young people.',
        button: 'Bring someone',
        button_url: 'https://sigchofor25.com/lobbyday/',
        button_caption: 'Send them the link: [sigchofor25.com/lobbyday](https://sigchofor25.com/lobbyday/)'
      },
      es: {
        subject: 'Recibimos tu registro: Springfield, mié 2 dic',
        preheader: 'Nos vemos en el Capitolio estatal durante la sesión de veto.',
        headline: 'Nos vemos en Springfield.',
        confirm: 'Recibimos tu registro para el Día de Cabildeo en Springfield. Nos dijiste que llegarás a Springfield por tu cuenta.',
        card_when: 'Miércoles 2 de diciembre',
        card_place: 'El Capitolio estatal, Springfield, durante la sesión de veto',
        card_line: 'Cabildeamos a los legisladores por escuelas plenamente financiadas para nuestros estudiantes y jóvenes.',
        button: 'Trae a alguien',
        button_url: 'https://sigchofor25.com/cabildeo/',
        button_caption: 'Mándale el enlace: [sigchofor25.com/cabildeo](https://sigchofor25.com/cabildeo/)'
      },
      both_subject: 'Springfield Dec 2: registered | Registro recibido'
    },
    '2C': {
      en: {
        subject: 'Springfield Lobby Day: thanks for letting us know',
        preheader: 'Staying in Chicago? Knock doors with us.',
        headline: 'Staying in Chicago? Knock doors with us.',
        confirm: 'Thanks for letting us know. You asked us to keep you updated on Springfield Lobby Day, and we have that down.',
        button: 'Knock doors with us',
        button_url: 'https://sigchofor25.com/volunteer/#signup',
        more_intro: 'The next shifts in the ward:',
        secondary: '**Know someone who can ride?** Send them the link: [sigchofor25.com/lobbyday](https://sigchofor25.com/lobbyday/)',
        signoff: 'See you soon,'
      },
      es: {
        subject: 'Día de Cabildeo: gracias por avisarnos',
        preheader: '¿Te quedas en Chicago? Toca puertas con nosotros.',
        headline: '¿Te quedas en Chicago? Toca puertas con nosotros.',
        confirm: 'Gracias por avisarnos. Nos pediste que te mantengamos informado/a sobre el Día de Cabildeo en Springfield, y ya lo anotamos.',
        button: 'Toca puertas con nosotros',
        button_url: 'https://sigchofor25.com/volunteer/#signup',
        more_intro: 'Los próximos turnos en el distrito:',
        secondary: '**¿Conoces a alguien que pueda ir?** Mándale el enlace: [sigchofor25.com/cabildeo](https://sigchofor25.com/cabildeo/)',
        signoff: 'Nos vemos pronto,'
      },
      both_subject: 'Springfield Dec 2: thanks | Gracias por avisarnos'
    },
    '2D': {
      en: {
        subject: 'Thanks for registering',
        // The spec gives 2D no preheader; this is 1E's preheader, the parallel variant.
        preheader: 'Here is what is coming up next.',
        headline: 'Thank you for showing up.',
        confirm: 'Thanks for registering for Springfield Lobby Day. That date has passed, but the work keeps going here at home.',
        button: 'Knock doors with us',
        button_url: 'https://sigchofor25.com/volunteer/#signup',
        more_intro: 'Pick your next shift:'
      },
      es: {
        subject: 'Gracias por registrarte',
        preheader: 'Esto es lo que viene.',
        headline: 'Gracias por sumarte.',
        confirm: 'Gracias por registrarte para el Día de Cabildeo en Springfield. Esa fecha ya pasó, pero el trabajo sigue aquí en casa.',
        button: 'Toca puertas con nosotros',
        button_url: 'https://sigchofor25.com/volunteer/#signup',
        more_intro: 'Escoge tu próximo turno:'
      },
      both_subject: 'Thanks for registering | Gracias por registrarte'
    }
  },

  // ---------------------------------------------------------------- shared by the three general forms
  general: {
    en: {
      signoff: 'Solidarity,',
      told_intro: 'Here is what you told us:',
      shifts_intro: 'Your next shifts. Pick one and bring a neighbor:',
      shifts_empty: 'No dated shifts are posted right now. Every shift we add goes on the [Shift Map](https://sigchofor25.com/volunteer/#map).',
      button: 'Pick your first shift',
      button_url: 'https://sigchofor25.com/volunteer/#map',
      wardnight: 'Ward Night is every Tuesday at the ward office. Come by this week.',
      wardnight_next: ' Next one: {wardnight_next}.',
      bring: 'Bring a neighbor. Send them [sigchofor25.com/volunteer/#signup](https://sigchofor25.com/volunteer/#signup)',
      texting: 'When you signed up, you agreed to receive periodic campaign updates via SMS. Message and data rates may apply. Text STOP to unsubscribe.',
      and: ' and '
    },
    es: {
      signoff: '¡Solidaridad!',
      told_intro: 'Esto es lo que nos dijiste:',
      shifts_intro: 'Tus próximos turnos. Escoge uno y trae a un vecino:',
      shifts_empty: 'Por ahora no hay turnos con fecha. Cada turno que agregamos aparece en el [mapa de turnos](https://sigchofor25.com/volunteer/#map).',
      button: 'Escoge tu primer turno',
      button_url: 'https://sigchofor25.com/volunteer/#map',
      wardnight: 'La Noche del Distrito es cada martes en la oficina del distrito. Pásate esta semana.',
      wardnight_next: ' La próxima: {wardnight_next}.',
      bring: 'Trae a un vecino. Mándale [sigchofor25.com/volunteer/#signup](https://sigchofor25.com/volunteer/#signup)',
      texting: 'Al apuntarte, aceptaste recibir actualizaciones periódicas de la campaña por SMS. Pueden aplicar tarifas de mensajes y datos. Envía STOP para cancelar.',
      and: ' y '
    }
  },

  // ---------------------------------------------------------------- 3. volunteer sign-up (and /genz)
  volunteer: {
    en: {
      subject: "You're in. Here is what happens next.",
      preheader: 'Pick your first shift and come to Ward Night.',
      headline: "You're in.",
      confirm: 'Thank you for signing up to volunteer and re-elect Byron Sigcho-Lopez on February 23, 2027. The campaign will follow up to place you at your post. One hour or one hundred, there is a post for you.',
      also: 'You also told us: {list}. We have it all down.',
      why: 'You got this email because you signed up to volunteer at sigchofor25.com.'
    },
    es: {
      subject: 'Ya estás dentro. Esto es lo que sigue.',
      preheader: 'Escoge tu primer turno y ven a la Noche del Distrito.',
      headline: 'Ya estás dentro.',
      confirm: 'Gracias por apuntarte como voluntario/a para reelegir a Byron Sigcho-Lopez el 23 de febrero de 2027. La campaña te contactará para ubicarte en tu puesto. Una hora o cien, hay un puesto para ti.',
      also: 'También nos dijiste: {list}. Lo tenemos todo anotado.',
      why: 'Recibiste este correo porque te apuntaste como voluntario/a en sigchofor25.com.'
    },
    both_subject: "You're in | Ya estás dentro",
    // Blocks in priority order. "when" lists the exact form values that trigger a block.
    blocks: [
      {
        id: 'doors', when: ['Knock on Doors'],
        en: { title: 'knocking on doors', text: '**Knocking on doors.** This is how the ward campaign gets built: block by block, door by door, in Pilsen, Little Village, Heart of Chicago and the rest of the 25th Ward. Every dated canvass is on our [Shift Map](https://sigchofor25.com/volunteer/#map), with how far each one is from you.', with_shifts: ' Your next ones are below.' },
        es: { title: 'tocar puertas', text: '**Tocar puertas.** Así se construye la campaña del distrito: cuadra por cuadra, puerta por puerta, en Pilsen, La Villita, Heart of Chicago y el resto del Distrito 25. Todas las caminatas con fecha están en nuestro [mapa de turnos](https://sigchofor25.com/volunteer/#map), con la distancia a cada una desde donde estás.', with_shifts: ' Las próximas van abajo.' }
      },
      {
        id: 'captain', when: ['Precinct Captain / Volunteer'],
        en: { title: 'precinct captain', text: '**Precinct captain.** Precinct captains lead the ground game on their own blocks and coordinate the neighbors who volunteer there. The campaign will follow up with you about it. Until then, come knock doors with us.' },
        es: { title: 'capitán de precinto', text: '**Capitán de precinto.** Los capitanes de precinto lideran el esfuerzo en su propio vecindario y coordinan a los vecinos que se suman como voluntarios. La campaña te contactará sobre esto. Mientras tanto, ven a tocar puertas con nosotros.' }
      },
      {
        id: 'spanish', when: ['Bilingual Outreach (I speak Spanish / Yo hablo español)'],
        en: { title: 'Spanish', text: '**Spanish.** You told us you speak Spanish. We have it down for when the campaign places you.' },
        es: { title: 'español', text: '**Español.** Nos dijiste que hablas español. Lo tenemos anotado para cuando la campaña te ubique.' }
      },
      {
        id: 'students', when: ['High School Ambassador', 'College Campus Captain / Volunteer'],
        en: {
          title: 'students',
          text: '**Students.** High school ambassadors and college campus captains bring the next generation into this campaign. The campaign will follow up to place you.',
          lobby: ' On Wednesday, December 2, we take a bus to the State Capitol to lobby lawmakers for fully funded schools. The bus leaves the 25th Ward IPO, 2102 W Cermak Rd, at 6:00 AM sharp. Seats are limited: [sigchofor25.com/springfield](https://sigchofor25.com/springfield/)',
          lobby_u18: ' Under 18? A parent or guardian will need to sign a permission form.'
        },
        es: {
          title: 'estudiantes',
          text: '**Estudiantes.** Los embajadores de preparatoria y los capitanes de campus universitario suman a la próxima generación a esta campaña. La campaña te contactará para ubicarte.',
          lobby: ' El miércoles 2 de diciembre viajamos en autobús al Capitolio estatal para cabildear a los legisladores por escuelas plenamente financiadas. El autobús sale del 25th Ward IPO, 2102 W Cermak Rd, a las 6:00 AM en punto. Los asientos son limitados: [sigchofor25.com/cabildeo](https://sigchofor25.com/cabildeo/)',
          lobby_u18: ' ¿Eres menor de 18? Tu madre, padre o tutor deberá firmar un permiso.'
        }
      },
      {
        id: 'social', when: ['Post on Social Media'],
        en: { title: 'social media', text: '**Social media.** Checking Post on Social Media puts you on our rapid response team. Every share puts our posts in front of more neighbors. Follow us and share what we post: Instagram and Facebook [@bslfor25](https://www.instagram.com/bslfor25/), TikTok [@sigchofor25](https://www.tiktok.com/@sigchofor25), X [@ByronSigcho](https://x.com/ByronSigcho).' },
        es: { title: 'redes sociales', text: '**Redes sociales.** Al marcar Publicar en Redes Sociales, entras a nuestro equipo de respuesta rápida. Cada vez que compartes, nuestras publicaciones llegan a más vecinos. Síguenos y comparte lo que publicamos: Instagram y Facebook [@bslfor25](https://www.instagram.com/bslfor25/), TikTok [@sigchofor25](https://www.tiktok.com/@sigchofor25), X [@ByronSigcho](https://x.com/ByronSigcho).' }
      },
      {
        id: 'phones', when: ['Phone/Text Banking'],
        en: { title: 'phones and texts', text: '**Phones and texts.** Calls and texts reach voters where they are, and this is work you can do from anywhere. The campaign will follow up to place you.' },
        es: { title: 'llamadas y mensajes', text: '**Llamadas y mensajes.** Las llamadas y los mensajes de texto llegan a los votantes donde están, y es un trabajo que puedes hacer desde cualquier lugar. La campaña te contactará para ubicarte.' }
      },
      {
        id: 'hosting', when: ['Host a Meet & Greet'],
        en: { title: 'hosting', text: '**Hosting.** You told us you would host a meet and greet. The campaign will follow up to place you at your post.' },
        es: { title: 'ser anfitrión', text: '**Ser anfitrión.** Nos dijiste que organizarías un encuentro. La campaña te contactará para ubicarte en tu puesto.' }
      },
      {
        id: 'design', when: ['Help Create Marketing Collateral (Graphic Design)', 'Help Create Campaign Videos (Videography / Video Editing)'],
        en: { title: 'design and video', text: '**Design and video.** You told us you make graphics or video. The campaign will follow up to place you at your post.' },
        es: { title: 'diseño y video', text: '**Diseño y video.** Nos dijiste que haces gráficos o videos. La campaña te contactará para ubicarte en tu puesto.' }
      },
      {
        id: 'petition', when: ['Collect Petition Signatures'], onlyAlone: true,
        en: { title: 'the petition', text: '**The petition.** Thousands of neighbors signed, and on October 26 we filed at 203 S. State. Thank you. Now the work is on the doors. Read it: [sigchofor25.com/news/2026-10-27-petitions-filed/](https://sigchofor25.com/news/2026-10-27-petitions-filed/)' },
        es: { title: 'la petición', text: '**La petición.** Miles de vecinos firmaron, y el 26 de octubre presentamos las peticiones en el 203 S. State. Gracias. Ahora el trabajo está en las puertas. Léelo aquí: [sigchofor25.com/news/2026-10-27-petitions-filed/](https://sigchofor25.com/news/2026-10-27-petitions-filed/)' }
      }
    ],
    cap: 3,
    canvassOnlyWhen: ['Knock on Doors', 'Precinct Captain / Volunteer'],
    studentsU18When: 'High School Ambassador'
  },

  // ---------------------------------------------------------------- 4. Knock Doors With Us modal
  petition: {
    en: {
      subject: "You're in. Knock doors with us.",
      headline: "You're in.",
      preheader_shift: 'Your first shift is on the Shift Map.',
      preheader_posted: 'Ward Night is every Tuesday. Come by this week.',
      confirm_shift: 'You asked for a shift: doors, Ward Night or phones. The campaign will follow up to place you at your post.',
      confirm_posted: 'Thank you for counting yourself in. We knock every door we can reach before February 23, 2027, and the campaign will follow up to place you at your post.',
      also: 'You also told us: {list}. We have it down.',
      why: 'You got this email because you left your information on the Knock Doors With Us form at sigchofor25.com.'
    },
    es: {
      subject: 'Ya estás dentro. Toca puertas con nosotros.',
      headline: 'Ya estás dentro.',
      preheader_shift: 'Tu primer turno está en el mapa de turnos.',
      preheader_posted: 'La Noche del Distrito es cada martes. Pásate esta semana.',
      confirm_shift: 'Nos pediste un turno: puertas, Noche del Distrito o llamadas. La campaña te contactará para ubicarte en tu puesto.',
      confirm_posted: 'Gracias por sumarte. Tocamos cada puerta que podamos alcanzar antes del 23 de febrero de 2027, y la campaña te contactará para ubicarte en tu puesto.',
      also: 'También nos dijiste: {list}. Lo tenemos anotado.',
      why: 'Recibiste este correo porque dejaste tus datos en el formulario Toca Puertas con Nosotros de sigchofor25.com.'
    },
    both_subject: 'Knock doors with us | Toca puertas con nosotros',
    blocks: [
      {
        id: 'doors', when: ['Knocking on doors'],
        en: { title: 'talking to your neighbors', text: '**Talking to your neighbors.** That is the whole job at the door, and every dated canvass is on our [Shift Map](https://sigchofor25.com/volunteer/#map).', with_shifts: ' Your next ones are below.' },
        es: { title: 'hablar con tus vecinos', text: '**Hablar con tus vecinos.** Ese es todo el trabajo en la puerta, y todas las caminatas con fecha están en nuestro [mapa de turnos](https://sigchofor25.com/volunteer/#map).', with_shifts: ' Las próximas van abajo.' }
      },
      {
        id: 'events', when: ['Getting signatures at community events'],
        en: { title: 'community events and Ward Night', text: '**Community events and Ward Night.** Ward Night is every Tuesday at the ward office. Come by this week.', with_wardnight: ' Next one: {wardnight_next}.' },
        es: { title: 'eventos comunitarios y Noche del Distrito', text: '**Eventos comunitarios y Noche del Distrito.** La Noche del Distrito es cada martes en la oficina del distrito. Pásate esta semana.', with_wardnight: ' La próxima: {wardnight_next}.' }
      },
      {
        id: 'phones', when: ['Phone banking'],
        en: { title: 'phone banking', text: '**Phone banking.** Calls reach voters where they are, and this is work you can do from anywhere. The campaign will follow up to place you.' },
        es: { title: 'llamadas', text: '**Llamadas.** Las llamadas llegan a los votantes donde están, y es un trabajo que puedes hacer desde cualquier lugar. La campaña te contactará para ubicarte.' }
      },
      {
        id: 'social', when: ['Posting on social media'],
        en: { title: 'social media', text: '**Social media.** Every share puts our posts in front of more neighbors. Follow us and share what we post: Instagram and Facebook [@bslfor25](https://www.instagram.com/bslfor25/), TikTok [@sigchofor25](https://www.tiktok.com/@sigchofor25), X [@ByronSigcho](https://x.com/ByronSigcho).' },
        es: { title: 'redes sociales', text: '**Redes sociales.** Cada vez que compartes, nuestras publicaciones llegan a más vecinos. Síguenos y comparte lo que publicamos: Instagram y Facebook [@bslfor25](https://www.instagram.com/bslfor25/), TikTok [@sigchofor25](https://www.tiktok.com/@sigchofor25), X [@ByronSigcho](https://x.com/ByronSigcho).' }
      }
    ],
    cap: 2,
    canvassOnlyWhen: ['Knocking on doors']
  },

  // ---------------------------------------------------------------- 5. canvass team
  canvass: {
    en: {
      subject: "You're on the canvass team list",
      preheader_match: 'Your times, and the dated canvasses that fit them.',
      preheader_nomatch: 'Your times are in. Every shift is on the Shift Map.',
      headline: "You're on the canvass team list.",
      confirm: 'Thank you for joining the canvass team. The campaign will follow up with you.',
      told_intro: 'Here is when you told us you can knock doors:',
      no_times: 'You did not pick any times. When you know, tell us at [sigchofor25.com/canvass/](https://sigchofor25.com/canvass/)',
      host_yes: 'You would host a neighbor connection.',
      host_maybe: 'You want to hear more about hosting a neighbor connection. We have it down.',
      languages: 'Languages: {langs}',
      langs: { Spanish: 'Spanish', English: 'English', Both: 'Spanish and English' },
      matches_intro: 'Dated canvasses that fit your times:',
      no_matches: 'No dated canvass lines up with your times right now. Every shift we add goes on the [Shift Map](https://sigchofor25.com/volunteer/#map).',
      button: 'Find a shift near you',
      button_url: 'https://sigchofor25.com/volunteer/#map',
      bring: 'Bring a neighbor onto the team: [sigchofor25.com/canvass/](https://sigchofor25.com/canvass/)',
      signoff: 'Not me, we!',
      why: 'You got this email because you joined the canvass team at sigchofor25.com/canvass/.',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      all_times: 'all times',
      range: '{a} to {b}',
      other: '"{other}"',
      other_join: ' and '
    },
    es: {
      subject: 'Ya estás en la lista del equipo de puertas',
      preheader_match: 'Tus horarios y las caminatas con fecha que te quedan.',
      preheader_nomatch: 'Tus horarios ya están. Cada turno está en el mapa de turnos.',
      headline: 'Ya estás en la lista del equipo de puertas.',
      confirm: 'Gracias por sumarte al equipo de puertas. La campaña se pondrá en contacto contigo.',
      told_intro: 'Esto es cuándo nos dijiste que puedes tocar puertas:',
      no_times: 'No marcaste ningún horario. Cuando sepas, dinos en [sigchofor25.com/canvass/](https://sigchofor25.com/canvass/)',
      host_yes: 'Te ofreciste para ser anfitrión o anfitriona de una conexión entre vecinos.',
      host_maybe: 'Quieres saber más sobre ser anfitrión o anfitriona de una conexión entre vecinos. Lo tenemos anotado.',
      languages: 'Idiomas: {langs}',
      langs: { Spanish: 'español', English: 'inglés', Both: 'español e inglés' },
      matches_intro: 'Caminatas con fecha que te quedan:',
      no_matches: 'Por ahora ninguna caminata con fecha coincide con tus horarios. Cada turno que agregamos aparece en el [mapa de turnos](https://sigchofor25.com/volunteer/#map).',
      button: 'Encuentra un turno cerca de ti',
      button_url: 'https://sigchofor25.com/volunteer/#map',
      bring: 'Suma a un vecino al equipo: [sigchofor25.com/canvass/](https://sigchofor25.com/canvass/)',
      signoff: '¡No yo, nosotros!',
      why: 'Recibiste este correo porque te sumaste al equipo de puertas en sigchofor25.com/canvass/.',
      days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      all_times: 'todos los horarios',
      range: '{a} a {b}',
      other: '"{other}"',
      other_join: ' y '
    },
    both_subject: 'On the canvass team | En el equipo de puertas',
    // Range ends for the compact availability lines (the site's slot labels).
    hourLabel: { 8: '8 AM', 10: '10 AM', 12: '12 PM', 14: '2 PM', 16: '4 PM', 18: '6 PM', 20: '8 PM' },
    slotLabel: {
      en: ['8 to 10 AM', '10 AM to 12 PM', '12 to 2 PM', '2 to 4 PM', '4 to 6 PM', '6 to 8 PM'],
      es: ['8 a 10 AM', '10 AM a 12 PM', '12 a 2 PM', '2 a 4 PM', '4 a 6 PM', '6 a 8 PM']
    }
  }
};

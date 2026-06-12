import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.resolve(root, ".env") });

const RESET = process.argv.includes("--reset");

const {
  db,
  usersTable,
  schoolsTable,
  disciplinesTable,
  ticketsTable,
  messagesTable,
  ticketEventsTable,
} = await import("@workspace/db");

/** Sujets du pilote CO — « Groupes de besoin » réservé au français et aux mathématiques. */
const MOCK_THEMES: { disciplines?: string[]; descriptions: string[] }[] = [
  {
    descriptions: [
      "Comment concevoir une évaluation diagnostique en début de séquence pour repérer les acquis et les lacunes de ma classe ?",
      "Quels outils d'évaluation diagnostique utiliser pour ajuster ma progression sans alourdir la charge des élèves ?",
      "J'ai des résultats hétérogènes à mon évaluation diagnostique : comment en tirer des groupes de travail pertinents ?",
    ],
  },
  {
    descriptions: [
      "Besoin d'aide pour mettre en place un étayage pédagogique progressif sur une compétence que beaucoup d'élèves ne maîtrisent pas encore.",
      "Comment organiser le retrait progressif de l'étayage une fois que les élèves commencent à gagner en autonomie ?",
      "Quelles traces ou supports d'étayage prévoir pour accompagner les élèves en difficulté pendant un travail en autonomie ?",
    ],
  },
  {
    descriptions: [
      "Comment structurer ma séquence par paliers de complexité en m'appuyant sur la taxonomie de Bloom ?",
      "Je souhaite faire progresser mes élèves de la mémorisation vers l'analyse : par où commencer concrètement en classe ?",
      "Comment formuler des activités de niveau supérieur (synthèse, évaluation) sans perdre ceux qui restent au palier de compréhension ?",
    ],
  },
  {
    descriptions: [
      "Comment construire une évaluation sommative critériée alignée sur les attendus du pilote CO ?",
      "J'ai du mal à rédiger des critères de réussite lisibles pour mes élèves avant une évaluation sommative.",
      "Comment faire coévaluer les élèves à partir de la grille critériée sans que cela prenne trop de temps en séance ?",
    ],
  },
  {
    disciplines: ["Français", "Mathématiques"],
    descriptions: [
      "Comment organiser des groupes de besoin en français pour travailler la compréhension de l'écrit avec un petit groupe ?",
      "Je souhaite mettre en place des groupes de besoin en mathématiques sur le calcul mental : quelle fréquence et quels objectifs ?",
      "Comment articuler les groupes de besoin (français ou maths) avec le travail commun de la classe sans stigmatiser les élèves ?",
    ],
  },
  {
    descriptions: [
      "Comment mieux utiliser nos temps de concertation pour préparer une séquence à deux enseignants ?",
      "Nous envisageons du co-enseignement sur une classe : quelle organisation pour répartir les rôles en séance ?",
      "Comment coordonner notre progression quand nous co-animons le même groupe sur plusieurs séances ?",
    ],
  },
];

const TEACHER_MESSAGES = [
  "J'ai testé la piste proposée en évaluation diagnostique, les résultats sont encourageants.",
  "L'étayage mis en place fonctionne pour une partie de la classe, mais certains élèves restent en difficulté.",
  "Pour le palier suivant de la taxonomie de Bloom, auriez-vous un exemple d'activité concrète ?",
  "La grille critériée est plus claire pour moi ; je vais l'ajuster avec mes collègues avant la sommative.",
  "Les groupes de besoin tournent bien, je voudrais affiner les objectifs pour la prochaine séance.",
  "Notre temps de concertation a été productif, nous avons besoin d'un regard extérieur sur notre co-enseignement.",
];

const STAFF_MESSAGES = [
  "Pour l'évaluation diagnostique, je vous propose une tâche courte en trois niveaux de réussite pour repérer les profils.",
  "Côté étayage, commencez par une démonstration guidée puis un exercice à deux avant le travail individuel.",
  "Pour la progression par paliers, identifiez d'abord le niveau Bloom visé à chaque séance de votre séquence.",
  "Voici une trame de critères de réussite que vous pouvez adapter à votre évaluation sommative critériée.",
  "Pour les groupes de besoin, fixez un objectif unique et observable sur trois séances, puis réévaluez.",
  "En co-enseignement, répartissez explicitement qui anime, qui étaye et qui circule avant la séance.",
];

function descriptionsForDiscipline(disciplineName: string): string[] {
  return MOCK_THEMES.flatMap((theme) => {
    if (theme.disciplines && !theme.disciplines.includes(disciplineName)) return [];
    return theme.descriptions;
  });
}

function pickDescription(disciplineName: string, seed: number): string {
  const pool = descriptionsForDiscipline(disciplineName);
  return pool[seed % pool.length];
}

type MockTicket = {
  status: string;
  schoolId: number;
  disciplineId: number;
  f2Id?: number;
  f3Id?: number;
  daysAgo: number;
  pickupMinutes?: number;
  webex?: boolean;
};

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function buildTicketPlan(
  schools: { id: number }[],
  disciplines: { id: number }[],
): MockTicket[] {
  const plan: MockTicket[] = [];
  let day = 0;

  const statusWeights: { status: string; count: number; needsF2?: boolean; needsF3?: boolean; escalate?: boolean; webex?: boolean }[] = [
    { status: "new", count: 10 },
    { status: "assigned_n1", count: 8, needsF2: true },
    { status: "escalated", count: 12, needsF2: true, escalate: true },
    { status: "assigned_n2", count: 6, needsF2: true, needsF3: true, escalate: true },
    { status: "closed_n1", count: 28, needsF2: true },
    { status: "closed_resolved", count: 22, needsF2: true, needsF3: true, escalate: true },
    { status: "closed_webex", count: 14, needsF2: true, needsF3: true, escalate: true, webex: true },
  ];

  for (const { status, count, needsF2, needsF3, escalate, webex } of statusWeights) {
    for (let i = 0; i < count; i++) {
      const school = pick(schools, day + i);
      const discipline = pick(disciplines, day * 2 + i);
      plan.push({
        status,
        schoolId: school.id,
        disciplineId: discipline.id,
        daysAgo: day % 180,
        pickupMinutes: 15 + (i % 45),
        webex,
      });
      day += 2;
    }
  }

  return plan.sort((a, b) => b.daysAgo - a.daysAgo);
}

async function resetMockData() {
  console.log("Suppression des tickets existants…");
  await db.delete(messagesTable);
  await db.delete(ticketEventsTable);
  await db.delete(ticketsTable);
}

async function insertTicket(
  mock: MockTicket,
  passwordHash: string,
  f2Users: { id: number; schoolId: number | null }[],
  f3Users: { id: number }[],
  disciplineName: string,
) {
  const createdAt = daysAgo(mock.daysAgo, 9 + (mock.daysAgo % 6));
  const description = pickDescription(disciplineName, mock.schoolId + mock.disciplineId);

  const f2 = f2Users.find((u) => u.schoolId === mock.schoolId) ?? f2Users[0];
  const f3 = pick(f3Users, mock.disciplineId);
  const visioLink = "https://exemple.academie.fr/visio/reunion-kiosque";
  const visioScheduledAt = mock.webex ? addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 24 * 60) : null;
  const visioWhenLabel = visioScheduledAt
    ? visioScheduledAt.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const [ticket] = await db.insert(ticketsTable).values({
    passwordHash,
    schoolId: mock.schoolId,
    disciplineId: mock.disciplineId,
    description,
    status: mock.status,
    assignedN1Id: mock.status !== "new" ? f2?.id : null,
    assignedN2Id: ["assigned_n2", "closed_resolved", "closed_webex"].includes(mock.status) ? f3?.id : null,
    webexLink: mock.webex ? visioLink : null,
    webexScheduledAt: visioScheduledAt,
    webexCreatedAt: mock.webex ? addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 120) : null,
    createdAt,
    updatedAt: addMinutes(createdAt, mock.pickupMinutes ?? 60),
  }).returning();

  const events: {
    eventType: string;
    actorRole: string;
    actorId: number | null;
    oldStatus: string | null;
    newStatus: string;
    at: Date;
    metadata?: Record<string, unknown>;
  }[] = [
    {
      eventType: "ticket_created",
      actorRole: "teacher",
      actorId: null,
      oldStatus: null,
      newStatus: "new",
      at: createdAt,
    },
  ];

  if (mock.status !== "new") {
    const claimedAt = addMinutes(createdAt, mock.pickupMinutes ?? 30);
    events.push({
      eventType: "claimed_n1",
      actorRole: "f2",
      actorId: f2?.id ?? null,
      oldStatus: "new",
      newStatus: "assigned_n1",
      at: claimedAt,
    });

    if (["escalated", "assigned_n2", "closed_resolved", "closed_webex"].includes(mock.status)) {
      const escalatedAt = addMinutes(claimedAt, 45);
      events.push({
        eventType: "escalated",
        actorRole: "f2",
        actorId: f2?.id ?? null,
        oldStatus: "assigned_n1",
        newStatus: "escalated",
        at: escalatedAt,
      });
    }

    if (["assigned_n2", "closed_resolved", "closed_webex"].includes(mock.status)) {
      const claimedN2At = addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 90);
      events.push({
        eventType: "claimed_n2",
        actorRole: "f3",
        actorId: f3?.id ?? null,
        oldStatus: "escalated",
        newStatus: "assigned_n2",
        at: claimedN2At,
      });
    }

    if (mock.status === "closed_n1") {
      events.push({
        eventType: "resolved_n1",
        actorRole: "f2",
        actorId: f2?.id ?? null,
        oldStatus: "assigned_n1",
        newStatus: "closed_n1",
        at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 180),
      });
    }

    if (mock.status === "closed_resolved") {
      events.push({
        eventType: "resolved_n2",
        actorRole: "f3",
        actorId: f3?.id ?? null,
        oldStatus: "assigned_n2",
        newStatus: "closed_resolved",
        at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 240),
      });
    }

    if (mock.status === "closed_webex") {
      events.push({
        eventType: "webex_invitation",
        actorRole: "f3",
        actorId: f3?.id ?? null,
        oldStatus: "assigned_n2",
        newStatus: "closed_webex",
        at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 200),
        metadata: { webexLink: visioLink, scheduledAt: visioScheduledAt?.toISOString() },
      });
    }
  }

  for (const ev of events) {
    await db.insert(ticketEventsTable).values({
      ticketId: ticket.id,
      actorId: ev.actorId,
      actorRole: ev.actorRole,
      eventType: ev.eventType,
      oldStatus: ev.oldStatus,
      newStatus: ev.newStatus,
      metadata: ev.metadata ?? null,
      createdAt: ev.at,
    });
  }

  const msgs: { senderType: string; senderId: number | null; content: string; at: Date }[] = [
    {
      senderType: "teacher",
      senderId: null,
      content: description,
      at: createdAt,
    },
  ];

  if (mock.status !== "new") {
    msgs.push({
      senderType: "f2",
      senderId: f2?.id ?? null,
      content: pick(STAFF_MESSAGES, ticket.id),
      at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 10),
    });
    msgs.push({
      senderType: "teacher",
      senderId: null,
      content: pick(TEACHER_MESSAGES, ticket.id),
      at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 25),
    });
  }

  if (["assigned_n2", "closed_resolved", "closed_webex"].includes(mock.status)) {
    msgs.push({
      senderType: "f3",
      senderId: f3?.id ?? null,
      content: "Je prends le relais sur cette demande remontée.",
      at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 100),
    });
  }

  if (mock.webex) {
    msgs.push({
      senderType: "system",
      senderId: null,
      content: `Une session collective en visio a été programmée le ${visioWhenLabel}.\nLien : ${visioLink}`,
      at: addMinutes(createdAt, (mock.pickupMinutes ?? 30) + 200),
    });
  }

  for (const msg of msgs) {
    await db.insert(messagesTable).values({
      ticketId: ticket.id,
      senderId: msg.senderId,
      senderType: msg.senderType,
      content: msg.content,
      messageType: msg.senderType === "system" ? "webex" : "text",
      createdAt: msg.at,
    });
  }

  return ticket;
}

async function seedMock() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant — configurez le fichier .env");
    process.exit(1);
  }

  const schools = await db.select().from(schoolsTable).where(eq(schoolsTable.active, true));
  const disciplines = await db.select().from(disciplinesTable).where(eq(disciplinesTable.active, true));
  const f2Users = await db.select().from(usersTable).where(eq(usersTable.role, "f2"));
  const f3Users = await db.select().from(usersTable).where(eq(usersTable.role, "f3"));

  if (!schools.length || !disciplines.length) {
    console.error("Établissements ou disciplines manquants — lancez d'abord : pnpm --filter @workspace/scripts run seed");
    process.exit(1);
  }

  if (!f2Users.length || !f3Users.length) {
    console.error("Comptes F2/F3 manquants — lancez d'abord : pnpm --filter @workspace/scripts run seed:demo");
    process.exit(1);
  }

  if (RESET) {
    await resetMockData();
  } else {
    const existing = await db.select().from(ticketsTable);
    if (existing.length > 0) {
      console.log(`${existing.length} ticket(s) déjà en base. Utilisez --reset pour repartir de zéro.`);
      process.exit(0);
    }
  }

  console.log("Génération des données mock…");
  const passwordHash = await bcrypt.hash("MOCK-DEMO", 10);
  const disciplineById = new Map(disciplines.map((d) => [d.id, d.name]));
  const plan = buildTicketPlan(schools, disciplines);

  let count = 0;
  for (const mock of plan) {
    const disciplineName = disciplineById.get(mock.disciplineId) ?? "";
    await insertTicket(mock, passwordHash, f2Users, f3Users, disciplineName);
    count++;
    if (count % 20 === 0) console.log(`  … ${count}/${plan.length} tickets`);
  }

  console.log(`\nTerminé : ${count} tickets créés avec messages et événements.`);
  console.log("Connectez-vous avec les comptes démo (admin1234) pour explorer les tableaux de bord.");
}

seedMock().catch((err) => {
  console.error(err);
  process.exit(1);
});

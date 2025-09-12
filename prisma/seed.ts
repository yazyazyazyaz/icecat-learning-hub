// prisma/seed.ts
import { PrismaClient, Role, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1) Demo users
  const passwordPlain = "password123";
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const [admin, trainer, employee, viewer, yagiz] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        name: "Admin",
        role: Role.ADMIN,
        password: passwordHash,
        approved: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "trainer@example.com" },
      update: {},
      create: {
        email: "trainer@example.com",
        name: "Trainer",
        role: Role.TRAINER,
        password: passwordHash,
        approved: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "employee@example.com" },
      update: {},
      create: {
        email: "employee@example.com",
        name: "Employee",
        role: Role.EMPLOYEE,
        password: passwordHash,
        approved: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "viewer@example.com" },
      update: {},
      create: {
        email: "viewer@example.com",
        name: "Viewer",
        role: Role.VIEWER,
        password: passwordHash,
        approved: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "yagiz@icecat.com" },
      update: {},
      create: {
        email: "yagiz@icecat.com",
        name: "Yagiz",
        role: Role.ADMIN,
        password: await bcrypt.hash("00forhekset00", 10),
        approved: true,
      },
    }),
  ]);

  // 2) Onboarding training + modules + lessons + quiz
  await prisma.training.upsert({
    where: { slug: "onboarding" },
    update: {},
    create: {
      slug: "onboarding",
      title: "Icecat Onboarding",
      summary: "Welcome to Icecat. Learn the basics and policies.",
      isMandatory: true,
      durationMinutes: 30,
      tags: ["onboarding", "policies"],
      modules: {
        create: [
          {
            title: "Getting Started",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Company Introduction",
                  slug: "intro",
                  order: 1,
                },
                {
                  title: "Tools Overview",
                  slug: "tools",
                  order: 2,
                },
              ],
            },
          },
          {
            title: "Policies",
            order: 2,
            lessons: {
              create: [
                {
                  title: "Security & Compliance",
                  slug: "policies",
                  order: 1,
                },
              ],
            },
          },
        ],
      },
      quizzes: {
        create: [
          {
            title: "Onboarding Quiz",
            description: "Check your understanding",
            timeLimitSeconds: 600, // 10 minutes
            passThreshold: 70,
            questions: {
              create: [
                {
                  type: QuestionType.TRUEFALSE,
                  prompt: "Icecat values security and compliance.",
                  options: ["true", "false"],
                  correct: ["true"],
                  explanation: "Security is a core value.",
                  order: 1,
                },
                {
                  type: QuestionType.SINGLE,
                  prompt: "Which tool is used for code hosting?",
                  options: ["GitHub", "GitLab", "Bitbucket"],
                  correct: ["GitHub"],
                  order: 2,
                },
                {
                  type: QuestionType.MULTI,
                  prompt: "Select collaboration tools we use.",
                  options: ["Slack", "Email", "PagerDuty"],
                  correct: ["Slack", "Email"],
                  order: 3,
                },
                {
                  type: QuestionType.SHORT,
                  prompt: "Type our company name.",
                  options: [],
                  correct: ["icecat"],
                  order: 4,
                },
                {
                  type: QuestionType.SINGLE,
                  prompt: "Minimum passing score for mandatory quizzes?",
                  options: ["50", "60", "70"],
                  correct: ["70"],
                  order: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // 3) Give the employee a head start: mark "intro" as completed
  const intro = await prisma.lesson.findUnique({ where: { slug: "intro" } });
  if (intro) {
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: employee.id, lessonId: intro.id } },
      create: {
        userId: employee.id,
        lessonId: intro.id,
        isCompleted: true,
        completedAt: new Date(),
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  // 4) Add an Icecat FAQ quiz (single-choice, 4 options each)
  const faqQuizExists = await prisma.quiz.findFirst({ where: { title: "Icecat FAQ Basics" } })
  if (!faqQuizExists) {
    await prisma.quiz.create({
      data: {
        title: "Icecat FAQ Basics",
        description: "Key facts from the Icecat FAQ.",
        timeLimitSeconds: 0,
        passThreshold: 70,
        questions: {
          create: [
            {
              type: QuestionType.SINGLE,
              prompt: "What is Icecat primarily known for?",
              options: [
                "Product content syndication for e-commerce",
                "Payment processing services",
                "Courier and last-mile logistics",
                "CRM and sales pipeline management",
              ],
              correct: ["Product content syndication for e-commerce"],
              order: 1,
            },
            {
              type: QuestionType.SINGLE,
              prompt: "What is Open Icecat?",
              options: [
                "A free, open catalog of standardized product content",
                "A paid-only content tier",
                "Icecat's internal admin area",
                "A shipping-rate calculator",
              ],
              correct: ["A free, open catalog of standardized product content"],
              order: 2,
            },
            {
              type: QuestionType.SINGLE,
              prompt: "How can partners integrate Icecat product content?",
              options: [
                "Through APIs and data feeds (e.g., XML/JSON)",
                "Only by downloading PDFs",
                "Via faxed documents",
                "Printed paper catalogs",
              ],
              correct: ["Through APIs and data feeds (e.g., XML/JSON)"],
              order: 3,
            },
            {
              type: QuestionType.SINGLE,
              prompt: "What does PIM stand for in the FAQ context?",
              options: [
                "Product Information Management",
                "Product Inventory Manual",
                "Partner Integration Module",
                "Purchasing Invoice Management",
              ],
              correct: ["Product Information Management"],
              order: 4,
            },
            {
              type: QuestionType.SINGLE,
              prompt: "Who typically benefits from Icecat data?",
              options: [
                "Online retailers and distributors",
                "Personal travel bloggers",
                "Ride‑share drivers",
                "Airline ticketing agents",
              ],
              correct: ["Online retailers and distributors"],
              order: 5,
            },
            {
              type: QuestionType.SINGLE,
              prompt: "In Icecat terms, a product datasheet is…",
              options: [
                "A standardized product content record",
                "A software license key",
                "A warehouse pick list",
                "A tax receipt",
              ],
              correct: ["A standardized product content record"],
              order: 6,
            },
          ],
        },
      },
    })
  }

  console.log("✅ Seed complete: users, training, lessons, quiz, and sample progress.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

---
applyTo: "prisma/**/*.prisma,src/main/database/**/*.ts"
description: Instructions for Loop's database schema and operations
---

# Database Development Guidelines

You are working on Loop's data layer using Prisma ORM with SQLite. All data is stored locally for privacy and performance.

## Prisma Schema

The schema is located at `prisma/schema.prisma` and defines 17 models across 4 domains:
- **Core**: Project, Chapter, Scene, Character
- **Writing**: Note, Snippet, Timeline
- **AI**: AIConversation, AIMessage, AIContext
- **System**: Settings, UserPreference, Tag

## Schema Design Principles

Follow these principles when modifying the schema:

**1. Use explicit relations**
```prisma
model Project {
  id        String   @id @default(uuid())
  chapters  Chapter[]
}

model Chapter {
  id        String   @id @default(uuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**2. Always include timestamps**
```prisma
model Entity {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**3. Use appropriate indexes**
```prisma
model Entity {
  userId    String
  status    String
  createdAt DateTime
  
  @@index([userId, status])
  @@index([createdAt])
}
```

**4. Use soft deletes for important data**
```prisma
model Project {
  id        String    @id @default(uuid())
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

## Migration Guidelines

When making schema changes:

1. **Create descriptive migrations**
```bash
pnpm db:migrate -- --name add_project_metadata_fields
```

2. **Test migrations both ways**
- Apply migration: `pnpm db:migrate`
- Verify data integrity
- Test rollback if needed

3. **Handle data transformations**
For breaking changes, create a migration SQL file that:
- Backs up affected data
- Transforms data to new schema
- Validates transformation

4. **Never modify existing migrations**
Once applied, migrations are immutable. Create a new migration to fix issues.

## Database Operations

All database operations must:

**1. Use transactions for related operations**
```typescript
await prisma.$transaction(async (tx) => {
  const project = await tx.project.create({ data: projectData });
  await tx.chapter.createMany({ data: chaptersData });
  return project;
});
```

**2. Handle errors properly**
```typescript
try {
  await prisma.project.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new Error('Project with this name already exists');
    }
  }
  throw error;
}
```

**3. Use proper query patterns**

For single records:
```typescript
const project = await prisma.project.findUnique({
  where: { id },
  include: { chapters: true }
});
```

For lists with pagination:
```typescript
const projects = await prisma.project.findMany({
  where: { deletedAt: null },
  orderBy: { updatedAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20,
});
```

**4. Use select for specific fields**
```typescript
const projectNames = await prisma.project.findMany({
  select: { id: true, name: true },
  where: { deletedAt: null },
});
```

## Performance Optimization

**1. Use indexes for frequent queries**
```prisma
model Chapter {
  projectId String
  order     Int
  
  @@index([projectId, order])
}
```

**2. Avoid N+1 queries with include/select**
```typescript
// Bad: N+1 query
const projects = await prisma.project.findMany();
for (const project of projects) {
  const chapters = await prisma.chapter.findMany({ 
    where: { projectId: project.id } 
  });
}

// Good: Single query with include
const projects = await prisma.project.findMany({
  include: { chapters: true }
});
```

**3. Use connection pooling**
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});
```

**4. Monitor slow queries**
Log queries taking longer than 100ms for optimization.

## Data Validation

**1. Use Prisma's built-in validation**
```prisma
model Project {
  name        String  @db.VarChar(100)
  description String? @db.Text
  status      String  @default("active")
}
```

**2. Add application-level validation**
```typescript
const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived']),
});
```

## Seeding

Maintain seed data in `prisma/seed.ts`:
```typescript
async function main() {
  // Create default settings
  await prisma.settings.upsert({
    where: { key: 'theme' },
    update: {},
    create: { key: 'theme', value: 'dark' },
  });
}
```

## Backup and Recovery

Before major schema changes:
1. Create database backup
2. Test migration on backup copy
3. Verify data integrity
4. Have rollback plan ready

## Common Patterns

**Soft delete**
```typescript
async function deleteProject(id: string) {
  return await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

**Upsert (create or update)**
```typescript
await prisma.userPreference.upsert({
  where: { userId_key: { userId, key } },
  update: { value },
  create: { userId, key, value },
});
```

**Bulk operations**
```typescript
await prisma.tag.createMany({
  data: tags,
  skipDuplicates: true,
});
```

## AI Context Storage

When storing AI-related data:
- Store conversations with full context
- Track token usage for billing
- Maintain conversation history for context
- Index by projectId for quick retrieval

```prisma
model AIConversation {
  id        String      @id @default(uuid())
  projectId String?
  messages  AIMessage[]
  
  @@index([projectId])
}
```

## Testing

- Mock Prisma Client in tests
- Use in-memory SQLite for test database
- Reset database between tests
- Test constraint violations
- Verify cascade deletes work correctly
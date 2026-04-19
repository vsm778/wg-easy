import { defineCommand } from 'citty';
import { consola } from 'consola';
import { eq, sql } from 'drizzle-orm';

import { db, schema } from '../db';
import { hashPassword } from '../../server/utils/password';
import { roles } from '../../shared/utils/permissions';

export default defineCommand({
  meta: {
    name: 'db:admin:create',
    description: 'Create the initial admin user and advance setup to step 3',
  },
  args: {
    username: {
      type: 'string',
      description: 'Username for the initial admin user',
      required: true,
    },
    password: {
      type: 'string',
      description: 'Password for the initial admin user',
      required: true,
    },
  },
  async run(ctx) {
    const username = ctx.args.username?.trim();
    const password = ctx.args.password || undefined;

    if (!username) {
      consola.error('Username is required');
      return;
    }

    if (!password) {
      consola.error('Password is required');
      return;
    }

    if (password.length < 12) {
      consola.error('Password must be at least 12 characters long');
      return;
    }

    await db.transaction(async (tx) => {
      const userCountResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(schema.user)
        .get();

      const userCount = Number(userCountResult?.count ?? 0);
      if (userCount > 0) {
        throw new Error('Users already exist');
      }

      const general = await tx.select().from(schema.general).get();
      if (!general) {
        throw new Error('General config not found');
      }

      await tx.insert(schema.user).values({
        username,
        password: await hashPassword(password),
        email: null,
        name: 'Administrator',
        role: roles.ADMIN,
        totpKey: null,
        totpVerified: false,
        enabled: true,
      });

      await tx
        .update(schema.general)
        .set({
          setupStep: 3,
        })
        .where(eq(schema.general.id, 1));
    });

    consola.success(`Successfully created initial admin user ${username}`);
  },
});

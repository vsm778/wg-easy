import { ClientCreateSchema } from '#db/repositories/client/types';
import { createClientAndSave } from '../../services/clientProvisioning';

export default definePermissionEventHandler(
  'clients',
  'create',
  async ({ event }) => {
    const { name, expiresAt } = await readValidatedBody(
      event,
      validateZod(ClientCreateSchema, event)
    );

    const { clientId } = await createClientAndSave({ name, expiresAt });
    return { success: true, clientId };
  }
);

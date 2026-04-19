import type { ClientCreateType } from '#db/repositories/client/types';

export async function createClientAndSave(data: ClientCreateType) {
  const result = await Database.clients.create(data);
  await WireGuard.saveConfig();

  const clientId = result[0]!.clientId;
  return { clientId };
}

export async function createClientAndGenerateQr(data: ClientCreateType) {
  const { clientId } = await createClientAndSave(data);
  const qrSvg = await WireGuard.getClientQRCodeSVG({ clientId });

  return {
    clientId,
    qrSvg,
  };
}

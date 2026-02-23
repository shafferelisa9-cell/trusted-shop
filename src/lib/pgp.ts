import * as openpgp from 'openpgp';

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const { publicKey, privateKey } = await openpgp.generateKey({
    type: 'ecc',
    curve: 'curve25519',
    userIDs: [{ name: 'User', email: 'user@store.local' }],
    format: 'armored',
  });
  return { publicKey, privateKey };
}

export async function encryptMessage(text: string, publicKeyArmored: string): Promise<string> {
  const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text }),
    encryptionKeys: publicKey,
  });
  return encrypted as string;
}

export async function decryptMessage(ciphertext: string, privateKeyArmored: string): Promise<string> {
  try {
    const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });
    const message = await openpgp.readMessage({ armoredMessage: ciphertext });
    const { data } = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
    });
    return data as string;
  } catch {
    return '[unable to decrypt]';
  }
}

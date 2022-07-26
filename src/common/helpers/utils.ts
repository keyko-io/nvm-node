import { ForbiddenException } from '@nestjs/common';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import path from 'path';
import { AuthRoles } from '../type';
import crypto from 'crypto';
import { encrypt as ec_encrypt, decrypt as ec_decrypt} from 'eciesjs';
import NodeRSA from 'node-rsa';

export const checkOwnership = (userId: string, entityUserId: string, roles: AuthRoles[]) => {
  if (!roles.some((r) => r === AuthRoles.Admin) && userId !== entityUserId) {
    throw new ForbiddenException('This source only can be created or updated by the owner or admin');
  }
};

const get_aes_private_key = (passphrase: string) => {
    const salt = Buffer.from('this is a salt')
    const kdf = crypto.pbkdf2Sync(passphrase, salt, 48, 10000, 'sha256').toString('binary')
    const key = kdf.substring(0, 16)
    return Buffer.from(key, 'binary')
}

const BLOCK_SIZE = 16
const AES_BLOCK_SIZE = 16

function mod(a: number, n: number) {
  return a - (n * Math.floor(a/n));
}

const pad = (s:string) => {
  const md = BLOCK_SIZE - mod(s.length, BLOCK_SIZE)
  return s + String.fromCharCode(md).repeat(md)
}

const unpad = (s:string) => {
  const num = s.charCodeAt(s.length - 1)
  return s.substring(0, s.length - num)
}

const aes_encryption = (data, passphrase) => {
  const private_key = get_aes_private_key(passphrase)
  const iv = crypto.randomBytes(AES_BLOCK_SIZE)
  const cipher = crypto.createCipheriv('aes-128-cbc', private_key, iv)
  let res = cipher.update(pad(data), 'binary', 'binary')
  res += cipher.final('binary')
  return Buffer.from(iv.toString('binary') + res, 'binary').toString('base64')
}

const aes_decryption = (data64, passphrase) => {
  const private_key = get_aes_private_key(passphrase)
  const data = Buffer.from(data64, 'base64')
  const iv = data.slice(0, AES_BLOCK_SIZE)
  const cipher = crypto.createDecipheriv('aes-128-cbc', private_key, iv)
  let res = cipher.update(data.slice(AES_BLOCK_SIZE).toString('binary'), 'binary', 'binary')
  res += cipher.final('binary')
  return unpad(res)
}

export const encrypt = async (cipherText, method) => {
  if (method === 'PSK-ECDSA') {
    const provider_key_file = readFileSync(path.join(__dirname, '../../..', process.env['PROVIDER_KEYFILE'] || '')).toString()
    const provider_password = process.env['PROVIDER_PASSWORD'] || ''
    const wallet = await ethers.Wallet.fromEncryptedJson(provider_key_file, provider_password)
    let ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(wallet.privateKey.substring(2), 'hex'))
    const result = ec_encrypt(ecdh.getPublicKey(), Buffer.from(cipherText)).toString('binary')
    const res = {
      publicKey: wallet.publicKey,
      result
    }
    return res
  } else if (method === 'PSK-RSA') {
    const provider_key_file = readFileSync(path.join(__dirname, '../../../..', process.env['RSA_PUBKEY_FILE'] || '')).toString()
    const key = new NodeRSA(provider_key_file)
    const aes_key = crypto.randomBytes(16)
    const encrypted_data = aes_encryption(cipherText, aes_key)
    const encrypted_aes_key = key.encrypt(aes_key)
    return {
      publicKey: key.exportKey('public'),
      result: Buffer.from(encrypted_data).toString('hex') + '|' + Buffer.from(encrypted_aes_key).toString('hex'),
    }
  }
};

export const decrypt = async (cipherText, method) => {
  if (method === 'PSK-ECDSA') {
    const provider_key_file = readFileSync(path.join(__dirname, '../../..', process.env['PROVIDER_KEYFILE'] || '')).toString()
    const provider_password = process.env['PROVIDER_PASSWORD'] || ''
    const wallet = await ethers.Wallet.fromEncryptedJson(provider_key_file, provider_password)
    let ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(wallet.privateKey.substring(2), 'hex'))
    return ec_decrypt(ecdh.getPrivateKey(), Buffer.from(cipherText, 'binary')).toString()
  } else if (method === 'PSK-RSA') {
    const provider_key_file = readFileSync(path.join(__dirname, '../../../..', process.env['RSA_PRIVKEY_FILE'] || '')).toString()
    const key = new NodeRSA(provider_key_file)
    const [data, encrypted_aes_key] = cipherText.split('|')
    const aes_key = key.decrypt(Buffer.from(encrypted_aes_key, 'hex'))
    return aes_decryption(Buffer.from(data, 'hex').toString(), aes_key)
  }
};

/*
async function test() {
  const { result } = await encrypt('tervvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvfkvfmfdlkvmdlfkvmldfkmvldkfmvldkfmvldkfmvldkfmvlkdmfvlkdmflvkmdflvkmdlfkvmldfkvmldkmest', 'PSK-RSA')
  console.log(result)
  console.log(await decrypt(result, 'PSK-RSA'))
}

test()
*/
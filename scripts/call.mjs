import algosdk from 'algosdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const creator_mnemonic = process.env.DEPLOYER_MNEMONIC;
const algod_address = process.env.ALGOD_SERVER;
const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  algod_address,
  process.env.ALGOD_PORT,
);

const creator = algosdk.mnemonicToSecretKey(creator_mnemonic);
const signer = algosdk.makeBasicAccountTransactionSigner(creator);

const app_id = Number.parseInt(process.argv[2]);
const atc = new algosdk.AtomicTransactionComposer();
const abi = JSON.parse(
  fs.readFileSync(path.join(__dirname, process.argv[3]), 'utf8'),
);

const contract = new algosdk.ABIContract(abi);
const suggestedParams = await algodClient.getTransactionParams().do();

if (process.argv[4] === 'delete') {
  const txn = algosdk.makeApplicationDeleteTxn(
    creator.addr,
    suggestedParams,
    app_id,
  );
  await algodClient.sendRawTransaction(txn.signTxn(creator.sk)).do();
  await algosdk.waitForConfirmation(algodClient, txn.txID().toString(), 3);
  console.log(`App ${app_id} deleted successfully.`);
} else if (process.argv[4] === 'createQuadrants') {
  suggestedParams.flatFee = true;
  suggestedParams.fee = 3000;
  atc.addTransaction({txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: creator.addr,
    receiver: "EUFZGRGPSRVJDMCWZI5IYAUDPOJXQCDV7LFEE6ULNM746EYGXNEOWI7B3E",
    amount: 29389700,
    suggestedParams
  }), signer: algosdk.makeBasicAccountTransactionSigner(creator)});
  atc.addTransaction({
    txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: creator.addr,
      receiver: "EUFZGRGPSRVJDMCWZI5IYAUDPOJXQCDV7LFEE6ULNM746EYGXNEOWI7B3E",
      amount: 0,
      assetIndex: 1284444444,
      suggestedParams
    }), signer: algosdk.makeBasicAccountTransactionSigner(creator)
  })
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      atc.addMethodCall({
        appID: app_id,
        method: contract.getMethodByName('createQuadrant'),
        methodArgs: [i, j],
        boxes: [
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
          {
            name: Uint8Array.from([i, j]),
            appIndex: app_id,
          },
        ],
        sender: creator.addr,
        signer,
        suggestedParams,
      });
    }
  }

  atc.buildGroup();

  const result = await atc.execute(algodClient, 4);
} else {
  const methodArgs = process.argv.slice(5);

  atc.addMethodCall({
    appID: app_id,
    method: contract.getMethodByName(process.argv[4]),
    methodArgs: methodArgs,
    sender: creator.addr,
    signer,
    suggestedParams,
  });

  console.log(
    `Calling ${app_id} on ${process.env.NETWORK} - method "${
      process.argv[4]
    }" with ${
      methodArgs.length > 0 ? `arguments: ${methodArgs}` : 'no arguments.'
    }`,
  );

  const result = await atc.execute(algodClient, 4);

  console.log('Call successful.');
}

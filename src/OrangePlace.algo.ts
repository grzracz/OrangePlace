import { Contract } from '@algorandfoundation/tealscript';

export class OrangePlace extends Contract {
  ora = GlobalStateKey<AssetID>({ key: 'ora' });
  bonfire = GlobalStateKey<Address>({ key: 'bonfire' });
  minPayment = GlobalStateKey<uint64>({ key: 'cost' });
  quadrants = BoxMap<bytes, bytes>();

  @allow.bareCreate()
  createApplication(): void {
    this.ora.value = AssetID.fromUint64(1284444444);
    this.bonfire.value = addr(
      'BNFIREKGRXEHCFOEQLTX3PU5SUCMRKDU7WHNBGZA4SXPW42OAHZBP7BPHY',
    );
    this.minPayment.value = 1;
  }

  createQuadrant(x: uint64, y: uint64): void {
    if (!this.app.address.isOptedInToAsset(this.ora.value)) {
      sendAssetTransfer({
        assetAmount: 0,
        assetReceiver: this.app.address,
        xferAsset: this.ora.value,
        fee: 0,
      });
    }

    assert(x < 3);
    assert(y < 3);

    const key = extract3(itob(x), 7, 1) + extract3(itob(y), 7, 1);
    assert(!this.quadrants(key).exists);
    this.quadrants(key).create(90 * 90);
  }

  updatePixel(quadrant: bytes, x: uint64, y: uint64, color: uint64): void {
    assert(x < 90);
    assert(y < 90);
    assert(color < 256);
    assert(this.quadrants(quadrant).exists);
    assert(this.txn.fee == 0);
    assert(this.txn.groupIndex > 0);
    const payment = this.txnGroup[this.txn.groupIndex - 1];
    assert(payment.typeEnum == TransactionType.AssetTransfer);
    assert(payment.xferAsset == this.ora.value);
    assert(payment.assetAmount >= this.minPayment.value);
    assert(payment.assetReceiver == this.app.address);

    const index = y * 90 + x;
    this.quadrants(quadrant).splice(index, 1, extract3(itob(color), 7, 1));

    if (payment.assetAmount > this.minPayment.value) {
      sendAssetTransfer({
        assetAmount: payment.assetAmount - this.minPayment.value,
        assetReceiver: this.txn.sender,
        xferAsset: this.ora.value,
        fee: 0,
      });
    } else {
      sendAssetTransfer({
        assetAmount: this.app.address.assetBalance(this.ora.value),
        assetReceiver: this.bonfire.value,
        xferAsset: this.ora.value,
        fee: 0,
      });
    }

    this.minPayment.value += 1;
  }
}

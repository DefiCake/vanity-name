import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Counter } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { CounterFixture } from './fixtures/CounterFixture'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Counter', () => {
  let counter: Counter
  let alice: SignerWithAddress

  beforeEach(async () => {
    ;({ counter, alice } = await CounterFixture())
    counter = counter.connect(alice)
    const initialCount = await counter.getCount()

    expect(initialCount).to.eq(0)
    expect(counter.address).to.properAddress
  })

  describe('count up', async () => {
    it('should count up', async () => {
      await counter.countUp()
      let count = await counter.getCount()
      expect(count).to.eq(1)
    })
  })

  describe('count down', async () => {
    it('should count down', async () => {
      await counter.countUp()

      await counter.countDown()
      const count = await counter.getCount()
      expect(count).to.eq(0)
    })
  })
})

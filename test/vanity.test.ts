// TODO: fuzzify tests. Also setTimeNextBlock is not compatible with solidity-coverage, which is sad

import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Vanity } from '../typechain'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { VanityFixture } from './fixtures/VanityFixture'
import { solidityKeccak256 } from 'ethers/lib/utils'
import { ethers, timeAndMine } from 'hardhat'
import { REGISTRATION_SECONDS_PER_GWEI, RESERVATION_PERIOD } from '../utils/constants'
import { getCurrentBlockTime } from '../utils/getCurrentBlockTIme'
import { BigNumber } from 'ethers'

const { mine, increaseTime, setTimeNextBlock } = timeAndMine

chai.use(chaiAsPromised)
const { expect } = chai

const NAME = 'name'
const HASH = solidityKeccak256(['string'], [NAME])

const COMITTED_VALUE = BigNumber.from(10).pow(18) // One eth
const REGISTRATION_PERIOD = COMITTED_VALUE.mul(REGISTRATION_SECONDS_PER_GWEI).div(1e9)

describe('Vanity', () => {
  let vanity: Vanity
  let alice: SignerWithAddress, bob: SignerWithAddress, mallory: SignerWithAddress, deployer: SignerWithAddress

  beforeEach(async () => {
    ;({ vanity, deployer, alice, bob, mallory } = await VanityFixture())
    vanity = vanity.connect(alice)
  })

  describe('reserve()', () => {
    it('works', async () => {
      const currentTime = await getCurrentBlockTime(ethers.provider)
      await vanity.reserve(HASH)

      const { reservationTimestamp, owner } = await vanity.records(HASH)

      expect(reservationTimestamp).to.be.gte(currentTime + RESERVATION_PERIOD)
      expect(owner).to.be.equal(alice.address)
      expect(await vanity.ownerOf(NAME)).to.be.equal(ethers.constants.AddressZero)
    })

    it('can be reserved again once enough reservation passes', async () => {
      await vanity.reserve(HASH)
      await timeAndMine.increaseTime(RESERVATION_PERIOD + 1)

      const currentTime = await ethers.provider.getBlock('latest').then(({ timestamp }) => timestamp)
      await vanity.reserve(HASH)

      const { reservationTimestamp, owner } = await vanity.records(HASH)
      expect(reservationTimestamp).to.be.gte(currentTime + RESERVATION_PERIOD)
      expect(owner).to.be.equal(alice.address)
      expect(await vanity.ownerOf(NAME)).to.be.equal(ethers.constants.AddressZero)
    })

    it('cannot reserve twice', async () => {
      await vanity.reserve(HASH)
      await expect(vanity.connect(mallory).reserve(HASH)).to.be.revertedWith('Name already reserved')
    })

    it('cannot reserve a registered name', async () => {
      await vanity.reserve(HASH)
      await vanity.register(NAME, { value: COMITTED_VALUE })

      const errorMessage = 'Name already registered'
      await expect(vanity.connect(mallory).reserve(HASH)).to.be.revertedWith(errorMessage)
    })

    it('increases the available funds of the old owner if the name was reserved before', async () => {
      const oldOwner = alice
      await vanity.connect(oldOwner).reserve(HASH)
      await vanity.connect(oldOwner).register(NAME, { value: COMITTED_VALUE })

      await increaseTime(REGISTRATION_PERIOD.add(1).toNumber())
      await mine(1)

      const newOwner = bob
      const prevLockedBalance = await vanity.unlockedBalances(oldOwner.address)
      await vanity.connect(newOwner).reserve(HASH)
      const newLockedBalance = await vanity.unlockedBalances(oldOwner.address)

      expect(prevLockedBalance).to.be.equal(0)
      expect(newLockedBalance).to.be.equal(COMITTED_VALUE)
    })
  })

  describe('register()', () => {
    it('works', async () => {
      {
        const owner = alice
        await vanity.connect(owner).reserve(HASH)
        const currentTime = await getCurrentBlockTime(ethers.provider)
        await vanity.connect(owner).register(NAME, { value: COMITTED_VALUE })
        const { registrationTimestamp, owner: recordOwner } = await vanity.records(HASH)

        expect(registrationTimestamp).to.be.gte(REGISTRATION_PERIOD.add(currentTime))

        // Owner should be registered until second before
        await setTimeNextBlock(registrationTimestamp.sub(1).toNumber())
        await mine(1)

        expect(await vanity.ownerOf(NAME))
          .to.be.equal(recordOwner)
          .and.equal(owner.address)
      }

      // Name expires after registration period passes
      {
        await timeAndMine.increaseTime(1)
        await mine(1)
        expect(await vanity.ownerOf(NAME)).to.be.equal(ethers.constants.AddressZero)
      }

      // Name can be once more reserved and registered
      {
        const owner = bob
        await vanity.connect(owner).reserve(HASH)
        const currentTime = await getCurrentBlockTime(ethers.provider)
        await vanity.connect(owner).register(NAME, { value: COMITTED_VALUE })
        const { registrationTimestamp, owner: recordOwner } = await vanity.records(HASH)

        expect(registrationTimestamp).to.be.gte(REGISTRATION_PERIOD.add(currentTime))

        // Owner should be registered until second before
        await setTimeNextBlock(registrationTimestamp.sub(1).toNumber())
        await mine(1)

        expect(await vanity.ownerOf(NAME))
          .to.be.equal(recordOwner)
          .and.equal(owner.address)
      }
    })

    it('cannot register a reserved name by other address', async () => {
      await vanity.connect(alice).reserve(HASH)
      const errorMessage = 'Name not reserved by the calling address'
      await expect(vanity.connect(mallory).register(NAME, { value: COMITTED_VALUE })).to.be.revertedWith(errorMessage)
    })

    it('cannot register a unreserved name', async () => {
      const errorMessage = 'Name not reserved by the calling address'
      await expect(vanity.connect(mallory).register(NAME, { value: COMITTED_VALUE })).to.be.revertedWith(errorMessage)
    })

    it('cannot register a name twice', async () => {
      await vanity.reserve(HASH)
      await vanity.register(NAME, { value: COMITTED_VALUE })
      const errorMessage = 'Name cannot be registered twice'
      await expect(vanity.connect(alice).register(NAME, { value: COMITTED_VALUE })).to.be.revertedWith(errorMessage)
    })
  })

  describe('claimLockedBalance', () => {
    it('works', async () => {
      await vanity.connect(alice).reserve(HASH)
      await vanity.connect(alice).register(NAME, { value: COMITTED_VALUE })

      await increaseTime(REGISTRATION_PERIOD.add(1).toNumber())
      await mine(1)

      const prevLockedBalance = await vanity.unlockedBalances(alice.address)
      await vanity.connect(alice).claimLockedBalance(HASH)
      const newLockedBalance = await vanity.unlockedBalances(alice.address)

      const { owner } = await vanity.records(HASH)

      expect(prevLockedBalance).to.be.equal(0)
      expect(newLockedBalance).to.be.equal(COMITTED_VALUE)
      expect(owner).to.be.equal(ethers.constants.AddressZero)
    })

    it('rejects if registration has not expired', async () => {
      await vanity.connect(alice).reserve(HASH)
      await vanity.connect(alice).register(NAME, { value: COMITTED_VALUE })

      const { registrationTimestamp } = await vanity.records(HASH)

      await setTimeNextBlock(registrationTimestamp.sub(1).toNumber())

      const errorMessage = 'Registration is still on'
      await expect(vanity.connect(alice).claimLockedBalance(HASH)).to.be.revertedWith(errorMessage)
    })

    it('rejects if called by other address than owner of record', async () => {
      await vanity.connect(alice).reserve(HASH)
      await vanity.connect(alice).register(NAME, { value: COMITTED_VALUE })

      const { registrationTimestamp } = await vanity.records(HASH)

      await setTimeNextBlock(registrationTimestamp.add(1).toNumber())

      const errorMessage = 'Caller is not owner of this record'
      await expect(vanity.connect(mallory).claimLockedBalance(HASH)).to.be.revertedWith(errorMessage)
    })
  })

  describe('withdrawBalance()', () => {
    it('works') // TODO
  })

  describe('getConfig()', () => {
    it('works') // TODO
  })

  describe('collectFees()', async () => {
    it('works', async () => {
      await vanity.connect(deployer).setFeePerCharacter(1)

      await vanity.connect(alice).reserve(HASH)
      await vanity.connect(alice).register(NAME, { value: COMITTED_VALUE })

      const collectedFees = await vanity.collectedFees()
      expect(collectedFees).to.be.equal(NAME.length)

      await expect(() => vanity.connect(deployer).collectFees()).to.changeEtherBalance(deployer, NAME.length)
    })
  })
})

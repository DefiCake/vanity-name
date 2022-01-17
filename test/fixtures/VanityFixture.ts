import { deployments } from 'hardhat'
import { Vanity__factory } from '../../typechain'

export const VanityFixture = deployments.createFixture(
  async ({ getNamedAccounts, getUnnamedAccounts, deployments, ethers }) => {
    await deployments.fixture()

    const { deployer: deployerAddress } = await getNamedAccounts()
    const deployer = await ethers.getSigner(deployerAddress)

    const unnamedSigners = await getUnnamedAccounts().then((addresses) => addresses.map(ethers.getSigner))
    const [alice, bob, mallory] = await Promise.all(unnamedSigners)

    const vanity = Vanity__factory.connect((await deployments.get('Vanity')).address, ethers.provider)

    return { vanity, deployer, alice, bob, mallory }
  }
)
